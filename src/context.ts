import csvparse from 'csv-parse/lib/sync';
import * as core from '@actions/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let _tmpDir: string;

export interface Inputs {
  images: string[];
  tagSha: boolean;
  tagEdge: boolean;
  tagEdgeBranch: string;
  tagSemver: string[];
  tagMatch: string;
  tagMatchGroup: number;
  tagLatest: boolean;
  tagSchedule: string;
  tagCustom: string[];
  tagCustomOnly: boolean;
  tagSuffix: string;
  tagPrefix: string;
  labelCustom: string[];
  sepTags: string;
  sepLabels: string;
  githubToken: string;
}

export function tmpDir(): string {
  if (!_tmpDir) {
    _tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghaction-docker-meta-')).split(path.sep).join(path.posix.sep);
  }
  return _tmpDir;
}

export function getInputs(): Inputs {
  return {
    images: getInputList('images'),
    tagSha: /true/i.test(core.getInput('tag-sha') || 'false'),
    tagEdge: /true/i.test(core.getInput('tag-edge') || 'false'),
    tagEdgeBranch: core.getInput('tag-edge-branch'),
    tagSemver: getInputList('tag-semver'),
    tagMatch: core.getInput('tag-match'),
    tagMatchGroup: Number(core.getInput('tag-match-group')) || 0,
    tagLatest: /true/i.test(core.getInput('tag-latest') || core.getInput('tag-match-latest') || 'true'),
    tagSchedule: core.getInput('tag-schedule') || 'nightly',
    tagCustom: getInputList('tag-custom'),
    tagCustomOnly: /true/i.test(core.getInput('tag-custom-only') || 'false'),
    tagSuffix: core.getInput('tag-suffix'),
    tagPrefix: core.getInput('tag-prefix'),
    labelCustom: getInputList('label-custom'),
    sepTags: core.getInput('sep-tags') || `\n`,
    sepLabels: core.getInput('sep-labels') || `\n`,
    githubToken: core.getInput('github-token')
  };
}

export function getInputList(name: string, ignoreComma?: boolean): string[] {
  let res: Array<string> = [];

  const items = core.getInput(name);
  if (items == '') {
    return res;
  }

  for (let output of csvparse(items, {
    columns: false,
    relaxColumnCount: true,
    skipLinesWithEmptyValues: true
  }) as Array<string[]>) {
    if (output.length == 1) {
      res.push(output[0]);
      continue;
    } else if (!ignoreComma) {
      res.push(...output);
      continue;
    }
    res.push(output.join(','));
  }

  return res.filter(item => item).map(pat => pat.trim());
}

export const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};
