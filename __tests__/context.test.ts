import {Context} from '@actions/github/lib/context';
import {beforeEach, describe, expect, test, it, jest} from '@jest/globals';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {ContextSource, getInputs, Inputs} from '../src/context';

describe('getInputs', () => {
  beforeEach(() => {
    process.env = Object.keys(process.env).reduce((object, key) => {
      if (!key.startsWith('INPUT_')) {
        object[key] = process.env[key];
      }
      return object;
    }, {});
  });

  // prettier-ignore
  test.each([
    [
      0,
      new Map<string, string>([
        ['images', 'moby/buildkit\nghcr.io/moby/mbuildkit'],
      ]),
      {
        context: ContextSource.workflow,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        githubToken: '',
        images: ['moby/buildkit', 'ghcr.io/moby/mbuildkit'],
        labels: [],
        sepLabels: '\n',
        sepTags: '\n',
        tags: [],
      } as Inputs
    ],
    [
      1,
      new Map<string, string>([
        ['bake-target', 'metadata'],
        ['images', 'moby/buildkit'],
        ['sep-labels', ','],
        ['sep-tags', ','],
      ]),
      {
        context: ContextSource.workflow,
        bakeTarget: 'metadata',
        flavor: [],
        githubToken: '',
        images: ['moby/buildkit'],
        labels: [],
        sepLabels: ',',
        sepTags: ',',
        tags: [],
      } as Inputs
    ]
  ])(
    '[%d] given %p as inputs, returns %p',
    async (num: number, inputs: Map<string, string>, expected: Inputs) => {
      inputs.forEach((value: string, name: string) => {
        setInput(name, value);
      });
      expect(await getInputs()).toEqual(expected);
    }
  );
});

describe('getContext', () => {
  it('get context with workflow', async () => {
    process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures/event_create_branch.env')));

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {getContext} = require('../src/context');
    const contextResult = await getContext(ContextSource.workflow);

    expect(contextResult.ref).toEqual('refs/heads/dev');
    expect(contextResult.sha).toEqual('5f3331d7f7044c18ca9f12c77d961c4d7cf3276a');
  });

  it('get context with git', async () => {
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const git = require('@docker/actions-toolkit/lib/git');
    jest.spyOn(git.Git, 'context').mockImplementation((): Promise<Context> => {
      return Promise.resolve({
        ref: 'refs/heads/git-test',
        sha: 'git-test-sha'
      } as Context);
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {getContext} = require('../src/context');

    const contextResult = await getContext(ContextSource.git);

    expect(contextResult.ref).toEqual('refs/heads/git-test');
    expect(contextResult.sha).toEqual('git-test-sha');
  });
});

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}
