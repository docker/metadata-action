import * as core from '@actions/core';
import * as fs from 'fs';

import {getGitContext} from './git';

export interface Context {
  sha: string;
  ref: string;
  commitDate: Date;
  eventName: string;
}

export enum ContextSource {
  workflow = 'workflow',
  git = 'git'
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
}

function getInputList(name: string, options?: {ignoreComma?: boolean; comment?: string}): string[] {
  const input = core.getInput(name);
  if (!input) {
    return [];
  }

  const items: string[] = [];
  for (const line of input.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (options?.comment && trimmed.startsWith(options.comment)) {
      continue;
    }
    if (options?.ignoreComma) {
      items.push(trimmed);
    } else {
      items.push(
        ...trimmed
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0)
      );
    }
  }
  return items;
}

export function getInputs(): Inputs {
  const contextInput = (core.getInput('context') || ContextSource.git).toLowerCase();
  if (!Object.values(ContextSource).includes(contextInput as ContextSource)) {
    throw new Error(`Invalid context source: ${contextInput}`);
  }
  const tagsInput = getInputList('tags', {ignoreComma: true, comment: '#'});
  const defaultTags = [
    'type=schedule',
    'type=ref,event=branch',
    'type=ref,event=tag',
    'type=ref,event=pr'
  ];

  return {
    context: contextInput as ContextSource,
    images: getInputList('images', {ignoreComma: true, comment: '#'}),
    tags: tagsInput.length > 0 ? tagsInput : defaultTags,
    flavor: getInputList('flavor', {ignoreComma: true, comment: '#'}),
    labels: getInputList('labels', {ignoreComma: true, comment: '#'}),
    annotations: getInputList('annotations', {ignoreComma: true, comment: '#'}),
    sepTags: core.getInput('sep-tags', {trimWhitespace: false}) || `\n`,
    sepLabels: core.getInput('sep-labels', {trimWhitespace: false}) || `\n`,
    sepAnnotations: core.getInput('sep-annotations', {trimWhitespace: false}) || `\n`,
    bakeTarget: core.getInput('bake-target') || `docker-metadata-action`
  };
}

export async function getContext(source: ContextSource = ContextSource.git): Promise<Context> {
  switch (source) {
    case ContextSource.workflow:
      return await getContextFromWorkflow();
    case ContextSource.git:
      return await getContextFromGit();
    default:
      throw new Error(`Invalid context source: ${source}`);
  }
}

async function getContextFromGit(): Promise<Context> {
  const gitContext = await getGitContext();
  return {
    sha: gitContext.sha,
    ref: gitContext.ref,
    commitDate: gitContext.commitDate,
    eventName: process.env.GITHUB_EVENT_NAME || 'push'
  };
}

async function getContextFromWorkflow(): Promise<Context> {
  const gitContext = await getGitContext();
  const payload = loadEventPayload();

  const eventName = process.env.GITHUB_EVENT_NAME || 'workflow';
  const sha = process.env.GITHUB_SHA || gitContext.sha;
  const ref = process.env.GITHUB_REF || gitContext.ref;

  const commitDate =
    resolveCommitDateFromPayload(payload, sha) ??
    gitContext.commitDate ??
    new Date();

  return {
    sha,
    ref,
    commitDate,
    eventName
  };
}

type WorkflowPayload = {
  commits?: Array<{id: string; timestamp: string}>;
  head_commit?: {id: string; timestamp: string};
};

function loadEventPayload(): WorkflowPayload {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return {};
  }
  try {
    const content = fs.readFileSync(eventPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    core.debug(`Failed to read workflow event payload from ${eventPath}: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

function resolveCommitDateFromPayload(payload: WorkflowPayload, sha: string): Date | undefined {
  if (payload.commits) {
    const commit = payload.commits.find(item => item.id === sha);
    if (commit?.timestamp) {
      return new Date(commit.timestamp);
    }
  }
  if (payload.head_commit?.id === sha && payload.head_commit.timestamp) {
    return new Date(payload.head_commit.timestamp);
  }
  return undefined;
}
