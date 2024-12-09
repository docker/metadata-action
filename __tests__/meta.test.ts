import {beforeEach, describe, expect, jest, test} from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import {Context} from '@actions/github/lib/context';
import {GitHub} from '@docker/actions-toolkit/lib/github';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit';
import {GitHubRepo} from '@docker/actions-toolkit/lib/types/github';

import {ContextSource, getContext, getInputs, Inputs} from '../src/context';
import {Meta, Version} from '../src/meta';

import repoFixture from './fixtures/repo.json';

jest.spyOn(GitHub.prototype, 'repoData').mockImplementation((): Promise<GitHubRepo> => {
  return <Promise<GitHubRepo>>(repoFixture as unknown);
});

jest.spyOn(global.Date.prototype, 'toISOString').mockImplementation(() => {
  return '2020-01-10T00:30:00.000Z';
});

jest.mock('moment-timezone', () => {
  return () => (jest.requireActual('moment-timezone') as typeof import('moment-timezone'))('2020-01-10T00:30:00.000Z');
});

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(process.env).forEach(function (key) {
    if (key !== 'GITHUB_TOKEN' && key.startsWith('GITHUB_')) {
      delete process.env[key];
    }
  });

  jest.spyOn(GitHub, 'context', 'get').mockImplementation((): Context => {
    //@ts-expect-error partial info
    return {
      ...new Context(),
      repo: {
        owner: 'docker',
        repo: 'repo'
      }
    };
  });
});

describe('isRawStatement', () => {
  // prettier-ignore
  test.each([
    ['{{ raw }}.{{ version }}', false],
    ['{{ version }},{{raw }.', false],
    ['{{ raw }}', true],
    ['{{ raw}}', true],
    ['{{raw}}', true],
  ])('given %p pattern', async (pattern: string, expected: boolean) => {
    expect(Meta.isRawStatement(pattern)).toEqual(expected);
  });
});

const tagsLabelsTest = async (name: string, envFile: string, inputs: Inputs, exVersion: Version, exTags: Array<string>, exLabels: Array<string>, exAnnotations: Array<string> | undefined) => {
  process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures', envFile)));
  const toolkit = new Toolkit();
  const repo = await toolkit.github.repoData();
  const meta = new Meta({...getInputs(), ...inputs}, await getContext(ContextSource.workflow, toolkit), repo);

  const version = meta.version;
  expect(version).toEqual(exVersion);

  const tags = meta.getTags();
  expect(tags).toEqual(exTags);

  const labels = meta.getLabels();
  expect(labels).toEqual(exLabels);

  const annotations = meta.getAnnotations();
  expect(annotations).toEqual(exAnnotations ?? exLabels);
};

describe('null', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'null01',
      'event_null.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: undefined,
        partial: [],
        latest: false
      } as Version,
      [],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version="
      ],
      undefined
    ],
    [
      'null02',
      'event_empty.env',
      {
        images: ['user/app'],
        tags: [
          `type=sha`,
          `type=raw,{{branch}}`,
        ]
      } as Inputs,
      {
        main: undefined,
        partial: [],
        latest: false
      } as Version,
      [],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version="
      ],
      undefined
    ],
  ])('given %p with %p event', tagsLabelsTest);
});

describe('push', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'push01',
      'event_push_dev.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: 'dev',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:dev'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=dev"
      ],
      undefined
    ],
    [
      'push02',
      'event_push_master.env',
      {
        images: ['user/app'],
        tags: [
          `type=edge`
        ],
      } as Inputs,
      {
        main: 'edge',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:edge'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=edge"
      ],
      undefined
    ],
    [
      'push03',
      'event_push_master.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: 'master',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:master'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=master"
      ],
      undefined
    ],
    [
      'push04',
      'event_workflow_dispatch.env',
      {
        images: ['user/app'],
        tags: [
          `type=edge`
        ],
      } as Inputs,
      {
        main: 'edge',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:edge'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=edge"
      ],
      undefined
    ],
    [
      'push05',
      'event_push_dev.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        main: 'dev',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:dev',
        'ghcr.io/user/app:dev'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=dev"
      ],
      undefined
    ],
    [
      'push06',
      'event_push_master.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=edge`
        ],
      } as Inputs,
      {
        main: 'edge',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:edge',
        'ghcr.io/user/app:edge'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=edge"
      ],
      undefined
    ],
    [
      'push07',
      'event_push_dev.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=sha`
        ],
      } as Inputs,
      {
        main: 'dev',
        partial: ['sha-860c190'],
        latest: false
      } as Version,
      [
        'org/app:dev',
        'org/app:sha-860c190',
        'ghcr.io/user/app:dev',
        'ghcr.io/user/app:sha-860c190'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=dev"
      ],
      undefined
    ],
    [
      'push08',
      'event_push_master.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=edge`,
          `type=sha`
        ],
      } as Inputs,
      {
        main: 'edge',
        partial: ['sha-2665741'],
        latest: false
      } as Version,
      [
        'org/app:edge',
        'org/app:sha-2665741',
        'ghcr.io/user/app:edge',
        'ghcr.io/user/app:sha-2665741'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=edge"
      ],
      undefined
    ],
    [
      'push09',
      'event_push_dev.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=edge,branch=dev`,
          `type=sha`
        ],
      } as Inputs,
      {
        main: 'edge',
        partial: ['sha-860c190'],
        latest: false
      } as Version,
      [
        'org/app:edge',
        'org/app:sha-860c190',
        'ghcr.io/user/app:edge',
        'ghcr.io/user/app:sha-860c190'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=edge"
      ],
      undefined
    ],
    [
      'push10',
      'event_push_master.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=edge,branch=dev`,
          `type=sha`
        ],
      } as Inputs,
      {
        main: 'sha-2665741',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:sha-2665741',
        'ghcr.io/user/app:sha-2665741'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-2665741"
      ],
      undefined
    ],
    [
      'push11',
      'event_push_invalidchars.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=edge`,
          `type=sha`
        ],
      } as Inputs,
      {
        main: 'sha-983315b',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:sha-983315b',
        'ghcr.io/user/app:sha-983315b'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=983315b5e8d46e46fc4c49869e85e7ee5fb289ba",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-983315b"
      ],
      undefined
    ],
    [
      'push12',
      'event_push_invalidchars.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{version}}`,
          `type=pep440,pattern={{version}}`,
          `type=edge`
        ],
      } as Inputs,
      {
        main: undefined,
        partial: [],
        latest: false
      } as Version,
      [],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=983315b5e8d46e46fc4c49869e85e7ee5fb289ba",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version="
      ],
      undefined
    ],
    [
      'push13',
      'event_push_master.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,priority=2000,event=branch`,
          `type=edge`
        ],
      } as Inputs,
      {
        main: 'master',
        partial: ['edge'],
        latest: false
      } as Version,
      [
        'user/app:master',
        'user/app:edge'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=master"
      ],
      undefined
    ],
    [
      'push14',
      'event_push_master.env',
      {
        images: ['user/app'],
        tags: [
          `type=semver,pattern={{version}},value=v1.2.3`,
          `type=pep440,pattern={{version}},value=v1.2.3`,
          `type=edge`
        ],
      } as Inputs,
      {
        main: '1.2.3',
        partial: ['edge'],
        latest: true
      } as Version,
      [
        'user/app:1.2.3',
        'user/app:edge',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.2.3"
      ],
      undefined
    ],
    [
      'push15',
      'event_push_master.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=v(.*),group=1,value=v1.2.3`,
          `type=edge`
        ],
      } as Inputs,
      {
        main: '1.2.3',
        partial: ['edge'],
        latest: true
      } as Version,
      [
        'user/app:1.2.3',
        'user/app:edge',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.2.3"
      ],
      undefined
    ],
    [
      'push16',
      'event_push_master.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,enable=false,pattern=v(.*),group=1,value=v1.2.3`,
          `type=edge`
        ],
      } as Inputs,
      {
        main: 'edge',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:edge'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=edge"
      ],
      undefined
    ],
    [
      'push17',
      'event_push_master.env',
      {
        images: ['user/app'],
        tags: [
          `type=raw,value=mytag-{{branch}}`,
          `type=raw,value=mytag-{{date 'YYYYMMDD'}}`,
          `type=raw,value=mytag-cd-{{commit_date 'YYYYMMDD'}}`,
          `type=raw,value=mytag-{{date 'YYYYMMDD-HHmmss' tz='Asia/Tokyo'}}`,
          `type=raw,value=mytag-tag-{{tag}}`,
          `type=raw,value=mytag-baseref-{{base_ref}}`,
          `type=raw,value=mytag-defbranch,enable={{is_default_branch}}`
        ],
      } as Inputs,
      {
        main: 'mytag-master',
        partial: [
          'mytag-20200110',
          "mytag-cd-20200110",
          'mytag-20200110-093000',
          'mytag-tag-',
          'mytag-baseref-',
          'mytag-defbranch'
        ],
        latest: false
      } as Version,
      [
        'user/app:mytag-master',
        'user/app:mytag-20200110',
        'user/app:mytag-cd-20200110',
        'user/app:mytag-20200110-093000',
        'user/app:mytag-tag-',
        'user/app:mytag-baseref-',
        'user/app:mytag-defbranch'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=mytag-master"
      ],
      undefined
    ],
    [
      'push18',
      'event_push_dev.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=sha,format=long`
        ],
      } as Inputs,
      {
        main: 'dev',
        partial: ['sha-860c1904a1ce19322e91ac35af1ab07466440c37'],
        latest: false
      } as Version,
      [
        'org/app:dev',
        'org/app:sha-860c1904a1ce19322e91ac35af1ab07466440c37',
        'ghcr.io/user/app:dev',
        'ghcr.io/user/app:sha-860c1904a1ce19322e91ac35af1ab07466440c37'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=dev"
      ],
      undefined
    ],
    [
      'push19',
      'event_push_dev.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=edge,branch=master`,
          `type=ref,event=branch,enable=false`,
          `type=sha,format=long`,
          `type=raw,value=defbranch,enable={{is_default_branch}}`
        ],
      } as Inputs,
      {
        main: 'sha-860c1904a1ce19322e91ac35af1ab07466440c37',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:sha-860c1904a1ce19322e91ac35af1ab07466440c37',
        'ghcr.io/user/app:sha-860c1904a1ce19322e91ac35af1ab07466440c37'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-860c1904a1ce19322e91ac35af1ab07466440c37"
      ],
      undefined
    ],
    [
      'push20',
      'event_push_dev.env',
      {
        images: [
          'org/app',
          'ghcr.io/user/app,enable=false'
        ],
        tags: [
          `type=edge,branch=master`,
          `type=ref,event=branch,enable=false`,
          `type=sha,format=long`
        ],
      } as Inputs,
      {
        main: 'sha-860c1904a1ce19322e91ac35af1ab07466440c37',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:sha-860c1904a1ce19322e91ac35af1ab07466440c37'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-860c1904a1ce19322e91ac35af1ab07466440c37"
      ],
      undefined
    ],
    [
      'push21',
      'event_push_master.env',
      {
        images: [] as string[],
        tags: [
          `type=raw,value=mytag-{{branch}}`,
          `type=raw,value=mytag-{{date 'YYYYMMDD'}}`,
          `type=raw,value=mytag-{{date 'YYYYMMDD-HHmmss' tz='Asia/Tokyo'}}`,
          `type=raw,value=mytag-src-{{commit_date 'YYYYMMDD'}}`,
          `type=raw,value=mytag-tag-{{tag}}`,
          `type=raw,value=mytag-baseref-{{base_ref}}`,
          `type=raw,value=mytag-defbranch,enable={{is_default_branch}}`
        ],
        labels: [
          "org.opencontainers.image.created={{commit_date 'YYYY-MM-DDTHH:mm:ss.SSS[Z]'}}"
        ]
      } as Inputs,
      {
        main: 'mytag-master',
        partial: [
          'mytag-20200110',
          'mytag-20200110-093000',
          'mytag-src-20200110',
          'mytag-tag-',
          'mytag-baseref-',
          'mytag-defbranch'
        ],
        latest: false
      } as Version,
      [
        'mytag-master',
        'mytag-20200110',
        'mytag-20200110-093000',
        'mytag-src-20200110',
        'mytag-tag-',
        'mytag-baseref-',
        'mytag-defbranch'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=mytag-master"
      ],
      undefined
    ]
  ])('given %p with %p event', tagsLabelsTest);
});

describe('tag', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'tag01',
      'event_tag_release1.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: 'release1',
        partial: [],
        latest: true
      } as Version,
      [
        'user/app:release1',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=release1"
      ],
      undefined
    ],
    [
      'tag02',
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: '20200110-RC2',
        partial: [],
        latest: true
      } as Version,
      [
        'user/app:20200110-RC2',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110-RC2"
      ],
      undefined
    ],
    [
      'tag03',
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=\\d{8}`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: '20200110',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:20200110'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110"
      ],
      undefined
    ],
    [
      'tag04',
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=(.*)-RC,group=1`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: '20200110',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:20200110'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110"
      ],
      undefined
    ],
    [
      'tag05',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,"pattern=\\d.\\d.\\d"`
        ]
      } as Inputs,
      {
        main: '1.1.1',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:latest',
        'ghcr.io/user/app:1.1.1',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1"
      ],
      undefined
    ],
    [
      'tag06',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,"pattern=^v(\\d.\\d.\\d)$",group=1`
        ]
      } as Inputs,
      {
        main: '1.1.1',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:latest',
        'ghcr.io/user/app:1.1.1',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1"
      ],
      undefined
    ],
    [
      'tag07',
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,"pattern=\\d.\\d.\\d-(alpha|beta).\\d+"`
        ]
      } as Inputs,
      {
        main: '2.0.8-beta.67',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:2.0.8-beta.67',
        'org/app:latest',
        'ghcr.io/user/app:2.0.8-beta.67',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=2.0.8-beta.67"
      ],
      undefined
    ],
    [
      'tag08',
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,"pattern=\\d.\\d"`
        ]
      } as Inputs,
      {
        main: '2.0',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:2.0',
        'org/app:latest',
        'ghcr.io/user/app:2.0',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=2.0"
      ],
      undefined
    ],
    [
      'tag09',
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,"pattern=v(.*)-beta.(.*)",group=1`,
          `type=match,"pattern=v(.*)-beta.(.*)",group=2`,
        ]
      } as Inputs,
      {
        main: '2.0.8',
        partial: ['67'],
        latest: true
      } as Version,
      [
        'org/app:2.0.8',
        'org/app:67',
        'org/app:latest',
        'ghcr.io/user/app:2.0.8',
        'ghcr.io/user/app:67',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=2.0.8"
      ],
      undefined
    ],
    [
      'tag10',
      'event_tag_sometag.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,"pattern=\\d.\\d"`
        ]
      } as Inputs,
      {
        main: undefined,
        partial: [],
        latest: false
      } as Version,
      [],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version="
      ],
      undefined
    ],
    [
      'tag11',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{version}}`,
          `type=semver,pattern={{major}}.{{minor}}`,
          `type=semver,pattern={{major}}`
        ]
      } as Inputs,
      {
        main: '1.1.1',
        partial: ['1.1', '1'],
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:1.1',
        'org/app:1',
        'org/app:latest',
        'ghcr.io/user/app:1.1.1',
        'ghcr.io/user/app:1.1',
        'ghcr.io/user/app:1',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1"
      ],
      undefined
    ],
    [
      'tag12',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{version}}`,
          `type=semver,pattern={{major}}.{{minor}}.{{patch}}`
        ]
      } as Inputs,
      {
        main: '1.1.1',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:latest',
        'ghcr.io/user/app:1.1.1',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1"
      ],
      undefined
    ],
    [
      'tag13',
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{major}}.{{minor}}`,
          `type=semver,pattern={{major}}`
        ]
      } as Inputs,
      {
        main: '2.0.8-beta.67',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:2.0.8-beta.67',
        'ghcr.io/user/app:2.0.8-beta.67'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=2.0.8-beta.67"
      ],
      undefined
    ],
    [
      'tag14',
      'event_tag_sometag.env',
      {
        images: ['ghcr.io/user/app'],
        tags: [
          `type=ref,event=tag`,
          `type=semver,pattern={{version}}`,
          `type=semver,pattern={{major}}.{{minor}}`,
          `type=semver,pattern={{major}}`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: 'sometag',
        partial: [],
        latest: false
      } as Version,
      [
        'ghcr.io/user/app:sometag'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sometag"
      ],
      undefined
    ],
    [
      'tag15',
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=raw,priority=2000,foo`,
          `type=semver,pattern={{version}}`,
          `type=match,"pattern=\\d.\\d"`
        ]
      } as Inputs,
      {
        main: 'foo',
        partial: ['2.0.8-beta.67', '2.0'],
        latest: false
      } as Version,
      [
        'org/app:foo',
        'org/app:2.0.8-beta.67',
        'org/app:2.0',
        'ghcr.io/user/app:foo',
        'ghcr.io/user/app:2.0.8-beta.67',
        'ghcr.io/user/app:2.0'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=foo"
      ],
      undefined
    ],
    [
      'tag16',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=raw,priority=2000,foo`,
          `type=ref,event=tag`,
          `type=edge`
        ]
      } as Inputs,
      {
        main: 'foo',
        partial: ['v1.1.1'],
        latest: false
      } as Version,
      [
        'org/app:foo',
        'org/app:v1.1.1',
        'ghcr.io/user/app:foo',
        'ghcr.io/user/app:v1.1.1',
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=foo"
      ],
      undefined
    ],
    [
      'tag17',
      'event_tag_p1-v1.0.0.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,"pattern=/^v(\\d.\\d.\\d)$/ig",group=1`,
          `type=match,pattern=\\d.\\d.\\d`,
          `type=match,pattern=\\d.\\d`,
          `type=ref,event=pr`,
          `type=sha`
        ]
      } as Inputs,
      {
        main: '1.0.0',
        partial: ['1.0', 'sha-860c190'],
        latest: true
      } as Version,
      [
        'org/app:1.0.0',
        'org/app:1.0',
        'org/app:sha-860c190',
        'org/app:latest',
        'ghcr.io/user/app:1.0.0',
        'ghcr.io/user/app:1.0',
        'ghcr.io/user/app:sha-860c190',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.0.0"
      ],
      undefined
    ],
    [
      'tag18',
      'event_tag_p1-v1.0.0.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,pattern=p1/v(\\d.\\d.\\d),group=1`,
          `type=match,pattern=p1/v(\\d.\\d),group=1`,
          `type=match,pattern=p1/v(\\d.\\d),group=3`,
          `type=ref,event=pr`,
          `type=sha`
        ]
      } as Inputs,
      {
        main: '1.0.0',
        partial: ['1.0', 'sha-860c190'],
        latest: true
      } as Version,
      [
        'org/app:1.0.0',
        'org/app:1.0',
        'org/app:sha-860c190',
        'org/app:latest',
        'ghcr.io/user/app:1.0.0',
        'ghcr.io/user/app:1.0',
        'ghcr.io/user/app:sha-860c190',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.0.0"
      ],
      undefined
    ],
    [
      'tag19',
      'event_tag_p1-v1.0.0.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,pattern=p1/v(\\d.\\d.\\d),group=1`,
          `type=match,pattern=p1/v(\\d.\\d),group=1,suffix=`,
          `type=ref,event=pr`,
          `type=sha`
        ],
        flavor: [
          `suffix=-dev`
        ]
      } as Inputs,
      {
        main: '1.0.0-dev',
        partial: ['1.0', 'sha-860c190-dev'],
        latest: true
      } as Version,
      [
        'org/app:1.0.0-dev',
        'org/app:1.0',
        'org/app:sha-860c190-dev',
        'org/app:latest',
        'ghcr.io/user/app:1.0.0-dev',
        'ghcr.io/user/app:1.0',
        'ghcr.io/user/app:sha-860c190-dev',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.0.0-dev"
      ],
      undefined
    ],
    [
      'tag20',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=raw,{{tag}}-{{sha}}-foo`,
          `type=raw,{{base_ref}}-foo`,
          `type=raw,defbranch-foo,enable={{is_default_branch}}`
        ]
      } as Inputs,
      {
        main: 'v1.1.1-860c190-foo',
        partial: [
          'master-foo'
        ],
        latest: false
      } as Version,
      [
        'org/app:v1.1.1-860c190-foo',
        'org/app:master-foo',
        'ghcr.io/user/app:v1.1.1-860c190-foo',
        'ghcr.io/user/app:master-foo'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v1.1.1-860c190-foo"
      ],
      undefined
    ],
    [
      'tag21',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{version}}`,
          `type=semver,pattern={{major}}.{{minor}}.{{patch}}`
        ],
        flavor: [
          `suffix=-dev,onlatest=true`
        ]
      } as Inputs,
      {
        main: '1.1.1-dev',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:1.1.1-dev',
        'org/app:latest-dev',
        'ghcr.io/user/app:1.1.1-dev',
        'ghcr.io/user/app:latest-dev'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1-dev"
      ],
      undefined
    ],
    [
      'tag22',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{version}}`,
          `type=semver,pattern={{major}}.{{minor}}.{{patch}}`
        ],
        flavor: [
          `prefix=foo-,onlatest=true`,
          `suffix=-dev,onlatest=true`
        ]
      } as Inputs,
      {
        main: 'foo-1.1.1-dev',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:foo-1.1.1-dev',
        'org/app:foo-latest-dev',
        'ghcr.io/user/app:foo-1.1.1-dev',
        'ghcr.io/user/app:foo-latest-dev'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=foo-1.1.1-dev"
      ],
      undefined
    ],
    [
      'tag23',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app'],
        tags: [
          `type=pep440,pattern={{raw}}`,
          `type=pep440,pattern={{major}}.{{minor}}`
        ]
      } as Inputs,
      {
        main: 'v1.1.1',
        partial: ['1.1'],
        latest: true
      } as Version,
      [
        'org/app:v1.1.1',
        'org/app:1.1',
        'org/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v1.1.1"
      ],
      undefined
    ],
    [
      'tag24',
      'event_tag_1.2.env',
      {
        images: ['org/app'],
        tags: [
          `type=pep440,pattern={{version}}`,
          `type=pep440,pattern={{major}}.{{minor}}`
        ]
      } as Inputs,
      {
        main: '1.2',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:1.2',
        'org/app:latest',
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.2"
      ],
      undefined
    ],
    [
      'tag25',
      'event_tag_1.1beta2.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=pep440,pattern={{major}}.{{minor}}`,
          `type=pep440,pattern={{major}}`
        ]
      } as Inputs,
      {
        main: '1.1b2',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:1.1b2',
        'ghcr.io/user/app:1.1b2'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1b2"
      ],
      undefined
    ],
    [
      'tag26',
      'event_tag_1.0dev4.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=pep440,pattern={{major}}.{{minor}}`,
          `type=pep440,pattern={{major}}`
        ]
      } as Inputs,
      {
        main: '1.0.dev4',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:1.0.dev4',
        'ghcr.io/user/app:1.0.dev4'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.0.dev4"
      ],
      undefined
    ],
    [
      'tag27',
      'event_tag_1.2.3rc2.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=pep440,pattern={{raw}}`,
          `type=pep440,pattern={{version}}`,
          `type=pep440,pattern={{major}}.{{minor}}`,
          `type=pep440,pattern={{major}}`
        ]
      } as Inputs,
      {
        main: '1.2.3rc2',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:1.2.3rc2',
        'ghcr.io/user/app:1.2.3rc2'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.2.3rc2"
      ],
      undefined
    ],
    [
      'tag28',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app'],
        tags: [
          `type=pep440,pattern={{version}}`,
          `type=pep440,pattern={{major}}.{{minor}}.{{patch}}`,
          `type=pep440,pattern={{major}}.{{minor}}`,
          `type=pep440,pattern={{major}}`
        ]
      } as Inputs,
      {
        main: '1.1.1',
        partial: [
          "1.1",
          "1"
        ],
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:1.1',
        'org/app:1',
        'org/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1"
      ],
      undefined
    ],
    [
      'tag29',
      'event_tag_1.2post1.env',
      {
        images: ['org/app'],
        tags: [
          `type=pep440,pattern={{version}}`,
          `type=pep440,pattern={{major}}.{{minor}}`,
          `type=pep440,pattern={{major}}`
        ]
      } as Inputs,
      {
        main: '1.2.post1',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:1.2.post1'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.2.post1"
      ],
      undefined
    ],
    [
      'tag30',
      'event_tag_sometag.env',
      {
        images: ['ghcr.io/user/app'],
        tags: [
          `type=ref,event=tag`,
          `type=pep440,pattern={{version}}`,
          `type=pep440,pattern={{major}}.{{minor}}`,
          `type=pep440,pattern={{major}}`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: 'sometag',
        partial: [],
        latest: false
      } as Version,
      [
        'ghcr.io/user/app:sometag'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sometag"
      ],
      undefined
    ],
    [
      'tag31',
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{raw}}`
        ]
      } as Inputs,
      {
        main: 'v2.0.8-beta.67',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:v2.0.8-beta.67',
        'ghcr.io/user/app:v2.0.8-beta.67'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v2.0.8-beta.67"
      ],
      undefined
    ],
    [
      'tag32',
      'event_tag_v1.2.3rc2.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=pep440,pattern={{raw}}`,
          `type=pep440,pattern={{major}}.{{minor}}`
        ]
      } as Inputs,
      {
        main: 'v1.2.3rc2',
        partial: ['1.2.3rc2'],
        latest: false
      } as Version,
      [
        'org/app:v1.2.3rc2',
        'org/app:1.2.3rc2',
        'ghcr.io/user/app:v1.2.3rc2',
        'ghcr.io/user/app:1.2.3rc2'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v1.2.3rc2"
      ],
      undefined
    ],
    [
      'tag33',
      'event_tag_v1.1.1.env',
      {
        images: [] as string[],
        tags: [
          `type=pep440,pattern={{version}}`,
          `type=pep440,pattern={{major}}.{{minor}}.{{patch}}`,
          `type=pep440,pattern={{major}}.{{minor}}`,
          `type=pep440,pattern={{major}}`
        ]
      } as Inputs,
      {
        main: '1.1.1',
        partial: [
          "1.1",
          "1"
        ],
        latest: true
      } as Version,
      [
        '1.1.1',
        '1.1',
        '1',
        'latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1"
      ],
      undefined
    ]
  ])('given %p with %p event', tagsLabelsTest);
});

describe('latest', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'latest01',
      'event_tag_release1.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,"pattern=^release\\d{1,2}"`
        ],
      } as Inputs,
      {
        main: 'release1',
        partial: [],
        latest: true,
      } as Version,
      [
        'user/app:release1',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=release1"
      ],
      undefined
    ],
    [
      'latest02',
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,"pattern=^\\d+-RC\\d{1,2}"`
        ]
      } as Inputs,
      {
        main: '20200110-RC2',
        partial: [],
        latest: true
      } as Version,
      [
        'user/app:20200110-RC2',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110-RC2"
      ],
      undefined
    ],
    [
      'latest03',
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=\\d{8}`
        ]
      } as Inputs,
      {
        main: '20200110',
        partial: [],
        latest: true
      } as Version,
      [
        'user/app:20200110',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110"
      ],
      undefined
    ],
    [
      'latest04',
      'event_tag_v1.1.1.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,"pattern=\\d.\\d.\\d"`
        ]
      } as Inputs,
      {
        main: '1.1.1',
        partial: [],
        latest: true
      } as Version,
      [
        'user/app:1.1.1',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1"
      ],
      undefined
    ],
    [
      'latest05',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        main: 'v1.1.1',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:v1.1.1',
        'org/app:latest',
        'ghcr.io/user/app:v1.1.1',
        'ghcr.io/user/app:latest',
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v1.1.1"
      ],
      undefined
    ],
    [
      'latest06',
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=match,"pattern=\\d.\\d.\\d"`
        ]
      } as Inputs,
      {
        main: '2.0.8',
        partial: [],
        latest: true
      } as Version,
      [
        'org/app:2.0.8',
        'org/app:latest',
        'ghcr.io/user/app:2.0.8',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=2.0.8"
      ],
      undefined
    ],
    [
      'latest07',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=tag`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: 'v1.1.1',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:v1.1.1',
        'ghcr.io/user/app:v1.1.1',
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v1.1.1"
      ],
      undefined
    ],
    [
      'latest08',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/MyUSER/MyApp'],
        tags: [
          `type=ref,event=tag`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: 'v1.1.1',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:v1.1.1',
        'ghcr.io/myuser/myapp:v1.1.1',
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v1.1.1"
      ],
      undefined
    ],
    [
      'latest09',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/MyUSER/MyApp'],
        tags: [
          `type=ref,event=tag`
        ],
        flavor: [
          `latest=false`
        ],
        labels: [
          "maintainer=CrazyMax",
          `org.opencontainers.image.description=this is a "good" example`,
          "org.opencontainers.image.title=MyCustomTitle",
          "org.opencontainers.image.vendor=MyCompany",
        ],
        annotations: [
          "maintainer=Foo",
          `org.opencontainers.image.description=this is a "bad" example`,
          "org.opencontainers.image.title=MyNotTitle",
          "org.opencontainers.image.vendor=MyNotCompany",
        ]
      } as Inputs,
      {
        main: 'v1.1.1',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:v1.1.1',
        'ghcr.io/myuser/myapp:v1.1.1',
      ],
      [
        "maintainer=CrazyMax",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        `org.opencontainers.image.description=this is a "good" example`,
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=MyCustomTitle",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.vendor=MyCompany",
        "org.opencontainers.image.version=v1.1.1"
      ],
      [
        "maintainer=Foo",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        `org.opencontainers.image.description=this is a "bad" example`,
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=MyNotTitle",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.vendor=MyNotCompany",
        "org.opencontainers.image.version=v1.1.1"
      ]
    ],
    [
      'latest10',
      'event_tag_v2.0.8-beta.67.env',
      {
        images: [] as string[],
        tags: [
          `type=match,"pattern=\\d.\\d.\\d"`
        ]
      } as Inputs,
      {
        main: '2.0.8',
        partial: [],
        latest: true
      } as Version,
      [
        '2.0.8',
        'latest',
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=2.0.8"
      ],
      undefined
    ]
  ])('given %p with %p event', tagsLabelsTest);
});

describe('pr', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'pr01',
      'event_pull_request.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: 'pr-15',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:pr-15'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=a9c8c5828b91be19d9728548b24759e352367ef1",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15"
      ],
      undefined
    ],
    [
      'pr02',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        main: 'pr-15',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:pr-15',
        'ghcr.io/user/app:pr-15'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=a9c8c5828b91be19d9728548b24759e352367ef1",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15"
      ],
      undefined
    ],
    [
      'pr03',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=pr`,
          `type=sha`
        ]
      } as Inputs,
      {
        main: 'pr-15',
        partial: ['sha-a9c8c58'],
        latest: false
      } as Version,
      [
        'org/app:pr-15',
        'org/app:sha-a9c8c58',
        'ghcr.io/user/app:pr-15',
        'ghcr.io/user/app:sha-a9c8c58'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=a9c8c5828b91be19d9728548b24759e352367ef1",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15"
      ],
      undefined
    ],
    [
      'pr04',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=sha,priority=2000`,
          `type=ref,event=pr`
        ]
      } as Inputs,
      {
        main: 'sha-a9c8c58',
        partial: ['pr-15'],
        latest: false
      } as Version,
      [
        'org/app:sha-a9c8c58',
        'org/app:pr-15',
        'ghcr.io/user/app:sha-a9c8c58',
        'ghcr.io/user/app:pr-15'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=a9c8c5828b91be19d9728548b24759e352367ef1",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-a9c8c58"
      ],
      undefined
    ],
    [
      'pr05',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=pr`
        ],
        flavor: [
          `prefix=glo-`,
          `suffix=-bal`
        ]
      } as Inputs,
      {
        main: 'pr-15-bal',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:pr-15-bal',
        'ghcr.io/user/app:pr-15-bal'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=a9c8c5828b91be19d9728548b24759e352367ef1",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15-bal"
      ],
      undefined
    ],
    [
      'pr06',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=pr,prefix=`
        ],
        flavor: [
          `prefix=glo-`,
          `suffix=-bal`
        ]
      } as Inputs,
      {
        main: '15-bal',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:15-bal',
        'ghcr.io/user/app:15-bal'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=a9c8c5828b91be19d9728548b24759e352367ef1",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=15-bal"
      ],
      undefined
    ],
    [
      'pr07',
      'event_pull_request_target.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=sha,priority=2000`,
          `type=ref,event=pr`
        ]
      } as Inputs,
      {
        main: 'sha-2665741',
        partial: ['pr-15'],
        latest: false
      } as Version,
      [
        'org/app:sha-2665741',
        'org/app:pr-15',
        'ghcr.io/user/app:sha-2665741',
        'ghcr.io/user/app:pr-15'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-2665741"
      ],
      undefined
    ],
    [
      'pr08',
      'event_pull_request_target.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=pr,prefix=`
        ],
        flavor: [
          `prefix=glo-`,
          `suffix=-bal`
        ]
      } as Inputs,
      {
        main: '15-bal',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:15-bal',
        'ghcr.io/user/app:15-bal'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=15-bal"
      ],
      undefined
    ],
    [
      'pr09',
      'event_pull_request_target.env',
      {
        images: ['org/app'],
        tags: [
          `type=ref,event=tag`,
          `type=ref,event=pr`,
          `type=ref,event=branch`,
          `type=sha`,
          `type=sha,format=long`
        ]
      } as Inputs,
      {
        main: 'pr-15',
        partial: [
          'sha-2665741',
          'sha-266574110acf203503badf966df2ea24b5d732d7'
        ],
        latest: false
      } as Version,
      [
        'org/app:pr-15',
        'org/app:sha-2665741',
        'org/app:sha-266574110acf203503badf966df2ea24b5d732d7'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15"
      ],
      undefined
    ],
    [
      'pr10',
      'event_pull_request_target.env',
      {
        images: ['org/app'],
        tags: [
          `type=raw,value=mytag-{{base_ref}}`,
          `type=raw,mytag-defbranch,enable={{is_default_branch}}`
        ]
      } as Inputs,
      {
        main: 'mytag-master',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:mytag-master'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=266574110acf203503badf966df2ea24b5d732d7",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=mytag-master"
      ],
      undefined
    ],
    [
      'pr11',
      'event_pull_request.env',
      {
        images: ['org/app'],
        tags: [
          `type=raw,value=mytag-{{base_ref}}`,
          `type=raw,mytag-defbranch,enable={{is_default_branch}}`
        ]
      } as Inputs,
      {
        main: 'mytag-master',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:mytag-master'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=a9c8c5828b91be19d9728548b24759e352367ef1",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=mytag-master"
      ],
      undefined
    ],
    [
      'pr12',
      'event_pull_request.env',
      {
        images: ['org/app'],
        tags: [
          `type=raw,value={{commit_date YYYY-MM-DD-HHmmSS}}`,
        ]
      } as Inputs,
      {
        main: "2020-01-10T00-30-00Z",
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:2020-01-10T00-30-00Z'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=a9c8c5828b91be19d9728548b24759e352367ef1",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=2020-01-10T00-30-00Z"
      ],
      undefined
    ],
  ])('given %p with %p event', tagsLabelsTest);
});

describe('pr-head-sha', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'pr01',
      'event_pull_request.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: 'pr-15',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:pr-15'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15"
      ]
    ],
    [
      'pr02',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        main: 'pr-15',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:pr-15',
        'ghcr.io/user/app:pr-15'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15"
      ]
    ],
    [
      'pr03',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=pr`,
          `type=sha`
        ]
      } as Inputs,
      {
        main: 'pr-15',
        partial: ['sha-3370e22'],
        latest: false
      } as Version,
      [
        'org/app:pr-15',
        'org/app:sha-3370e22',
        'ghcr.io/user/app:pr-15',
        'ghcr.io/user/app:sha-3370e22'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15"
      ]
    ],
    [
      'pr04',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=sha,priority=2000`,
          `type=ref,event=pr`
        ]
      } as Inputs,
      {
        main: 'sha-3370e22',
        partial: ['pr-15'],
        latest: false
      } as Version,
      [
        'org/app:sha-3370e22',
        'org/app:pr-15',
        'ghcr.io/user/app:sha-3370e22',
        'ghcr.io/user/app:pr-15'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-3370e22"
      ]
    ],
    [
      'pr05',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=pr`
        ],
        flavor: [
          `prefix=glo-`,
          `suffix=-bal`
        ]
      } as Inputs,
      {
        main: 'pr-15-bal',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:pr-15-bal',
        'ghcr.io/user/app:pr-15-bal'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15-bal"
      ]
    ],
    [
      'pr06',
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=pr,prefix=`
        ],
        flavor: [
          `prefix=glo-`,
          `suffix=-bal`
        ]
      } as Inputs,
      {
        main: '15-bal',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:15-bal',
        'ghcr.io/user/app:15-bal'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=15-bal"
      ]
    ],
    [
      'pr07',
      'event_pull_request_target.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=sha,priority=2000`,
          `type=ref,event=pr`
        ]
      } as Inputs,
      {
        main: 'sha-3370e22',
        partial: ['pr-15'],
        latest: false
      } as Version,
      [
        'org/app:sha-3370e22',
        'org/app:pr-15',
        'ghcr.io/user/app:sha-3370e22',
        'ghcr.io/user/app:pr-15'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-3370e22"
      ]
    ],
    [
      'pr08',
      'event_pull_request_target.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=ref,event=pr,prefix=`
        ],
        flavor: [
          `prefix=glo-`,
          `suffix=-bal`
        ]
      } as Inputs,
      {
        main: '15-bal',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:15-bal',
        'ghcr.io/user/app:15-bal'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=15-bal"
      ]
    ],
    [
      'pr09',
      'event_pull_request_target.env',
      {
        images: ['org/app'],
        tags: [
          `type=ref,event=tag`,
          `type=ref,event=pr`,
          `type=ref,event=branch`,
          `type=sha`,
          `type=sha,format=long`
        ]
      } as Inputs,
      {
        main: 'pr-15',
        partial: [
          'sha-3370e22',
          'sha-3370e228f2209994d57af4427fe64e71bb79ac96'
        ],
        latest: false
      } as Version,
      [
        'org/app:pr-15',
        'org/app:sha-3370e22',
        'org/app:sha-3370e228f2209994d57af4427fe64e71bb79ac96'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=pr-15"
      ]
    ],
    [
      'pr10',
      'event_pull_request_target.env',
      {
        images: ['org/app'],
        tags: [
          `type=raw,value=mytag-{{base_ref}}`,
          `type=raw,mytag-defbranch,enable={{is_default_branch}}`
        ]
      } as Inputs,
      {
        main: 'mytag-master',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:mytag-master'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=mytag-master"
      ]
    ],
    [
      'pr11',
      'event_pull_request.env',
      {
        images: ['org/app'],
        tags: [
          `type=raw,value=mytag-{{base_ref}}`,
          `type=raw,mytag-defbranch,enable={{is_default_branch}}`
        ]
      } as Inputs,
      {
        main: 'mytag-master',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:mytag-master'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=mytag-master"
      ]
    ],
    [
      'pr12',
      'event_pull_request.env',
      {
        images: ['org/app'],
        tags: [
          `type=raw,value=src-{{commit_date YYYY-MM-DD}}`,
        ]
      } as Inputs,
      {
        main: "src-2020-01-10T00-30-00Z",
        partial: [],
        latest: false
      } as Version,
      [
        "org/app:src-2020-01-10T00-30-00Z",
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=3370e228f2209994d57af4427fe64e71bb79ac96",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=src-2020-01-10T00-30-00Z",
      ]
    ],
  ])('given %p with %p event', async (name: string, envFile: string, inputs: Inputs, exVersion: Version, exTags: Array<string>, exLabelsAnnotations: Array<string>) => {
    process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures', envFile)));
    process.env.DOCKER_METADATA_PR_HEAD_SHA = 'true';

    const toolkit = new Toolkit();
    const repo = await toolkit.github.repoData();
    const meta = new Meta({...getInputs(), ...inputs}, await getContext(ContextSource.workflow, toolkit), repo);

    const version = meta.version;
    expect(version).toEqual(exVersion);

    const tags = meta.getTags();
    expect(tags).toEqual(exTags);

    const labels = meta.getLabels();
    expect(labels).toEqual(exLabelsAnnotations);

    const annotations = meta.getAnnotations();
    expect(annotations).toEqual(exLabelsAnnotations);
  });
});

describe('schedule', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'schedule01',
      'event_schedule.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: 'nightly',
        partial: ['master'],
        latest: false
      } as Version,
      [
        'user/app:nightly',
        'user/app:master'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=nightly"
      ],
      undefined
    ],
    [
      'schedule02',
      'event_schedule.env',
      {
        images: ['user/app'],
        tags: [
          `type=schedule,pattern={{date 'YYYYMMDD'}}`,
          `type=schedule,pattern=source-date-{{commit_date 'YYYY-MM-DD'}}`
        ]
      } as Inputs,
      {
        main: '20200110',
        partial: [
          "source-date-2020-01-10",
        ],
        latest: false
      } as Version,
      [
        'user/app:20200110',
        'user/app:source-date-2020-01-10'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110"
      ],
      undefined
    ],
    [
      'schedule03',
      'event_schedule.env',
      {
        images: ['user/app'],
        tags: [
          `type=schedule,pattern={{date 'YYYYMMDD-HHmmss'}}`
        ]
      } as Inputs,
      {
        main: '20200110-003000',
        partial: [],
        latest: false
      } as Version,
      [
        'user/app:20200110-003000'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110-003000"
      ],
      undefined
    ],
    [
      'schedule04',
      'event_schedule.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        main: 'nightly',
        partial: ['master'],
        latest: false
      } as Version,
      [
        'org/app:nightly',
        'org/app:master',
        'ghcr.io/user/app:nightly',
        'ghcr.io/user/app:master'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=nightly"
      ],
      undefined
    ],
    [
      'schedule05',
      'event_schedule.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=schedule`,
          `type=sha`
        ]
      } as Inputs,
      {
        main: 'nightly',
        partial: ['sha-860c190'],
        latest: false
      } as Version,
      [
        'org/app:nightly',
        'org/app:sha-860c190',
        'ghcr.io/user/app:nightly',
        'ghcr.io/user/app:sha-860c190'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=nightly"
      ],
      undefined
    ],
    [
      'schedule06',
      'event_schedule.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=schedule`,
          `type=sha,priority=2000`,
          `type=raw,value=defbranch,enable={{is_default_branch}}`
        ]
      } as Inputs,
      {
        main: 'sha-860c190',
        partial: [
          'nightly',
          'defbranch'
        ],
        latest: false
      } as Version,
      [
        'org/app:sha-860c190',
        'org/app:nightly',
        'org/app:defbranch',
        'ghcr.io/user/app:sha-860c190',
        'ghcr.io/user/app:nightly',
        'ghcr.io/user/app:defbranch'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=sha-860c190"
      ],
      undefined
    ],
    [
      'schedule07',
      'event_schedule.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=schedule`,
        ],
        flavor: [
          `prefix=glo-`,
          `suffix=-bal`
        ]
      } as Inputs,
      {
        main: 'glo-nightly-bal',
        partial: [],
        latest: false
      } as Version,
      [
        'org/app:glo-nightly-bal',
        'ghcr.io/user/app:glo-nightly-bal'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=glo-nightly-bal"
      ],
      undefined
    ],
    [
      'schedule08',
      'event_schedule.env',
      {
        images: ['user/app'],
        tags: [
          `type=schedule,pattern={{date 'YYYYMMDD-HHmmss' tz='Asia/Tokyo'}}`,
          `type=schedule,pattern=src-{{commit_date 'YYYYMMDD-HHmmss' tz='Asia/Tokyo'}}`,
        ]
      } as Inputs,
      {
        main: '20200110-093000',
        partial: [
          "src-20200110-093000",
        ],
        latest: false
      } as Version,
      [
        'user/app:20200110-093000',
        'user/app:src-20200110-093000'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110-093000"
      ],
      undefined
    ],
  ])('given %p with %p event', tagsLabelsTest);
});

describe('release', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'release01',
      'event_release_created.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        main: 'v1.1.1',
        partial: [],
        latest: true
      } as Version,
      [
        'user/app:v1.1.1',
        'user/app:latest',
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v1.1.1"
      ],
      undefined
    ],
    [
      'release02',
      'event_release_created.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=tag`,
          `type=raw,value=baseref-{{base_ref}}`,
          `type=raw,value=defbranch,enable={{is_default_branch}}`
        ]
      } as Inputs,
      {
        main: 'v1.1.1',
        partial: [
          'baseref-'
        ],
        latest: true
      } as Version,
      [
        'user/app:v1.1.1',
        'user/app:baseref-',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=v1.1.1"
      ],
      undefined
    ],
    [
      'release03',
      'event_release_created.env',
      {
        images: ['user/app'],
        tags: [
          `type=raw,value=src-{{commit_date 'YYYYMMDD-HHmmss'}}`,
          `type=raw,value={{date 'YYYYMMDD-HHmmss'}}`,
        ]
      } as Inputs,
      {
      "main": "src-20200110-003000",
        partial: [
        "20200110-003000",
        ],
"latest": false,
      } as Version,
      [
        "user/app:src-20200110-003000",
        "user/app:20200110-003000",
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
      "org.opencontainers.image.version=src-20200110-003000",
      ],
      undefined
    ]
  ])('given %s with %p event', tagsLabelsTest);
});

describe('raw', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'raw01',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ]
      } as Inputs,
      {
        main: 'dev',
        partial: ['my', 'custom', 'tags'],
        latest: false
      } as Version,
      [
        'user/app:dev',
        'user/app:my',
        'user/app:custom',
        'user/app:tags'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=dev"
      ],
      undefined
    ],
    [
      'raw02',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`
        ]
      } as Inputs,
      {
        main: 'dev',
        partial: ['my'],
        latest: false
      } as Version,
      [
        'user/app:dev',
        'user/app:my'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=dev"
      ],
      undefined
    ],
    [
      'raw03',
      'event_tag_release1.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=tag`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ]
      } as Inputs,
      {
        main: 'release1',
        partial: ['my', 'custom', 'tags'],
        latest: true
      } as Version,
      [
        'user/app:release1',
        'user/app:my',
        'user/app:custom',
        'user/app:tags',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=release1"
      ],
      undefined
    ],
    [
      'raw04',
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=\\d{8}`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: '20200110',
        partial: ['my', 'custom', 'tags'],
        latest: false
      } as Version,
      [
        'user/app:20200110',
        'user/app:my',
        'user/app:custom',
        'user/app:tags'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=20200110"
      ],
      undefined
    ],
    [
      'raw05',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{version}}`,
          `type=semver,pattern={{major}}.{{minor}}`,
          `type=semver,pattern={{major}}`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ]
      } as Inputs,
      {
        main: '1.1.1',
        partial: ['1.1', '1', 'my', 'custom', 'tags'],
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:1.1',
        'org/app:1',
        'org/app:my',
        'org/app:custom',
        'org/app:tags',
        'org/app:latest',
        'ghcr.io/user/app:1.1.1',
        'ghcr.io/user/app:1.1',
        'ghcr.io/user/app:1',
        'ghcr.io/user/app:my',
        'ghcr.io/user/app:custom',
        'ghcr.io/user/app:tags',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=1.1.1"
      ],
      undefined
    ],
    [
      'raw06',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ]
      } as Inputs,
      {
        main: 'my',
        partial: ['custom', 'tags'],
        latest: false
      } as Version,
      [
        'org/app:my',
        'org/app:custom',
        'org/app:tags',
        'ghcr.io/user/app:my',
        'ghcr.io/user/app:custom',
        'ghcr.io/user/app:tags'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=my"
      ],
      undefined
    ],
    [
      'raw07',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,priority=90,event=branch`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        flavor: [
          `latest=true`
        ]
      } as Inputs,
      {
        main: 'my',
        partial: ['custom', 'tags', 'dev'],
        latest: true
      } as Version,
      [
        'user/app:my',
        'user/app:custom',
        'user/app:tags',
        'user/app:dev',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=my"
      ],
      undefined
    ],
    [
      'raw08',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=\\d{8}`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: 'my',
        partial: ['custom', 'tags'],
        latest: false
      } as Version,
      [
        'user/app:my',
        'user/app:custom',
        'user/app:tags'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=my"
      ],
      undefined
    ],
    [
      'raw09',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=\\d{8}`,
          `type=raw,my,prefix=foo-,suffix=-bar`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        flavor: [
          `latest=false`,
          `prefix=glo-`,
          `suffix=-bal`
        ]
      } as Inputs,
      {
        main: 'foo-my-bar',
        partial: ['glo-custom-bal', 'glo-tags-bal'],
        latest: false
      } as Version,
      [
        'user/app:foo-my-bar',
        'user/app:glo-custom-bal',
        'user/app:glo-tags-bal'
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=foo-my-bar"
      ],
      undefined
    ],
    [
      'raw10',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=raw,foo`,
          `type=raw,bar,enable=false`,
          `type=raw,baz,enable=true`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        main: 'foo',
        partial: ['baz'],
        latest: false
      } as Version,
      [
        'user/app:foo',
        'user/app:baz',
      ],
      [
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.licenses=MIT",
        "org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version=foo"
      ],
      undefined
    ],
  ])('given %p wth %p event', tagsLabelsTest);
});

describe('json', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'json01',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        labels: [
          "invalid",
          "foo="
        ]
      } as Inputs,
      {
        "tags": [
          "user/app:dev",
          "user/app:my",
          "user/app:custom",
          "user/app:tags"
        ],
        "labels": {
          "foo": "",
          "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
          "org.opencontainers.image.description": "This your first repo!",
          "org.opencontainers.image.licenses": "MIT",
          "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
          "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.title": "Hello-World",
          "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.version": "dev"
        },
        "annotations": [
          "manifest:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
          "manifest:org.opencontainers.image.description=This your first repo!",
          "manifest:org.opencontainers.image.licenses=MIT",
          "manifest:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
          "manifest:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.title=Hello-World",
          "manifest:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.version=dev"
        ]
      }
    ],
    [
      'json02',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`
        ]
      } as Inputs,
      {
        "tags": [
          "user/app:dev",
          "user/app:my",
        ],
        "labels": {
          "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
          "org.opencontainers.image.description": "This your first repo!",
          "org.opencontainers.image.licenses": "MIT",
          "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
          "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.title": "Hello-World",
          "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.version": "dev"
        },
        "annotations": [
          "manifest:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
          "manifest:org.opencontainers.image.description=This your first repo!",
          "manifest:org.opencontainers.image.licenses=MIT",
          "manifest:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
          "manifest:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.title=Hello-World",
          "manifest:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.version=dev"
        ]
      }
    ],
    [
      'json03',
      'event_tag_release1.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=tag`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        bakeTarget: "meta"
      } as Inputs,
      {
        "tags": [
          "user/app:release1",
          "user/app:my",
          "user/app:custom",
          "user/app:tags",
          "user/app:latest"
        ],
        "labels": {
          "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
          "org.opencontainers.image.description": "This your first repo!",
          "org.opencontainers.image.licenses": "MIT",
          "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
          "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.title": "Hello-World",
          "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.version": "release1"
        },
        "annotations": [
          "manifest:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
          "manifest:org.opencontainers.image.description=This your first repo!",
          "manifest:org.opencontainers.image.licenses=MIT",
          "manifest:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
          "manifest:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.title=Hello-World",
          "manifest:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.version=release1"
        ]
      }
    ],
    [
      'json04',
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=\\d{8}`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        "tags": [
          "user/app:20200110",
          "user/app:my",
          "user/app:custom",
          "user/app:tags"
        ],
        "labels": {
          "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
          "org.opencontainers.image.description": "This your first repo!",
          "org.opencontainers.image.licenses": "MIT",
          "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
          "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.title": "Hello-World",
          "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.version": "20200110"
        },
        "annotations": [
          "manifest:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
          "manifest:org.opencontainers.image.description=This your first repo!",
          "manifest:org.opencontainers.image.licenses=MIT",
          "manifest:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
          "manifest:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.title=Hello-World",
          "manifest:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.version=20200110"
        ]
      }
    ],
    [
      'json05',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{version}}`,
          `type=semver,pattern={{major}}.{{minor}}`,
          `type=semver,pattern={{major}}`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ]
      } as Inputs,
      {
        "tags": [
          "org/app:1.1.1",
          "org/app:1.1",
          "org/app:1",
          "org/app:my",
          "org/app:custom",
          "org/app:tags",
          "org/app:latest",
          "ghcr.io/user/app:1.1.1",
          "ghcr.io/user/app:1.1",
          "ghcr.io/user/app:1",
          "ghcr.io/user/app:my",
          "ghcr.io/user/app:custom",
          "ghcr.io/user/app:tags",
          "ghcr.io/user/app:latest"
        ],
        "labels": {
          "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
          "org.opencontainers.image.description": "This your first repo!",
          "org.opencontainers.image.licenses": "MIT",
          "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
          "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.title": "Hello-World",
          "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.version": "1.1.1"
        },
        "annotations": [
          "manifest:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
          "manifest:org.opencontainers.image.description=This your first repo!",
          "manifest:org.opencontainers.image.licenses=MIT",
          "manifest:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
          "manifest:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.title=Hello-World",
          "manifest:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.version=1.1.1"
        ]
      }
    ],
    [
      'json06',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ]
      } as Inputs,
      {
        "tags": [
          "org/app:my",
          "org/app:custom",
          "org/app:tags",
          "ghcr.io/user/app:my",
          "ghcr.io/user/app:custom",
          "ghcr.io/user/app:tags"
        ],
        "labels": {
          "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
          "org.opencontainers.image.description": "This your first repo!",
          "org.opencontainers.image.licenses": "MIT",
          "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
          "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.title": "Hello-World",
          "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.version": "my"
        },
        "annotations": [
          "manifest:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
          "manifest:org.opencontainers.image.description=This your first repo!",
          "manifest:org.opencontainers.image.licenses=MIT",
          "manifest:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
          "manifest:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.title=Hello-World",
          "manifest:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.version=my"
        ]
      }
    ],
    [
      'json07',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app'],
        labels: [
          "foo",
          "maintainer=CrazyMax",
          "org.opencontainers.image.title=MyCustom=Title",
          "org.opencontainers.image.description=Another description",
          "org.opencontainers.image.vendor=MyCompany",
        ],
      } as Inputs,
      {
        "tags": [
          "org/app:v1.1.1",
          "org/app:latest"
        ],
        "labels": {
          "maintainer": "CrazyMax",
          "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
          "org.opencontainers.image.description": "Another description",
          "org.opencontainers.image.licenses": "MIT",
          "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
          "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.title": "MyCustom=Title",
          "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
          "org.opencontainers.image.vendor": "MyCompany",
          "org.opencontainers.image.version": "v1.1.1"
        },
        "annotations": [
          "manifest:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
          "manifest:org.opencontainers.image.description=This your first repo!",
          "manifest:org.opencontainers.image.licenses=MIT",
          "manifest:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
          "manifest:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.title=Hello-World",
          "manifest:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
          "manifest:org.opencontainers.image.version=v1.1.1"
        ]
      }
    ]
  ])('given %p with %p event', async (name: string, envFile: string, inputs: Inputs, exJSON: unknown) => {
    process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures', envFile)));

    const toolkit = new Toolkit();
    const repo = await toolkit.github.repoData();
    const meta = new Meta({...getInputs(), ...inputs}, await getContext(ContextSource.workflow,toolkit), repo);

    const jsonOutput = meta.getJSON(['manifest']);
    expect(jsonOutput).toEqual(exJSON);
  });
});

describe('bakeFile', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'bakeFile01',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        labels: [
          "invalid"
        ]
      } as Inputs,
      {
        "target": {
          "docker-metadata-action": {
            "tags": [
              "user/app:dev",
              "user/app:my",
              "user/app:custom",
              "user/app:tags"
            ],
            "args": {
              "DOCKER_META_IMAGES": "user/app",
              "DOCKER_META_VERSION": "dev",
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "labels": {
              "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
              "org.opencontainers.image.description": "This your first repo!",
              "org.opencontainers.image.licenses": "MIT",
              "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
              "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.title": "Hello-World",
              "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.version": "dev"
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "annotations": [
              "index:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "index:org.opencontainers.image.description=This your first repo!",
              "index:org.opencontainers.image.licenses=MIT",
              "index:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "index:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.title=Hello-World",
              "index:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.version=dev",
              "manifest-descriptor:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "manifest-descriptor:org.opencontainers.image.description=This your first repo!",
              "manifest-descriptor:org.opencontainers.image.licenses=MIT",
              "manifest-descriptor:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "manifest-descriptor:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.title=Hello-World",
              "manifest-descriptor:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.version=dev"
            ]
          }
        }
      }
    ],
    [
      'bakeFile02',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`
        ]
      } as Inputs,
      {
        "target": {
          "docker-metadata-action": {
            "tags": [
              "user/app:dev",
              "user/app:my",
            ],
            "args": {
              "DOCKER_META_IMAGES": "user/app",
              "DOCKER_META_VERSION": "dev",
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "labels": {
              "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
              "org.opencontainers.image.description": "This your first repo!",
              "org.opencontainers.image.licenses": "MIT",
              "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
              "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.title": "Hello-World",
              "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.version": "dev"
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "annotations": [
              "index:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "index:org.opencontainers.image.description=This your first repo!",
              "index:org.opencontainers.image.licenses=MIT",
              "index:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "index:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.title=Hello-World",
              "index:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.version=dev",
              "manifest-descriptor:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "manifest-descriptor:org.opencontainers.image.description=This your first repo!",
              "manifest-descriptor:org.opencontainers.image.licenses=MIT",
              "manifest-descriptor:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "manifest-descriptor:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.title=Hello-World",
              "manifest-descriptor:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.version=dev"
            ]
          }
        }
      }
    ],
    [
      'bakeFile03',
      'event_tag_release1.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=tag`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        bakeTarget: "meta"
      } as Inputs,
      {
        "target": {
          "meta": {
            "tags": [
              "user/app:release1",
              "user/app:my",
              "user/app:custom",
              "user/app:tags",
              "user/app:latest"
            ],
            "args": {
              "DOCKER_META_IMAGES": "user/app",
              "DOCKER_META_VERSION": "release1",
            }
          }
        }
      },
      {
        "target": {
          "meta": {
            "labels": {
              "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
              "org.opencontainers.image.description": "This your first repo!",
              "org.opencontainers.image.licenses": "MIT",
              "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
              "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.title": "Hello-World",
              "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.version": "release1"
            }
          }
        }
      },
      {
        "target": {
          "meta": {
            "annotations": [
              "index:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "index:org.opencontainers.image.description=This your first repo!",
              "index:org.opencontainers.image.licenses=MIT",
              "index:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "index:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.title=Hello-World",
              "index:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.version=release1",
              "manifest-descriptor:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "manifest-descriptor:org.opencontainers.image.description=This your first repo!",
              "manifest-descriptor:org.opencontainers.image.licenses=MIT",
              "manifest-descriptor:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "manifest-descriptor:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.title=Hello-World",
              "manifest-descriptor:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.version=release1"
            ]
          }
        }
      }
    ],
    [
      'bakeFile04',
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tags: [
          `type=match,pattern=\\d{8}`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        flavor: [
          `latest=false`
        ]
      } as Inputs,
      {
        "target": {
          "docker-metadata-action": {
            "tags": [
              "user/app:20200110",
              "user/app:my",
              "user/app:custom",
              "user/app:tags"
            ],
            "args": {
              "DOCKER_META_IMAGES": "user/app",
              "DOCKER_META_VERSION": "20200110",
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "labels": {
              "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
              "org.opencontainers.image.description": "This your first repo!",
              "org.opencontainers.image.licenses": "MIT",
              "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
              "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.title": "Hello-World",
              "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.version": "20200110"
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "annotations": [
              "index:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "index:org.opencontainers.image.description=This your first repo!",
              "index:org.opencontainers.image.licenses=MIT",
              "index:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "index:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.title=Hello-World",
              "index:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.version=20200110",
              "manifest-descriptor:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "manifest-descriptor:org.opencontainers.image.description=This your first repo!",
              "manifest-descriptor:org.opencontainers.image.licenses=MIT",
              "manifest-descriptor:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "manifest-descriptor:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.title=Hello-World",
              "manifest-descriptor:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.version=20200110"
            ]
          }
        }
      }
    ],
    [
      'bakeFile05',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=semver,pattern={{version}}`,
          `type=semver,pattern={{major}}.{{minor}}`,
          `type=semver,pattern={{major}}`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ]
      } as Inputs,
      {
        "target": {
          "docker-metadata-action": {
            "tags": [
              "org/app:1.1.1",
              "org/app:1.1",
              "org/app:1",
              "org/app:my",
              "org/app:custom",
              "org/app:tags",
              "org/app:latest",
              "ghcr.io/user/app:1.1.1",
              "ghcr.io/user/app:1.1",
              "ghcr.io/user/app:1",
              "ghcr.io/user/app:my",
              "ghcr.io/user/app:custom",
              "ghcr.io/user/app:tags",
              "ghcr.io/user/app:latest"
            ],
            "args": {
              "DOCKER_META_IMAGES": "org/app,ghcr.io/user/app",
              "DOCKER_META_VERSION": "1.1.1",
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "labels": {
              "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
              "org.opencontainers.image.description": "This your first repo!",
              "org.opencontainers.image.licenses": "MIT",
              "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
              "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.title": "Hello-World",
              "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.version": "1.1.1"
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "annotations": [
              "index:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "index:org.opencontainers.image.description=This your first repo!",
              "index:org.opencontainers.image.licenses=MIT",
              "index:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "index:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.title=Hello-World",
              "index:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.version=1.1.1",
              "manifest-descriptor:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "manifest-descriptor:org.opencontainers.image.description=This your first repo!",
              "manifest-descriptor:org.opencontainers.image.licenses=MIT",
              "manifest-descriptor:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "manifest-descriptor:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.title=Hello-World",
              "manifest-descriptor:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.version=1.1.1"
            ]
          }
        }
      }
    ],
    [
      'bakeFile06',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tags: [
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ]
      } as Inputs,
      {
        "target": {
          "docker-metadata-action": {
            "tags": [
              "org/app:my",
              "org/app:custom",
              "org/app:tags",
              "ghcr.io/user/app:my",
              "ghcr.io/user/app:custom",
              "ghcr.io/user/app:tags"
            ],
            "args": {
              "DOCKER_META_IMAGES": "org/app,ghcr.io/user/app",
              "DOCKER_META_VERSION": "my",
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "labels": {
              "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
              "org.opencontainers.image.description": "This your first repo!",
              "org.opencontainers.image.licenses": "MIT",
              "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
              "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.title": "Hello-World",
              "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.version": "my"
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "annotations": [
              "index:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "index:org.opencontainers.image.description=This your first repo!",
              "index:org.opencontainers.image.licenses=MIT",
              "index:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "index:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.title=Hello-World",
              "index:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.version=my",
              "manifest-descriptor:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "manifest-descriptor:org.opencontainers.image.description=This your first repo!",
              "manifest-descriptor:org.opencontainers.image.licenses=MIT",
              "manifest-descriptor:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "manifest-descriptor:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.title=Hello-World",
              "manifest-descriptor:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.version=my"
            ]
          }
        }
      }
    ],
    [
      'bakeFile07',
      'event_tag_v1.1.1.env',
      {
        images: ['org/app'],
        labels: [
          "maintainer=CrazyMax",
          "org.opencontainers.image.title=MyCustom=Title",
          "org.opencontainers.image.description=Another description",
          "org.opencontainers.image.vendor=MyCompany",
        ],
      } as Inputs,
      {
        "target": {
          "docker-metadata-action": {
            "tags": [
              "org/app:v1.1.1",
              "org/app:latest"
            ],
            "args": {
              "DOCKER_META_IMAGES": "org/app",
              "DOCKER_META_VERSION": "v1.1.1",
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "labels": {
              "maintainer": "CrazyMax",
              "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
              "org.opencontainers.image.description": "Another description",
              "org.opencontainers.image.licenses": "MIT",
              "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
              "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.title": "MyCustom=Title",
              "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.vendor": "MyCompany",
              "org.opencontainers.image.version": "v1.1.1"
            }
          }
        }
      },
      {
        "target": {
          "docker-metadata-action": {
            "annotations": [
              "index:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "index:org.opencontainers.image.description=This your first repo!",
              "index:org.opencontainers.image.licenses=MIT",
              "index:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "index:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.title=Hello-World",
              "index:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "index:org.opencontainers.image.version=v1.1.1",
              "manifest-descriptor:org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
              "manifest-descriptor:org.opencontainers.image.description=This your first repo!",
              "manifest-descriptor:org.opencontainers.image.licenses=MIT",
              "manifest-descriptor:org.opencontainers.image.revision=860c1904a1ce19322e91ac35af1ab07466440c37",
              "manifest-descriptor:org.opencontainers.image.source=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.title=Hello-World",
              "manifest-descriptor:org.opencontainers.image.url=https://github.com/octocat/Hello-World",
              "manifest-descriptor:org.opencontainers.image.version=v1.1.1"
            ]
          }
        }
      }
    ]
  ])('given %p with %p event', async (name: string, envFile: string, inputs: Inputs, exBakeTags: unknown, exBakeLabels: unknown, exBakeAnnotations: unknown) => {
    process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures', envFile)));

    const toolkit = new Toolkit();
    const repo = await toolkit.github.repoData();
    const meta = new Meta({...getInputs(), ...inputs}, await getContext(ContextSource.workflow,toolkit), repo);

    const bakeFileTags = meta.getBakeFile('tags');
    expect(JSON.parse(fs.readFileSync(bakeFileTags, 'utf8'))).toEqual(exBakeTags);

    const bakeFileLabels = meta.getBakeFile('labels');
    expect(JSON.parse(fs.readFileSync(bakeFileLabels, 'utf8'))).toEqual(exBakeLabels);

    const bakeFileAnnotations = meta.getBakeFile('annotations:index,manifest-descriptor');
    expect(JSON.parse(fs.readFileSync(bakeFileAnnotations, 'utf8'))).toEqual(exBakeAnnotations);
  });
});

describe('bakeFileTagsLabels', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'bakeFileTagsLabels01',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        labels: [
          "invalid"
        ]
      } as Inputs,
      {
        "target": {
          "docker-metadata-action": {
            "tags": [
              "user/app:dev",
              "user/app:my",
              "user/app:custom",
              "user/app:tags"
            ],
            "labels": {
              "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
              "org.opencontainers.image.description": "This your first repo!",
              "org.opencontainers.image.licenses": "MIT",
              "org.opencontainers.image.revision": "860c1904a1ce19322e91ac35af1ab07466440c37",
              "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.title": "Hello-World",
              "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
              "org.opencontainers.image.version": "dev"
            },
            "args": {
              "DOCKER_META_IMAGES": "user/app",
              "DOCKER_META_VERSION": "dev",
            }
          }
        }
      }
    ]
  ])('given %p with %p event', async (name: string, envFile: string, inputs: Inputs, exBakeDefinition: unknown) => {
    process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures', envFile)));

    const toolkit = new Toolkit();
    const repo = await toolkit.github.repoData();
    const meta = new Meta({...getInputs(), ...inputs}, await getContext(ContextSource.workflow,toolkit), repo);

    const bakeFile = meta.getBakeFileTagsLabels();
    expect(JSON.parse(fs.readFileSync(bakeFile, 'utf8'))).toEqual(exBakeDefinition);
  });
});

describe('sepTags', () => {
  // prettier-ignore
  // eslint-disable-next-line jest/expect-expect
  test.each([
    [
      'sepTags01',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        sepTags: " "
      } as Inputs,
      "user/app:dev user/app:my user/app:custom user/app:tags"
    ],
    [
      'sepTags02',
      'event_push_dev.env',
      {
        images: ['user/app'],
        tags: [
          `type=ref,event=branch`,
          `type=raw,my`,
          `type=raw,custom`,
          `type=raw,tags`
        ],
        sepTags: ","
      } as Inputs,
      "user/app:dev,user/app:my,user/app:custom,user/app:tags"
    ]
  ])('given %p with %p event', async (name: string, envFile: string, inputs: Inputs, expTags: string) => {

    process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures', envFile)));

    const toolkit = new Toolkit();

    const repo = await toolkit.github.repoData();

    const meta = new Meta({...getInputs(), ...inputs}, await getContext(ContextSource.workflow, toolkit), repo);

    expect(meta.getTags().join(inputs.sepTags)).toEqual(expTags);
  });
});
