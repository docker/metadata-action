import * as handlebars from 'handlebars';
import * as moment from 'moment';
import * as semver from 'semver';
import {Inputs} from './context';
import * as core from '@actions/core';
import {Context} from '@actions/github/lib/context';
import {ReposGetResponseData} from '@octokit/types';

export class Meta {
  private readonly inputs: Inputs;
  private readonly context: Context;
  private readonly repo: ReposGetResponseData;
  private readonly date: Date;

  constructor(inputs: Inputs, context: Context, repo: ReposGetResponseData) {
    this.inputs = inputs;
    if (!this.inputs.tagEdge) {
      this.inputs.tagEdge = repo.default_branch;
    }
    this.context = context;
    this.repo = repo;
    this.date = new Date();
  }

  public version(): string | undefined {
    if (/schedule/.test(this.context.eventName)) {
      return handlebars.compile(this.inputs.tagSchedule)(this.scheduleTplContext());
    } else if (/^refs\/tags\//.test(this.context.ref)) {
      const tag = this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
      const sver = semver.clean(tag);
      return sver ? sver : tag;
    } else if (/^refs\/heads\//.test(this.context.ref)) {
      const branch = this.context.ref.replace(/^refs\/heads\//g, '').replace(/\//g, '-');
      return this.inputs.tagEdge === branch ? 'edge' : branch;
    } else if (/^refs\/pull\//.test(this.context.ref)) {
      const pr = this.context.ref.replace(/^refs\/pull\//g, '').replace(/\/merge$/g, '');
      return `pr-${pr}`;
    }
  }

  public tags(): Array<string> {
    let tags: Array<string> = [];
    for (const image of this.inputs.images) {
      if (/schedule/.test(this.context.eventName)) {
        tags.push.apply(tags, this.eventSchedule(image));
      } else if (/^refs\/tags\//.test(this.context.ref)) {
        tags.push.apply(tags, this.eventTag(image));
      } else if (/^refs\/heads\//.test(this.context.ref)) {
        tags.push.apply(tags, this.eventBranch(image));
      } else if (/^refs\/pull\//.test(this.context.ref)) {
        tags.push.apply(tags, this.eventPullRequest(image));
      } else {
        core.warning(`Unknown event "${this.context.eventName}" with ref "${this.context.ref}"`);
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
      `org.opencontainers.image.source=${this.repo.clone_url || ''}`,
      `org.opencontainers.image.version=${this.version() || ''}`,
      `org.opencontainers.image.created=${this.date.toISOString()}`,
      `org.opencontainers.image.revision=${this.context.sha || ''}`,
      `org.opencontainers.image.licenses=${this.repo.license?.spdx_id || ''}`
    ];
  }

  private eventSchedule(image: string): Array<string> {
    const schedule = handlebars.compile(this.inputs.tagSchedule)(this.scheduleTplContext());
    return [`${image}:${schedule}`];
  }

  private eventTag(image: string): Array<string> {
    const tag = this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
    const version = semver.clean(tag);
    if (version) {
      return [`${image}:${version}`, `${image}:latest`];
    }
    return [`${image}:${tag}`];
  }

  private eventBranch(image: string): Array<string> {
    const branch = this.context.ref.replace(/^refs\/heads\//g, '').replace(/\//g, '-');
    if (this.inputs.tagEdge === branch) {
      return [`${image}:edge`];
    }
    return [`${image}:${branch}`];
  }

  private eventPullRequest(image: string): Array<string> {
    const pr = this.context.ref.replace(/^refs\/pull\//g, '').replace(/\/merge$/g, '');
    return [`${image}:pr-${pr}`];
  }

  private scheduleTplContext(): any {
    const currentDate = this.date;
    return {
      date: function (format) {
        return moment(currentDate).format(format);
      }
    };
  }
}
