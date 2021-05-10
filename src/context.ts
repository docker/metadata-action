import csvparse from 'csv-parse/lib/sync';
import * as core from '@actions/core';
import {issueCommand} from '@actions/core/lib/command';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let _tmpDir: string;

export interface Inputs {
  images: string[];
  tags: string[];
  flavor: string[];
  labels: string[];
  sepTags: string;
  sepLabels: string;
  bakeTarget: string;
  githubToken: string;
}

export function tmpDir(): string {
  if (!_tmpDir) {
    _tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-metadata-action-')).split(path.sep).join(path.posix.sep);
  }
  return _tmpDir;
}

export function getInputs(): Inputs {
  return {
    images: getInputList('images'),
    tags: getInputList('tags', true),
    flavor: getInputList('flavor', true),
    labels: getInputList('labels', true),
    sepTags: core.getInput('sep-tags') || `\n`,
    sepLabels: core.getInput('sep-labels') || `\n`,
    bakeTarget: core.getInput('bake-target') || `docker-metadata-action`,
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

// FIXME: Temp fix https://github.com/actions/toolkit/issues/777
export function setOutput(name: string, value: any): void {
  issueCommand('set-output', {name}, value);
}
