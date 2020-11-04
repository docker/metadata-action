import * as core from '@actions/core';

export interface Inputs {
  images: string[];
  tagSha: boolean;
  tagEdge: boolean;
  tagEdgeBranch: string;
  tagMatch: string;
  tagMatchGroup: number;
  tagMatchLatest: boolean;
  tagSchedule: string;
  sepTags: string;
  sepLabels: string;
  githubToken: string;
  fullSemver: boolean;
}

export function getInputs(): Inputs {
  return {
    images: getInputList('images'),
    tagSha: /true/i.test(core.getInput('tag-sha') || 'false'),
    tagEdge: /true/i.test(core.getInput('tag-edge') || 'false'),
    tagEdgeBranch: core.getInput('tag-edge-branch'),
    tagMatch: core.getInput('tag-match'),
    tagMatchGroup: Number(core.getInput('tag-match-group')) || 0,
    tagMatchLatest: /true/i.test(core.getInput('tag-match-latest') || 'true'),
    tagSchedule: core.getInput('tag-schedule') || 'nightly',
    sepTags: core.getInput('sep-tags') || `\n`,
    sepLabels: core.getInput('sep-labels') || `\n`,
    githubToken: core.getInput('github-token'),
    fullSemver: /true/i.test(core.getInput('full-semver') || 'false'),
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
