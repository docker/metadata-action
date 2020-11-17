import * as handlebars from 'handlebars';
import * as moment from 'moment';
import * as semver from 'semver';
import {Inputs} from './context';
import {Context} from '@actions/github/lib/context';
import {ReposGetResponseData} from '@octokit/types';

export interface Version {
  main: string | undefined;
  partial: string[];
  latest: boolean;
}

export class Meta {
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
  }

  public version(): Version {
    const currentDate = this.date;
    const version: Version = {
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
      if (this.inputs.tagSemver.length > 0 && semver.valid(version.main)) {
        const sver = semver.parse(version.main, {
          includePrerelease: true
        });
        version.latest = !semver.prerelease(version.main);
        version.main = handlebars.compile(this.inputs.tagSemver[0])(sver);
        if (version.latest) {
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
          version.latest = this.inputs.tagMatchLatest;
        }
      } else {
        version.latest = this.inputs.tagMatchLatest;
      }
    } else if (/^refs\/heads\//.test(this.context.ref)) {
      version.main = this.context.ref.replace(/^refs\/heads\//g, '').replace(/\//g, '-');
      if (this.inputs.tagEdge && this.inputs.tagEdgeBranch === version.main) {
        version.main = 'edge';
      }
    } else if (/^refs\/pull\//.test(this.context.ref)) {
      version.main = `pr-${this.context.ref.replace(/^refs\/pull\//g, '').replace(/\/merge$/g, '')}`;
    }

    return version;
  }

  public tags(): Array<string> {
    const version: Version = this.version();
    if (!version.main) {
      return [];
    }

    let tags: Array<string> = [];
    for (const image of this.inputs.images) {
      tags.push(`${image}:${version.main}`);
      for (const partial of version.partial) {
        tags.push(`${image}:${partial}`);
      }
      if (version.latest) {
        tags.push(`${image}:latest`);
      }
      if (this.context.sha && this.inputs.tagSha) {
        tags.push(`${image}:sha-${this.context.sha.substr(0, 7)}`);
      }
    }
    return tags;
  }

  public labels(): Array<string> {
    return [
      `org.opencontainers.image.title=${this.repo.name || ''}`,
      `org.opencontainers.image.description=${this.repo.description || ''}`,
      `org.opencontainers.image.url=${this.repo.html_url || ''}`,
      `org.opencontainers.image.source=${this.repo.html_url || ''}`,
      `org.opencontainers.image.version=${this.version().main || ''}`,
      `org.opencontainers.image.created=${this.date.toISOString()}`,
      `org.opencontainers.image.revision=${this.context.sha || ''}`,
      `org.opencontainers.image.licenses=${this.repo.license?.spdx_id || ''}`
    ];
  }
}
