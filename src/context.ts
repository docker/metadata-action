import * as core from '@actions/core';

export interface Inputs {
  images: string[];
  tagSha: boolean;
  tagEdge: string;
  tagSchedule: string;
  sepTags: string;
  sepLabels: string;
  githubToken: string;
}

export function getInputs(): Inputs {
  return {
    images: getInputList('images'),
    tagSha: /true/i.test(core.getInput('tag-sha')),
    tagEdge: core.getInput('tag-edge'),
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
