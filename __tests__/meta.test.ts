import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {Inputs} from '../src/context';
import * as github from '../src/github';
import {Meta} from '../src/meta';
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

describe('tags and labels', () => {
  beforeEach(() => {
    Object.keys(process.env).forEach(function (key) {
      if (key !== 'GITHUB_TOKEN' && key.startsWith('GITHUB_')) {
        delete process.env[key];
      }
    });
  });

  // prettier-ignore
  test.each([
    [
      'event_null.env',
      {
        images: ['user/app'],
      },
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
      },
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
      'event_pull_request.env',
      {
        images: ['user/app'],
      },
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
      'event_push.env',
      {
        images: ['user/app'],
      },
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
      },
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
      'event_release.env',
      {
        images: ['user/app'],
      },
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
      'event_schedule.env',
      {
        images: ['user/app'],
      },
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
      'event_tag.env',
      {
        images: ['user/app'],
      },
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
      'event_tag_semver.env',
      {
        images: ['user/app'],
      },
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
      'event_workflow_dispatch.env',
      {
        images: ['user/app'],
      },
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
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      },
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
      'event_push.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      },
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
      },
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
      'event_schedule.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      },
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
      'event_tag_semver.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
      },
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
      'event_pull_request.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
      },
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
    [
      'event_push.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
      },
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
      },
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
      'event_schedule.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
      },
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
    [
      'event_tag_semver.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
      },
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
      'event_push.env',
      {
        images: ['org/app', 'ghcr.io/user/app'],
        tagSha: true,
        tagEdge: 'dev'
      },
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
        tagEdge: 'dev'
      },
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
  ])('given %p event ', async (envFile, inputs, exTags, exLabels) => {
    process.env = dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures', envFile)));
    console.log(process.env);

    const context = github.context();
    console.log(context);

    const repo = await github.repo(process.env.GITHUB_TOKEN || '');
    const meta = new Meta(inputs as Inputs, context, repo);

    const tags = meta.tags();
    console.log(tags)
    expect(tags).toEqual(exTags);

    const labels = meta.labels();
    console.log(labels)
    expect(labels).toEqual(exLabels);
  });
});
