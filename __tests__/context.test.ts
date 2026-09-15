import {afterEach, beforeEach, describe, expect, test, it, vi} from 'vitest';
import {execFileSync} from 'child_process';
import fs from 'fs';
import path from 'path';

import {Git} from '@docker/actions-toolkit/lib/git.js';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit.js';

import * as context from '../src/context.js';
import {Meta} from '../src/meta.js';
import repoFixture from './fixtures/repo.json' with {type: 'json'};

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

  it('reads a Git context with a path', () => {
    setInput('context', 'git:nested checkout');
    expect(context.getInputs().context).toEqual('git:nested checkout');
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('workflow does not read Git context', async () => {
    const gitContext = vi.spyOn(Git, 'context');
    const gitCommitDate = vi.spyOn(Git, 'commitDate');
    const gitCommitCount = vi.spyOn(Git, 'commitCount');
    const ctx = await context.getContext(context.ContextSource.workflow, toolkit);
    expect(ctx.ref).toEqual('refs/heads/dev');
    expect(ctx.sha).toEqual('5f3331d7f7044c18ca9f12c77d961c4d7cf3276a');
    expect(ctx.commitDate).toEqual(new Date('2024-11-13T13:42:28.000Z'));
    expect(gitContext).not.toHaveBeenCalled();
    expect(gitCommitDate).not.toHaveBeenCalled();
    expect(gitCommitCount).not.toHaveBeenCalled();
    expect(ctx.commitCount).toBeUndefined();
  });
  it.each<[string, string | undefined]>([
    ['git', undefined],
    ['git:', ''],
    ['git:source', 'source'],
    ['git:C:\\nested checkout', 'C:\\nested checkout']
  ])('reads %s', async (source, workdir) => {
    vi.spyOn(Git, 'context').mockImplementation((): Promise<context.Context> => {
      return Promise.resolve({
        ref: 'refs/heads/git-test',
        sha: 'git-test-sha'
      } as context.Context);
    });
    vi.spyOn(Git, 'commitDate').mockImplementation(async (): Promise<Date> => {
      return new Date('2023-01-01T13:42:28.000Z');
    });
    vi.spyOn(Git, 'commitCount').mockResolvedValue(42);
    const ctx = await context.getContext(source, toolkit);
    expect(Git.context).toHaveBeenCalledWith(workdir);
    expect(Git.commitDate).toHaveBeenCalledWith('git-test-sha', workdir);
    expect(Git.commitCount).toHaveBeenCalledWith(workdir);
    expect(ctx.commitCount).toEqual(42);
    expect(ctx.ref).toEqual('refs/heads/git-test');
    expect(ctx.sha).toEqual('git-test-sha');
    expect(ctx.commitDate).toEqual(new Date('2023-01-01T13:42:28.000Z'));
  });

  it.each(['workflow:source', 'gitfoo:source', 'invalid'])('rejects invalid context %s', async source => {
    await expect(context.getContext(source, toolkit)).rejects.toThrow(`Invalid context source: ${source}`);
  });

  it.each(['relative', 'absolute'])('reads a selected checkout using a %s path', async pathType => {
    const checkoutDir = fs.mkdtempSync(path.join(process.cwd(), 'git context-'));
    const workdir = pathType === 'relative' ? path.relative(process.cwd(), checkoutDir) : checkoutDir;
    const commitDate = '2024-01-02T03:04:05Z';
    const git = (args: string[]) =>
      execFileSync('git', args, {
        cwd: checkoutDir,
        encoding: 'utf8',
        stdio: 'pipe',
        env: {...process.env, GIT_AUTHOR_DATE: commitDate, GIT_COMMITTER_DATE: commitDate}
      }).trim();

    try {
      git(['init', '--initial-branch=selected-checkout']);
      git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'initial']);
      git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'second']);
      const sha = git(['rev-parse', 'HEAD']);
      const ctx = await context.getContext(`git:${workdir}`, toolkit);
      expect(ctx.ref).toEqual('refs/heads/selected-checkout');
      expect(ctx.sha).toEqual(sha);
      expect(ctx.commitDate).toEqual(new Date(commitDate));
      expect(ctx.commitCount).toEqual(2);

      git(['checkout', '--detach', 'HEAD']);
      git(['branch', '-D', 'selected-checkout']);
      const detachedContext = await context.getContext(`git:${workdir}`, toolkit);
      expect(detachedContext.ref).toEqual('');
      expect(detachedContext.sha).toEqual(sha);
      expect(detachedContext.commitDate).toEqual(new Date(commitDate));
      expect(detachedContext.commitCount).toEqual(2);
      const meta = new Meta({...context.getInputs(), images: ['name/app'], tags: ['type=sha,format=long'], flavor: []}, detachedContext, repoFixture);
      expect(meta.getTags()).toEqual([`name/app:sha-${sha}`]);

      const shallowDir = path.join(checkoutDir, 'shallow');
      git(['init', shallowDir]);
      git(['-C', shallowDir, 'fetch', '--depth=1', '--no-tags', checkoutDir, sha]);
      git(['-C', shallowDir, 'checkout', '--detach', 'FETCH_HEAD']);
      const shallowContext = await context.getContext(`git:${shallowDir}`, toolkit);
      expect(shallowContext.commitCount).toEqual(1);
      const shallowMeta = new Meta({...context.getInputs(), images: ['name/app'], tags: ['type=raw,value=rev-{{commit_count}}'], flavor: []}, shallowContext, repoFixture);
      expect(shallowMeta.getTags()).toEqual(['name/app:rev-1']);
    } finally {
      fs.rmSync(checkoutDir, {recursive: true, force: true});
    }
  });
});

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}
