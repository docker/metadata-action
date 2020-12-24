import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';
import * as semver from 'semver';
import {Inputs, tmpDir} from './context';
import * as core from '@actions/core';
import {Context} from '@actions/github/lib/context';
import {ReposGetResponseData} from '@octokit/types';

export interface Version {
  main: string | undefined;
  partial: string[];
  latest: boolean;
}

export class Meta {
  public readonly version: Version;

  private readonly inputs: Inputs;
  private readonly context: Context;
  private readonly repo: ReposGetResponseData;
  private readonly date: Date;

  constructor(inputs: Inputs, context: Context, repo: ReposGetResponseData) {
    this.inputs = inputs;
    if (!this.inputs.tagEdgeBranch) {
      this.inputs.tagEdgeBranch = repo.default_branch;
    }
    this.context = context;
    this.repo = repo;
    this.date = new Date();
    this.version = this.getVersion();
  }

  private getVersion(): Version {
    const currentDate = this.date;
    let version: Version = {
      main: undefined,
      partial: [],
      latest: false
    };

    if (/schedule/.test(this.context.eventName)) {
      version.main = handlebars.compile(this.inputs.tagSchedule)({
        date: function (format) {
          return moment(currentDate).utc().format(format);
        }
      });
    } else if (/^refs\/tags\//.test(this.context.ref)) {
      version.main = this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
      if (this.inputs.tagSemver.length > 0 && !semver.valid(version.main)) {
        core.warning(`${version.main} is not a valid semver. More info: https://semver.org/`);
      }
      if (this.inputs.tagSemver.length > 0 && semver.valid(version.main)) {
        const sver = semver.parse(version.main, {
          includePrerelease: true
        });
        if (semver.prerelease(version.main)) {
          version.main = handlebars.compile('{{version}}')(sver);
        } else {
          version.latest = this.inputs.tagLatest;
          version.main = handlebars.compile(this.inputs.tagSemver[0])(sver);
          for (const semverTpl of this.inputs.tagSemver) {
            const partial = handlebars.compile(semverTpl)(sver);
            if (partial == version.main) {
              continue;
            }
            version.partial.push(partial);
          }
        }
      } else if (this.inputs.tagMatch) {
        let tagMatch;
        const isRegEx = this.inputs.tagMatch.match(/^\/(.+)\/(.*)$/);
        if (isRegEx) {
          tagMatch = version.main.match(new RegExp(isRegEx[1], isRegEx[2]));
        } else {
          tagMatch = version.main.match(this.inputs.tagMatch);
        }
        if (tagMatch) {
          version.main = tagMatch[this.inputs.tagMatchGroup];
          version.latest = this.inputs.tagLatest;
        }
      } else {
        version.latest = this.inputs.tagLatest;
      }
    } else if (/^refs\/heads\//.test(this.context.ref)) {
      version.main = this.context.ref.replace(/^refs\/heads\//g, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
      if (this.inputs.tagEdge && this.inputs.tagEdgeBranch === version.main) {
        version.main = 'edge';
      }
    } else if (/^refs\/pull\//.test(this.context.ref)) {
      version.main = `pr-${this.context.ref.replace(/^refs\/pull\//g, '').replace(/\/merge$/g, '')}`;
    }

    if (this.inputs.tagCustom.length > 0) {
      if (this.inputs.tagCustomOnly) {
        version = {
          main: this.inputs.tagCustom.shift(),
          partial: this.inputs.tagCustom,
          latest: false
        };
      } else {
        version.partial.push(...this.inputs.tagCustom);
      }
    }

    version.partial = version.partial.filter((item, index) => version.partial.indexOf(item) === index);
    return version;
  }

  public tags(): Array<string> {
    if (!this.version.main) {
      return [];
    }

    let tags: Array<string> = [];
    for (const image of this.inputs.images) {
      const imageLc = image.toLowerCase();
      tags.push(`${imageLc}:${this.version.main}`);
      for (const partial of this.version.partial) {
        tags.push(`${imageLc}:${partial}`);
      }
      if (this.version.latest) {
        tags.push(`${imageLc}:latest`);
      }
      if (this.context.sha && this.inputs.tagSha) {
        tags.push(`${imageLc}:sha-${this.context.sha.substr(0, 7)}`);
      }
    }
    return tags;
  }

  public labels(): Array<string> {
    let labels: Array<string> = [
      `org.opencontainers.image.title=${this.repo.name || ''}`,
      `org.opencontainers.image.description=${this.repo.description || ''}`,
      `org.opencontainers.image.url=${this.repo.html_url || ''}`,
      `org.opencontainers.image.source=${this.repo.html_url || ''}`,
      `org.opencontainers.image.version=${this.version.main || ''}`,
      `org.opencontainers.image.created=${this.date.toISOString()}`,
      `org.opencontainers.image.revision=${this.context.sha || ''}`,
      `org.opencontainers.image.licenses=${this.repo.license?.spdx_id || ''}`
    ];
    labels.push(...this.inputs.labelCustom);
    return labels;
  }

  public bakeFile(): string {
    let jsonLabels = {};
    for (let label of this.labels()) {
      const matches = label.match(/([^=]*)=(.*)/);
      if (!matches) {
        continue;
      }
      jsonLabels[matches[1]] = matches[2];
    }

    const bakeFile = path.join(tmpDir(), 'ghaction-docker-meta-bake.json').split(path.sep).join(path.posix.sep);
    fs.writeFileSync(
      bakeFile,
      JSON.stringify(
        {
          target: {
            'ghaction-docker-meta': {
              tags: this.tags(),
              labels: jsonLabels
            }
          }
        },
        null,
        2
      )
    );

    return bakeFile;
  }
}
