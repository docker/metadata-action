import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';
import * as semver from 'semver';
import {Inputs, tmpDir} from './context';
import * as tcl from './tag';
import * as fcl from './flavor';
import * as core from '@actions/core';
import {Context} from '@actions/github/lib/context';
import {ReposGetResponseData} from '@octokit/types';

export interface Version {
  main: string | undefined;
  partial: string[];
  latest: boolean | undefined;
}

export class Meta {
  public readonly version: Version;

  private readonly inputs: Inputs;
  private readonly context: Context;
  private readonly repo: ReposGetResponseData;
  private readonly tags: tcl.Tag[];
  private readonly flavor: fcl.Flavor;
  private readonly date: Date;

  constructor(inputs: Inputs, context: Context, repo: ReposGetResponseData) {
    this.inputs = inputs;
    this.context = context;
    this.repo = repo;
    this.tags = tcl.Transform(inputs.tags);
    this.flavor = fcl.Transform(inputs.flavor);
    this.date = new Date();
    this.version = this.getVersion();
  }

  private getVersion(): Version {
    let version: Version = {
      main: undefined,
      partial: [],
      latest: undefined
    };

    for (const tag of this.tags) {
      if (tag.attrs['enable'] == 'false') {
        continue;
      }
      switch (tag.type) {
        case tcl.Type.Schedule: {
          version = this.procSchedule(version, tag);
          break;
        }
        case tcl.Type.Semver: {
          version = this.procSemver(version, tag);
          break;
        }
        case tcl.Type.Match: {
          version = this.procMatch(version, tag);
          break;
        }
        case tcl.Type.Ref: {
          if (tag.attrs['event'] == tcl.RefEvent.Branch) {
            version = this.procRefBranch(version, tag);
          } else if (tag.attrs['event'] == tcl.RefEvent.Tag) {
            version = this.procRefTag(version, tag);
          } else if (tag.attrs['event'] == tcl.RefEvent.PR) {
            version = this.procRefPr(version, tag);
          }
          break;
        }
        case tcl.Type.Edge: {
          version = this.procEdge(version, tag);
          break;
        }
        case tcl.Type.Raw: {
          version = this.procRaw(version, tag);
          break;
        }
        case tcl.Type.Sha: {
          version = this.procSha(version, tag);
          break;
        }
      }
    }

    version.partial = version.partial.filter((item, index) => version.partial.indexOf(item) === index);
    if (version.latest == undefined) {
      version.latest = false;
    }

    return version;
  }

  private procSchedule(version: Version, tag: tcl.Tag): Version {
    if (!/schedule/.test(this.context.eventName)) {
      return version;
    }

    const currentDate = this.date;
    const vraw = handlebars.compile(tag.attrs['pattern'])({
      date: function (format) {
        return moment(currentDate).utc().format(format);
      }
    });

    if (version.main == undefined) {
      version.main = vraw;
    } else if (vraw !== version.main) {
      version.partial.push(vraw);
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true';
    }

    return version;
  }

  private procSemver(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/tags\//.test(this.context.ref) && tag.attrs['value'].length == 0) {
      return version;
    }

    let vraw: string;
    if (tag.attrs['value'].length > 0) {
      vraw = tag.attrs['value'];
    } else {
      vraw = this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
    }
    if (!semver.valid(vraw)) {
      core.warning(`${vraw} is not a valid semver. More info: https://semver.org/`);
      return version;
    }

    let latest: boolean = false;
    const sver = semver.parse(vraw, {
      includePrerelease: true
    });
    if (semver.prerelease(vraw)) {
      vraw = handlebars.compile('{{version}}')(sver);
      if (version.main == undefined) {
        version.main = vraw;
      } else if (vraw !== version.main) {
        version.partial.push(vraw);
      }
    } else {
      vraw = handlebars.compile(tag.attrs['pattern'])(sver);
      if (version.main == undefined) {
        version.main = vraw;
      } else if (vraw !== version.main) {
        version.partial.push(vraw);
      }
      latest = true;
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? latest : this.flavor.latest == 'true';
    }

    return version;
  }

  private procMatch(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/tags\//.test(this.context.ref) && tag.attrs['value'].length == 0) {
      return version;
    }

    let vraw: string;
    if (tag.attrs['value'].length > 0) {
      vraw = tag.attrs['value'];
    } else {
      vraw = this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
    }

    let latest: boolean = false;
    let tmatch;
    const isRegEx = tag.attrs['pattern'].match(/^\/(.+)\/(.*)$/);
    if (isRegEx) {
      tmatch = vraw.match(new RegExp(isRegEx[1], isRegEx[2]));
    } else {
      tmatch = vraw.match(tag.attrs['pattern']);
    }
    if (!tmatch) {
      core.warning(`${tag.attrs['pattern']} does not match ${vraw}.`);
      return version;
    }
    if (typeof tmatch[tag.attrs['group']] === 'undefined') {
      core.warning(`Group ${tag.attrs['group']} does not exist for ${tag.attrs['pattern']} pattern.`);
      return version;
    }

    vraw = tmatch[tag.attrs['group']];
    latest = true;

    if (version.main == undefined) {
      version.main = vraw;
    } else if (vraw !== version.main) {
      version.partial.push(vraw);
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? latest : this.flavor.latest == 'true';
    }

    return version;
  }

  private procRefBranch(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/heads\//.test(this.context.ref)) {
      return version;
    }

    const vraw = this.setFlavor(this.context.ref.replace(/^refs\/heads\//g, '').replace(/[^a-zA-Z0-9._-]+/g, '-'), tag);
    if (version.main == undefined) {
      version.main = vraw;
    } else if (vraw !== version.main) {
      version.partial.push(vraw);
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true';
    }

    return version;
  }

  private procRefTag(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/tags\//.test(this.context.ref)) {
      return version;
    }

    const vraw = this.setFlavor(this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-'), tag);
    if (version.main == undefined) {
      version.main = vraw;
    } else if (vraw !== version.main) {
      version.partial.push(vraw);
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? true : this.flavor.latest == 'true';
    }

    return version;
  }

  private procRefPr(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/pull\//.test(this.context.ref)) {
      return version;
    }

    const vraw = this.setFlavor(this.context.ref.replace(/^refs\/pull\//g, '').replace(/\/merge$/g, ''), tag);
    if (version.main == undefined) {
      version.main = vraw;
    } else if (vraw !== version.main) {
      version.partial.push(vraw);
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true';
    }

    return version;
  }

  private procEdge(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/heads\//.test(this.context.ref)) {
      return version;
    }

    let val = this.context.ref.replace(/^refs\/heads\//g, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
    if (tag.attrs['branch'].length == 0) {
      tag.attrs['branch'] = this.repo.default_branch;
    }
    if (tag.attrs['branch'] === val) {
      val = 'edge';
    }

    const vraw = this.setFlavor(val, tag);
    if (version.main == undefined) {
      version.main = vraw;
    } else if (vraw !== version.main) {
      version.partial.push(vraw);
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true';
    }

    return version;
  }

  private procRaw(version: Version, tag: tcl.Tag): Version {
    const vraw = this.setFlavor(tag.attrs['value'], tag);
    if (version.main == undefined) {
      version.main = vraw;
    } else if (vraw !== version.main) {
      version.partial.push(vraw);
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true';
    }

    return version;
  }

  private procSha(version: Version, tag: tcl.Tag): Version {
    if (!this.context.sha) {
      return version;
    }

    const vraw = this.setFlavor(this.context.sha.substr(0, 7), tag);
    if (version.main == undefined) {
      version.main = vraw;
    } else if (vraw !== version.main) {
      version.partial.push(vraw);
    }
    if (version.latest == undefined) {
      version.latest = this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true';
    }

    return version;
  }

  private setFlavor(val: string, tag: tcl.Tag): string {
    if (tag.attrs['prefix'].length > 0) {
      val = `${tag.attrs['prefix']}${val}`;
    } else if (this.flavor.prefix.length > 0) {
      val = `${this.flavor.prefix}${val}`;
    }
    if (tag.attrs['suffix'].length > 0) {
      val = `${val}${tag.attrs['suffix']}`;
    } else if (this.flavor.suffix.length > 0) {
      val = `${val}${this.flavor.suffix}`;
    }
    return val;
  }

  public getTags(): Array<string> {
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
    }
    return tags;
  }

  public getLabels(): Array<string> {
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
    labels.push(...this.inputs.labels);
    return labels;
  }

  public getBakeFile(): string {
    let jsonLabels = {};
    for (let label of this.getLabels()) {
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
              tags: this.getTags(),
              labels: jsonLabels,
              args: {
                DOCKER_META_IMAGES: this.inputs.images.join(','),
                DOCKER_META_VERSION: this.version.main
              }
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
