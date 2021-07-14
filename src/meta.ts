import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';
import * as pep440 from '@renovate/pep440';
import * as semver from 'semver';
import {Inputs, tmpDir} from './context';
import {ReposGetResponseData} from './github';
import * as tcl from './tag';
import * as fcl from './flavor';
import * as core from '@actions/core';
import {Context} from '@actions/github/lib/context';

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
    // Needs to override Git reference with pr ref instead of upstream branch ref
    // for pull_request_target event
    if (/pull_request_target/.test(context.eventName)) {
      context.ref = `refs/pull/${context.payload.number}/merge`;
    }

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
      if (!/true/i.test(tag.attrs['enable'])) {
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
        case tcl.Type.Pep440: {
          version = this.procPep440(version, tag);
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
    const vraw = this.setValue(
      handlebars.compile(tag.attrs['pattern'])({
        date: function (format) {
          return moment(currentDate).utc().format(format);
        }
      }),
      tag
    );

    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true');
  }

  private procSemver(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/tags\//.test(this.context.ref) && tag.attrs['value'].length == 0) {
      return version;
    }

    let vraw: string;
    if (tag.attrs['value'].length > 0) {
      vraw = this.setGlobalExp(tag.attrs['value']);
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
      vraw = this.setValue(handlebars.compile('{{version}}')(sver), tag);
    } else {
      vraw = this.setValue(handlebars.compile(tag.attrs['pattern'])(sver), tag);
      latest = true;
    }

    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? latest : this.flavor.latest == 'true');
  }

  private procPep440(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/tags\//.test(this.context.ref) && tag.attrs['value'].length == 0) {
      return version;
    }

    let vraw: string;
    if (tag.attrs['value'].length > 0) {
      vraw = this.setGlobalExp(tag.attrs['value']);
    } else {
      vraw = this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
    }
    if (!pep440.valid(vraw)) {
      core.warning(`${vraw} does not conform to PEP 440. More info: https://www.python.org/dev/peps/pep-0440`);
      return version;
    }

    let latest: boolean = false;
    const pver = pep440.explain(vraw);
    if (pver.is_prerelease || pver.is_postrelease || pver.is_devrelease) {
      vraw = this.setValue(pep440.clean(vraw), tag);
    } else {
      vraw = this.setValue(
        handlebars.compile(tag.attrs['pattern'])({
          raw: function () {
            return vraw;
          },
          version: function () {
            return pep440.clean(vraw);
          },
          major: function () {
            return pep440.major(vraw);
          },
          minor: function () {
            return pep440.minor(vraw);
          },
          patch: function () {
            return pep440.patch(vraw);
          }
        }),
        tag
      );
      latest = true;
    }

    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? latest : this.flavor.latest == 'true');
  }

  private procMatch(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/tags\//.test(this.context.ref) && tag.attrs['value'].length == 0) {
      return version;
    }

    let vraw: string;
    if (tag.attrs['value'].length > 0) {
      vraw = this.setGlobalExp(tag.attrs['value']);
    } else {
      vraw = this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
    }

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

    vraw = this.setValue(tmatch[tag.attrs['group']], tag);
    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? true : this.flavor.latest == 'true');
  }

  private procRefBranch(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/heads\//.test(this.context.ref)) {
      return version;
    }
    const vraw = this.setValue(this.context.ref.replace(/^refs\/heads\//g, '').replace(/[^a-zA-Z0-9._-]+/g, '-'), tag);
    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true');
  }

  private procRefTag(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/tags\//.test(this.context.ref)) {
      return version;
    }
    const vraw = this.setValue(this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-'), tag);
    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? true : this.flavor.latest == 'true');
  }

  private procRefPr(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/pull\//.test(this.context.ref)) {
      return version;
    }

    const vraw = this.setValue(this.context.ref.replace(/^refs\/pull\//g, '').replace(/\/merge$/g, ''), tag);
    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true');
  }

  private procEdge(version: Version, tag: tcl.Tag): Version {
    if (!/^refs\/heads\//.test(this.context.ref)) {
      return version;
    }

    let val = this.context.ref.replace(/^refs\/heads\//g, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
    if (tag.attrs['branch'].length == 0) {
      tag.attrs['branch'] = this.repo.default_branch;
    }
    if (tag.attrs['branch'] != val) {
      return version;
    }

    const vraw = this.setValue('edge', tag);
    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true');
  }

  private procRaw(version: Version, tag: tcl.Tag): Version {
    const vraw = this.setValue(this.setGlobalExp(tag.attrs['value']), tag);
    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true');
  }

  private procSha(version: Version, tag: tcl.Tag): Version {
    if (!this.context.sha) {
      return version;
    }

    let val = this.context.sha;
    if (tag.attrs['format'] === tcl.ShaFormat.Short) {
      val = this.context.sha.substr(0, 7);
    }

    const vraw = this.setValue(val, tag);
    return Meta.setVersion(version, vraw, this.flavor.latest == 'auto' ? false : this.flavor.latest == 'true');
  }

  private static setVersion(version: Version, val: string, latest: boolean): Version {
    if (val.length == 0) {
      return version;
    }
    if (version.main == undefined) {
      version.main = val;
    } else if (val !== version.main) {
      version.partial.push(val);
    }
    if (version.latest == undefined) {
      version.latest = latest;
    }
    return version;
  }

  private setValue(val: string, tag: tcl.Tag): string {
    if (tag.attrs.hasOwnProperty('prefix')) {
      val = `${this.setGlobalExp(tag.attrs['prefix'])}${val}`;
    } else if (this.flavor.prefix.length > 0) {
      val = `${this.setGlobalExp(this.flavor.prefix)}${val}`;
    }
    if (tag.attrs.hasOwnProperty('suffix')) {
      val = `${val}${this.setGlobalExp(tag.attrs['suffix'])}`;
    } else if (this.flavor.suffix.length > 0) {
      val = `${val}${this.setGlobalExp(this.flavor.suffix)}`;
    }
    return val;
  }

  private setGlobalExp(val): string {
    const ctx = this.context;
    return handlebars.compile(val)({
      branch: function () {
        if (!/^refs\/heads\//.test(ctx.ref)) {
          return '';
        }
        return ctx.ref.replace(/^refs\/heads\//g, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
      },
      tag: function () {
        if (!/^refs\/tags\//.test(ctx.ref)) {
          return '';
        }
        return ctx.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
      },
      sha: function () {
        return ctx.sha.substr(0, 7);
      }
    });
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
        tags.push(`${imageLc}:${this.flavor.prefixLatest ? this.flavor.prefix : ''}latest${this.flavor.suffixLatest ? this.flavor.suffix : ''}`);
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

  public getJSON(): {} {
    return {
      tags: this.getTags(),
      labels: this.getLabels().reduce((res, label) => {
        const matches = label.match(/([^=]*)=(.*)/);
        if (!matches) {
          return res;
        }
        res[matches[1]] = matches[2];
        return res;
      }, {})
    };
  }

  public getBakeFile(): string {
    const bakeFile = path.join(tmpDir(), 'docker-metadata-action-bake.json').split(path.sep).join(path.posix.sep);
    fs.writeFileSync(
      bakeFile,
      JSON.stringify(
        {
          target: {
            [this.inputs.bakeTarget]: {
              tags: this.getTags(),
              labels: this.getLabels().reduce((res, label) => {
                const matches = label.match(/([^=]*)=(.*)/);
                if (!matches) {
                  return res;
                }
                res[matches[1]] = matches[2];
                return res;
              }, {}),
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
