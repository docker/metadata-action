import {afterEach, beforeEach, describe, expect, test, it, jest} from '@jest/globals';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import {ContextSource, getContext, getInputs, Inputs} from '../src/context';
import * as gitModule from '../src/git';

beforeEach(() => {
  jest.clearAllMocks();
});

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
        context: ContextSource.git,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        images: ['moby/buildkit', 'ghcr.io/moby/mbuildkit'],
        labels: [],
        annotations: [],
        sepLabels: '\n',
        sepTags: '\n',
        sepAnnotations: '\n',
        tags: [
          'type=schedule',
          'type=ref,event=branch',
          'type=ref,event=tag',
          'type=ref,event=pr'
        ],
      } as Inputs
    ],
    [
      1,
      new Map<string, string>([
        ['bake-target', 'metadata'],
        ['images', 'moby/buildkit'],
        ['sep-labels', ','],
        ['sep-tags', ','],
        ['sep-annotations', ',']
      ]),
      {
        context: ContextSource.git,
        bakeTarget: 'metadata',
        flavor: [],
        images: ['moby/buildkit'],
        labels: [],
        annotations: [],
        sepLabels: ',',
        sepTags: ',',
        sepAnnotations: ',',
        tags: [
          'type=schedule',
          'type=ref,event=branch',
          'type=ref,event=tag',
          'type=ref,event=pr'
        ],
      } as Inputs
    ],
    [
      2,
      new Map<string, string>([
        ['images', 'moby/buildkit\n#comment\nghcr.io/moby/mbuildkit'],
      ]),
      {
        context: ContextSource.git,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        images: ['moby/buildkit', 'ghcr.io/moby/mbuildkit'],
        labels: [],
        annotations: [],
        sepLabels: '\n',
        sepTags: '\n',
        sepAnnotations: '\n',
        tags: [
          'type=schedule',
          'type=ref,event=branch',
          'type=ref,event=tag',
          'type=ref,event=pr'
        ],
      } as Inputs
    ],
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
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ...dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures/event_create_branch.env')))
    };
  });
  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should return git context', async () => {
    jest.spyOn(gitModule, 'getGitContext').mockImplementation(async () => {
      return {
        sha: '5f3331d7f7044c18ca9f12c77d961c4d7cf3276a',
        ref: process.env.GITHUB_REF || 'refs/heads/dev',
        commitDate: new Date('2024-11-13T13:42:28.000Z'),
        remoteUrl: 'https://github.com/test/repo.git',
        defaultBranch: 'master'
      };
    });

    const context = await getContext(ContextSource.git);
    expect(context.ref).toEqual('refs/heads/dev');
    expect(context.sha).toEqual('5f3331d7f7044c18ca9f12c77d961c4d7cf3276a');
    expect(context.commitDate).toEqual(new Date('2024-11-13T13:42:28.000Z'));
  });

  it('should fall back to git commit date when workflow payload missing', async () => {
    jest.spyOn(gitModule, 'getGitContext').mockImplementation(async () => {
      return {
        sha: 'payload-sha',
        ref: 'refs/heads/workflow-branch',
        commitDate: new Date('2022-01-01T00:00:00.000Z'),
        remoteUrl: 'https://github.com/test/repo.git',
        defaultBranch: 'main'
      };
    });
    process.env.GITHUB_SHA = 'payload-sha';
    process.env.GITHUB_REF = 'refs/heads/workflow-branch';
    delete process.env.GITHUB_EVENT_PATH;
    const context = await getContext(ContextSource.workflow);
    expect(context.ref).toEqual('refs/heads/workflow-branch');
    expect(context.sha).toEqual('payload-sha');
    expect(context.commitDate).toEqual(new Date('2022-01-01T00:00:00.000Z'));
  });
});

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}
