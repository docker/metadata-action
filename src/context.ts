import {parse} from 'csv-parse/sync';
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
    images: getInputList('images', true),
    tags: getInputList('tags', true),
    flavor: getInputList('flavor', true),
    labels: getInputList('labels', true),
    sepTags: core.getInput('sep-tags', {trimWhitespace: false}) || `\n`,
    sepLabels: core.getInput('sep-labels', {trimWhitespace: false}) || `\n`,
    bakeTarget: core.getInput('bake-target') || `docker-metadata-action`,
    githubToken: core.getInput('github-token')
  };
}

export function getInputList(name: string, ignoreComma?: boolean): string[] {
  const res: Array<string> = [];

  const items = core.getInput(name);
  if (items == '') {
    return res;
  }

  const records = parse(items, {
    columns: false,
    relaxQuotes: true,
    comment: '#',
    relaxColumnCount: true,
    skipEmptyLines: true
  });

  for (const record of records as Array<string[]>) {
    if (record.length == 1) {
      res.push(record[0]);
      continue;
    } else if (!ignoreComma) {
      res.push(...record);
      continue;
    }
    res.push(record.join(','));
  }

  return res.filter(item => item).map(pat => pat.trim());
}

export const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

// FIXME: Temp fix https://github.com/actions/toolkit/issues/777
export function setOutput(name: string, value: unknown): void {
  issueCommand('set-output', {name}, value);
}
