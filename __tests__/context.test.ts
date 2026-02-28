import {afterEach, beforeEach, describe, expect, test, it, vi} from 'vitest';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {Context} from '@actions/github/lib/context';
import {Git} from '@docker/actions-toolkit/lib/git';
import {GitHub} from '@docker/actions-toolkit/lib/github';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit';

import * as context from '../src/context';

const toolkit = new Toolkit({githubToken: 'fake-github-token'});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(GitHub, 'context', 'get').mockImplementation((): Context => {
    const ctx = new Context();
    const payload = ctx.payload as {
      commits?: Array<{id: string; timestamp: string}>;
      head_commit?: {id: string; timestamp: string};
    };
    if (ctx.sha && !payload.commits?.length && !payload.head_commit) {
      payload.head_commit = {
        id: ctx.sha,
        timestamp: '2024-11-13T13:42:28.000Z'
      };
    }
    return ctx;
  });
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
  const cases: [number, Map<string, string>, context.Inputs][] = [
    [
      0,
      new Map<string, string>([
        ['images', 'moby/buildkit\nghcr.io/moby/mbuildkit'],
      ]),
      {
        context: context.ContextSource.workflow,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        githubToken: '',
        images: ['moby/buildkit', 'ghcr.io/moby/mbuildkit'],
        labels: [],
        annotations: [],
        sepLabels: '\n',
        sepTags: '\n',
        sepAnnotations: '\n',
        tags: [],
      }
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
        context: context.ContextSource.workflow,
        bakeTarget: 'metadata',
        flavor: [],
        githubToken: '',
        images: ['moby/buildkit'],
        labels: [],
        annotations: [],
        sepLabels: ',',
        sepTags: ',',
        sepAnnotations: ',',
        tags: [],
      }
    ],
    [
      2,
      new Map<string, string>([
        ['images', 'moby/buildkit\n#comment\nghcr.io/moby/mbuildkit'],
      ]),
      {
        context: context.ContextSource.workflow,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        githubToken: '',
        images: ['moby/buildkit', 'ghcr.io/moby/mbuildkit'],
        labels: [],
        annotations: [],
        sepLabels: '\n',
        sepTags: '\n',
        sepAnnotations: '\n',
        tags: [],
      }
    ],
  ];
  test.each(cases)('[%d] given %o as inputs, returns %o', async (num: number, inputs: Map<string, string>, expected: context.Inputs) => {
    inputs.forEach((value: string, name: string) => {
      setInput(name, value);
    });
    const res = await context.getInputs();
    expect(res).toEqual(expected);
  });
});

describe('getContext', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ...dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures/event_create_branch.env')))
    };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it('workflow', async () => {
    const ctx = await context.getContext(context.ContextSource.workflow, toolkit);
    expect(ctx.ref).toEqual('refs/heads/dev');
    expect(ctx.sha).toEqual('5f3331d7f7044c18ca9f12c77d961c4d7cf3276a');
    expect(ctx.commitDate).toEqual(new Date('2024-11-13T13:42:28.000Z'));
  });

  it('git', async () => {
    vi.spyOn(Git, 'context').mockImplementation((): Promise<Context> => {
      return Promise.resolve({
        ref: 'refs/heads/git-test',
        sha: 'git-test-sha'
      } as Context);
    });
    vi.spyOn(Git, 'commitDate').mockImplementation(async (): Promise<Date> => {
      return new Date('2023-01-01T13:42:28.000Z');
    });
    const ctx = await context.getContext(context.ContextSource.git, toolkit);
    expect(ctx.ref).toEqual('refs/heads/git-test');
    expect(ctx.sha).toEqual('git-test-sha');
    expect(ctx.commitDate).toEqual(new Date('2023-01-01T13:42:28.000Z'));
  });
});

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}
