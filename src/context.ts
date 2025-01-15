import * as core from '@actions/core';
import {Context as GithubContext} from '@actions/github/lib/context';
import {Util} from '@docker/actions-toolkit/lib/util';
import {Git} from '@docker/actions-toolkit/lib/git';
import {GitHub} from '@docker/actions-toolkit/lib/github';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit';

export interface Context extends GithubContext {
  commitDate: Date;
}

export interface Inputs {
  context: ContextSource;
  images: string[];
  tags: string[];
  flavor: string[];
  labels: string[];
  annotations: string[];
  sepTags: string;
  sepLabels: string;
  sepAnnotations: string;
  bakeTarget: string;
  githubToken: string;
}

export function getInputs(): Inputs {
  return {
    context: (core.getInput('context') || ContextSource.workflow) as ContextSource,
    images: Util.getInputList('images', {ignoreComma: true, comment: '#'}),
    tags: Util.getInputList('tags', {ignoreComma: true, comment: '#'}),
    flavor: Util.getInputList('flavor', {ignoreComma: true, comment: '#'}),
    labels: Util.getInputList('labels', {ignoreComma: true, comment: '#'}),
    annotations: Util.getInputList('annotations', {ignoreComma: true, comment: '#'}),
    sepTags: core.getInput('sep-tags', {trimWhitespace: false}) || `\n`,
    sepLabels: core.getInput('sep-labels', {trimWhitespace: false}) || `\n`,
    sepAnnotations: core.getInput('sep-annotations', {trimWhitespace: false}) || `\n`,
    bakeTarget: core.getInput('bake-target') || `docker-metadata-action`,
    githubToken: core.getInput('github-token')
  };
}

export enum ContextSource {
  workflow = 'workflow',
  git = 'git'
}

export async function getContext(source: ContextSource, toolkit: Toolkit): Promise<Context> {
  switch (source) {
    case ContextSource.workflow:
      return await getContextFromWorkflow(toolkit);
    case ContextSource.git:
      return await getContextFromGit();
    default:
      throw new Error(`Invalid context source: ${source}`);
  }
}

async function getContextFromWorkflow(toolkit: Toolkit): Promise<Context> {
  const context = GitHub.context;

  // Needs to override Git reference with pr ref instead of upstream branch ref
  // for pull_request_target event
  // https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target
  if (/pull_request_target/.test(context.eventName)) {
    context.ref = `refs/pull/${context.payload.number}/merge`;
  }

  // DOCKER_METADATA_PR_HEAD_SHA env var can be used to set associated head
  // SHA instead of commit SHA that triggered the workflow on pull request
  // event.
  if (/true/i.test(process.env.DOCKER_METADATA_PR_HEAD_SHA || '')) {
    if ((/pull_request/.test(context.eventName) || /pull_request_target/.test(context.eventName)) && context.payload?.pull_request?.head?.sha != undefined) {
      context.sha = context.payload.pull_request.head.sha;
    }
  }

  return {
    commitDate: await getCommitDateFromWorkflow(context.sha, toolkit),
    ...context
  } as Context;
}

async function getContextFromGit(): Promise<Context> {
  const ctx = await Git.context();

  return {
    commitDate: await Git.commitDate(ctx.sha),
    ...ctx
  } as Context;
}

async function getCommitDateFromWorkflow(sha: string, toolkit: Toolkit): Promise<Date> {
  const event = GitHub.context.payload as unknown as {
    // branch push
    commits?: Array<{
      timestamp: string;
      // commit sha
      id: string;
    }>;
    // tags
    head_commit?: {
      timestamp: string;
      // commit sha
      id: string;
    };
  };

  if (event.commits) {
    const commitDate = event.commits.find(x => x.id === sha)?.timestamp;
    if (commitDate) {
      return new Date(commitDate);
    }
  }

  if (event.head_commit) {
    if (event.head_commit.id === sha) {
      return new Date(event.head_commit.timestamp);
    }
  }

  // fallback to github api for commit date
  try {
    const commit = await toolkit.github.octokit.rest.repos.getCommit({
      owner: GitHub.context.repo.owner,
      repo: GitHub.context.repo.repo,
      ref: sha
    });
    if (commit.data.commit.committer?.date) {
      return new Date(commit.data.commit.committer.date);
    }
    throw new Error('Committer date not found');
  } catch (error) {
    core.debug(`Failed to get commit date from GitHub API: ${error.message}`);
    return new Date();
  }
}
