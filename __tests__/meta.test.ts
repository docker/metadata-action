import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as moment from 'moment';
import {getInputs, Inputs} from '../src/context';
import * as github from '../src/github';
import {Meta, Version} from '../src/meta';
import {Context} from '@actions/github/lib/context';
import {ReposGetResponseData} from '@octokit/types';

jest.spyOn(github, 'repo').mockImplementation(
  (): Promise<ReposGetResponseData> => {
    return <Promise<ReposGetResponseData>>require(path.join(__dirname, 'fixtures', 'repo.json'));
  }
);

jest.spyOn(github, 'context').mockImplementation(
  (): Context => {
    return new Context();
  }
);

jest.spyOn(global.Date.prototype, 'toISOString').mockImplementation(() => {
  return '2020-01-10T00:30:00.000Z';
});

jest.mock('moment', () => {
  return () => jest.requireActual('moment')('2020-01-10T00:30:00.000Z');
});

beforeEach(() => {
  Object.keys(process.env).forEach(function (key) {
    if (key !== 'GITHUB_TOKEN' && key.startsWith('GITHUB_')) {
      delete process.env[key];
    }
  });
});

const tagsLabelsTest = async (envFile: string, inputs: Inputs, exVersion: Version, exTags: Array<string>, exLabels: Array<string>) => {
  process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures', envFile)));
  const context = github.context();
  console.log(process.env, context);

  const repo = await github.repo(process.env.GITHUB_TOKEN || '');
  const meta = new Meta({...getInputs(), ...inputs}, context, repo);

  const version = meta.version();
  console.log('version', version);
  expect(version).toEqual(exVersion);

  const tags = meta.tags();
  console.log('tags', tags);
  expect(tags).toEqual(exTags);

  const labels = meta.labels();
  console.log('labels', labels);
  expect(labels).toEqual(exLabels);
};

describe('null', () => {
  // prettier-ignore
  test.each([
    [
      'event_null.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: undefined,
        latest: false
      } as Version,
      [],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_empty.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: undefined,
        latest: false
      } as Version,
      [],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
  ])('given %p event ', tagsLabelsTest);
});

describe('push', () => {
  // prettier-ignore
  test.each([
    [
      'event_push.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: 'dev',
        latest: false
      } as Version,
      [
        'user/app:dev'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=dev",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_push_defbranch.env',
      {
        images: ['user/app'],
        tagEdge: true,
      } as Inputs,
      {
        version: 'edge',
        latest: false
      } as Version,
      [
        'user/app:edge'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=edge",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_push_defbranch.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: 'master',
        latest: false
      } as Version,
      [
        'user/app:master'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=master",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_workflow_dispatch.env',
      {
        images: ['user/app'],
        tagEdge: true,
      } as Inputs,
      {
        version: 'edge',
        latest: false
      } as Version,
      [
        'user/app:edge'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=edge",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_push.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        version: 'dev',
        latest: false
      } as Version,
      [
        'org/app:dev',
        'ghcr.io/user/app:dev'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=dev",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_push_defbranch.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagEdge: true,
      } as Inputs,
      {
        version: 'edge',
        latest: false
      } as Version,
      [
        'org/app:edge',
        'ghcr.io/user/app:edge'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=edge",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_push.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
      } as Inputs,
      {
        version: 'dev',
        latest: false
      } as Version,
      [
        'org/app:dev',
        'org/app:sha-90dd603',
        'ghcr.io/user/app:dev',
        'ghcr.io/user/app:sha-90dd603'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=dev",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_push_defbranch.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
        tagEdge: true,
      } as Inputs,
      {
        version: 'edge',
        latest: false
      } as Version,
      [
        'org/app:edge',
        'org/app:sha-90dd603',
        'ghcr.io/user/app:edge',
        'ghcr.io/user/app:sha-90dd603'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=edge",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_push.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
        tagEdge: true,
        tagEdgeBranch: 'dev'
      } as Inputs,
      {
        version: 'edge',
        latest: false
      } as Version,
      [
        'org/app:edge',
        'org/app:sha-90dd603',
        'ghcr.io/user/app:edge',
        'ghcr.io/user/app:sha-90dd603'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=edge",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_push_defbranch.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
        tagEdge: true,
        tagEdgeBranch: 'dev'
      } as Inputs,
      {
        version: 'master',
        latest: false
      } as Version,
      [
        'org/app:master',
        'org/app:sha-90dd603',
        'ghcr.io/user/app:master',
        'ghcr.io/user/app:sha-90dd603'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=master",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
  ])('given %p event ', tagsLabelsTest);
});

describe('push tag', () => {
  // prettier-ignore
  test.each([
    [
      'event_tag_release1.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: 'release1',
        latest: false
      } as Version,
      [
        'user/app:release1'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=release1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: '20200110-RC2',
        latest: false
      } as Version,
      [
        'user/app:20200110-RC2'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=20200110-RC2",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tagCoerceTag: '{{major}}',
      } as Inputs,
      {
        version: '20200110',
        latest: true
      } as Version,
      [
        'user/app:20200110',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=20200110",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v1.1.1.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: '1.1.1',
        latest: true
      } as Version,
      [
        'user/app:1.1.1',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=1.1.1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        version: '1.1.1',
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:latest',
        'ghcr.io/user/app:1.1.1',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=1.1.1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
      } as Inputs,
      {
        version: '1.1.1',
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:latest',
        'org/app:sha-90dd603',
        'ghcr.io/user/app:1.1.1',
        'ghcr.io/user/app:latest',
        'ghcr.io/user/app:sha-90dd603'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=1.1.1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        version: '2.0.8-beta.67',
        latest: true
      } as Version,
      [
        'org/app:2.0.8-beta.67',
        'org/app:latest',
        'ghcr.io/user/app:2.0.8-beta.67',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=2.0.8-beta.67",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagCoerceTag: '{{major}}.{{minor}}',
      } as Inputs,
      {
        version: '2.0',
        latest: true
      } as Version,
      [
        'org/app:2.0',
        'org/app:latest',
        'ghcr.io/user/app:2.0',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=2.0",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_sometag.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagCoerceTag: '{{major}}.{{minor}}',
      } as Inputs,
      {
        version: 'sometag',
        latest: false
      } as Version,
      [
        'org/app:sometag',
        'ghcr.io/user/app:sometag'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=sometag",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
  ])('given %p event ', tagsLabelsTest);
});

describe('latest', () => {
  // prettier-ignore
  test.each([
    [
      'event_tag_release1.env',
      {
        images: ['user/app'],
        tagLatestMatch: `^release`,
      } as Inputs,
      {
        version: 'release1',
        latest: true,
      } as Version,
      [
        'user/app:release1',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=release1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tagLatestMatch: `^\\d`,
      } as Inputs,
      {
        version: '20200110-RC2',
        latest: true
      } as Version,
      [
        'user/app:20200110-RC2',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=20200110-RC2",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_20200110-RC2.env',
      {
        images: ['user/app'],
        tagCoerceTag: '{{major}}',
        tagLatestMatch: `\\d`,
      } as Inputs,
      {
        version: '20200110',
        latest: true
      } as Version,
      [
        'user/app:20200110',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=20200110",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v1.1.1.env',
      {
        images: ['user/app'],
        tagLatestMatch: `\\d{1,3}.\\d{1,3}.\\d{1,3}`,
      } as Inputs,
      {
        version: '1.1.1',
        latest: true
      } as Version,
      [
        'user/app:1.1.1',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=1.1.1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        version: '1.1.1',
        latest: true
      } as Version,
      [
        'org/app:1.1.1',
        'org/app:latest',
        'ghcr.io/user/app:1.1.1',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=1.1.1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v1.1.1.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagLatestMatch: `2.\\d{1,3}.\\d{1,3}`,
      } as Inputs,
      {
        version: '1.1.1',
        latest: false
      } as Version,
      [
        'org/app:1.1.1',
        'ghcr.io/user/app:1.1.1',
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=1.1.1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_tag_v2.0.8-beta.67.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagLatestMatch: `^\\d{1,3}.\\d{1,3}.\\d{1,3}`,
      } as Inputs,
      {
        version: '2.0.8-beta.67',
        latest: true
      } as Version,
      [
        'org/app:2.0.8-beta.67',
        'org/app:latest',
        'ghcr.io/user/app:2.0.8-beta.67',
        'ghcr.io/user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=2.0.8-beta.67",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
  ])('given %p event ', tagsLabelsTest);
});

describe('pull_request', () => {
  // prettier-ignore
  test.each([
    [
      'event_pull_request.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: 'pr-2',
        latest: false
      } as Version,
      [
        'user/app:pr-2'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=pr-2",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=1e9249f05bfc090e0688b8fb9c1b347586add504",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        version: 'pr-2',
        latest: false
      } as Version,
      [
        'org/app:pr-2',
        'ghcr.io/user/app:pr-2'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=pr-2",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=1e9249f05bfc090e0688b8fb9c1b347586add504",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
      } as Inputs,
      {
        version: 'pr-2',
        latest: false
      } as Version,
      [
        'org/app:pr-2',
        'org/app:sha-1e9249f',
        'ghcr.io/user/app:pr-2',
        'ghcr.io/user/app:sha-1e9249f'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=pr-2",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=1e9249f05bfc090e0688b8fb9c1b347586add504",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
  ])('given %p event ', tagsLabelsTest);
});

describe('schedule', () => {
  // prettier-ignore
  test.each([
    [
      'event_schedule.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: 'nightly',
        latest: false
      } as Version,
      [
        'user/app:nightly'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=nightly",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_schedule.env',
      {
        images: ['user/app'],
        tagSchedule: `{{date 'YYYYMMDD'}}`
      } as Inputs,
      {
        version: '20200110',
        latest: false
      } as Version,
      [
        'user/app:20200110'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=20200110",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_schedule.env',
      {
        images: ['user/app'],
        tagSchedule: `{{date 'YYYYMMDD-HHmmss'}}`
      } as Inputs,
      {
        version: '20200110-003000',
        latest: false
      } as Version,
      [
        'user/app:20200110-003000'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=20200110-003000",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_schedule.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      } as Inputs,
      {
        version: 'nightly',
        latest: false
      } as Version,
      [
        'org/app:nightly',
        'ghcr.io/user/app:nightly'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=nightly",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
    [
      'event_schedule.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
      } as Inputs,
      {
        version: 'nightly',
        latest: false
      } as Version,
      [
        'org/app:nightly',
        'org/app:sha-90dd603',
        'ghcr.io/user/app:nightly',
        'ghcr.io/user/app:sha-90dd603'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=nightly",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
  ])('given %p event ', tagsLabelsTest);
});

describe('release', () => {
  // prettier-ignore
  test.each([
    [
      'event_release.env',
      {
        images: ['user/app'],
      } as Inputs,
      {
        version: '1.1.1',
        latest: true
      } as Version,
      [
        'user/app:1.1.1',
        'user/app:latest'
      ],
      [
        "org.opencontainers.image.title=Hello-World",
        "org.opencontainers.image.description=This your first repo!",
        "org.opencontainers.image.url=https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source=https://github.com/octocat/Hello-World.git",
        "org.opencontainers.image.version=1.1.1",
        "org.opencontainers.image.created=2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision=90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses=MIT"
      ]
    ],
  ])('given %p event ', tagsLabelsTest);
});
