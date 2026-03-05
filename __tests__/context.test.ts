import {beforeEach, describe, expect, test, it, vi} from 'vitest';
import {Git} from '@docker/actions-toolkit/lib/git.js';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit.js';

import * as context from '../src/context.js';

const toolkit = new Toolkit({githubToken: 'fake-github-token'});

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
    [
      3,
      new Map<string, string>([
        ['labels', 'mylabel=foo#bar\n#comment\nanother=bar'],
      ]),
      {
        context: context.ContextSource.workflow,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        githubToken: '',
        images: [],
        labels: ['mylabel=foo#bar', 'another=bar'],
        annotations: [],
        sepLabels: '\n',
        sepTags: '\n',
        sepAnnotations: '\n',
        tags: [],
      }
    ],
    [
      4,
      new Map<string, string>([
        ['annotations', 'org.opencontainers.image.url=https://example.com/path#readme\n#comment\norg.opencontainers.image.source=https://github.com/docker/metadata-action'],
      ]),
      {
        context: context.ContextSource.workflow,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        githubToken: '',
        images: [],
        labels: [],
        annotations: [
          'org.opencontainers.image.url=https://example.com/path#readme',
          'org.opencontainers.image.source=https://github.com/docker/metadata-action'
        ],
        sepLabels: '\n',
        sepTags: '\n',
        sepAnnotations: '\n',
        tags: [],
      }
    ],
    [
      5,
      new Map<string, string>([
        ['tags', 'type=raw,value=foo#bar\n#comment'],
        ['flavor', 'prefix=v#1\n#comment'],
      ]),
      {
        context: context.ContextSource.workflow,
        bakeTarget: 'docker-metadata-action',
        flavor: ['prefix=v#1'],
        githubToken: '',
        images: [],
        labels: [],
        annotations: [],
        sepLabels: '\n',
        sepTags: '\n',
        sepAnnotations: '\n',
        tags: ['type=raw,value=foo#bar'],
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
  it('workflow', async () => {
    const ctx = await context.getContext(context.ContextSource.workflow, toolkit);
    expect(ctx.ref).toEqual('refs/heads/dev');
    expect(ctx.sha).toEqual('5f3331d7f7044c18ca9f12c77d961c4d7cf3276a');
    expect(ctx.commitDate).toEqual(new Date('2024-11-13T13:42:28.000Z'));
  });
  it('git', async () => {
    vi.spyOn(Git, 'context').mockImplementation((): Promise<context.Context> => {
      return Promise.resolve({
        ref: 'refs/heads/git-test',
        sha: 'git-test-sha'
      } as context.Context);
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
