import * as core from '@actions/core';

export interface Inputs {
  images: string[];
  tagSha: boolean;
  tagEdge: boolean;
  tagEdgeBranch: string;
  tagCoerceTag: string;
  tagSchedule: string;
  sepTags: string;
  sepLabels: string;
  githubToken: string;
}

export function getInputs(): Inputs {
  return {
    images: getInputList('images'),
    tagSha: /true/i.test(core.getInput('tag-sha') || 'false'),
    tagEdge: /true/i.test(core.getInput('tag-edge') || 'false'),
    tagEdgeBranch: core.getInput('tag-edge-branch'),
    tagCoerceTag: core.getInput('tag-coerce-tag'),
    tagSchedule: core.getInput('tag-schedule') || 'nightly',
    sepTags: core.getInput('sep-tags') || `\n`,
    sepLabels: core.getInput('sep-labels') || `\n`,
    githubToken: core.getInput('github-token')
  };
}

export function getInputList(name: string): string[] {
  const items = core.getInput(name);
  if (items == '') {
    return [];
  }
  return items
    .split(/\r?\n/)
    .filter(x => x)
    .reduce<string[]>((acc, line) => acc.concat(line.split(',').filter(x => x)).map(pat => pat.trim()), []);
}

export const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};
