import * as core from '@actions/core';
import {Context} from '@actions/github/lib/context';
import {Util} from '@docker/actions-toolkit/lib/util';
import {Git} from '@docker/actions-toolkit/lib/git';
import {GitHub} from '@docker/actions-toolkit/lib/github';

export interface Inputs {
  context: ContextSource;
  images: string[];
  tags: string[];
  flavor: string[];
  labels: string[];
  sepTags: string;
  sepLabels: string;
  bakeTarget: string;
  githubToken: string;
}

export function getInputs(): Inputs {
  return {
    context: (core.getInput('context') || ContextSource.workflow) as ContextSource,
    images: Util.getInputList('images', {ignoreComma: true}),
    tags: Util.getInputList('tags', {ignoreComma: true}),
    flavor: Util.getInputList('flavor', {ignoreComma: true}),
    labels: Util.getInputList('labels', {ignoreComma: true}),
    sepTags: core.getInput('sep-tags', {trimWhitespace: false}) || `\n`,
    sepLabels: core.getInput('sep-labels', {trimWhitespace: false}) || `\n`,
    bakeTarget: core.getInput('bake-target') || `docker-metadata-action`,
    githubToken: core.getInput('github-token')
  };
}

export enum ContextSource {
  workflow = 'workflow',
  git = 'git'
}

export async function getContext(source: ContextSource): Promise<Context> {
  switch (source) {
    case ContextSource.workflow:
      return getContextFromWorkflow();
    case ContextSource.git:
      return await getContextFromGit();
    default:
      throw new Error(`Invalid context source: ${source}`);
  }
}

function getContextFromWorkflow(): Context {
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

  return context;
}

async function getContextFromGit(): Promise<Context> {
  return await Git.context();
}
