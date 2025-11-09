import {beforeEach, describe, expect, jest, test} from '@jest/globals';

import {getContext, getInputs} from '../src/context';
import {Meta} from '../src/meta';
import {parseRepoFromRemoteUrl, Repo} from '../src/git';

const defaultSha = '860c1904a1ce19322e91ac35af1ab07466440c37';
const repoRemote = 'https://github.com/octocat/Hello-World.git';
const testRepo: Repo = parseRepoFromRemoteUrl(repoRemote, 'master');
testRepo.description = 'This your first repo!';
testRepo.license = 'MIT';

function mockGitContext(sha = defaultSha, ref = 'refs/heads/main') {
  jest.spyOn(require('../src/git'), 'getGitContext').mockResolvedValue({
    sha,
    ref,
    commitDate: new Date('2020-01-10T00:30:00.000Z'),
    remoteUrl: repoRemote,
    defaultBranch: testRepo.default_branch
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.GITHUB_REF;
  delete process.env.GITHUB_SHA;
});

describe('meta git integration', () => {
  test('labels reflect repository metadata without GitHub API', async () => {
    mockGitContext();
    const meta = new Meta(
      {
        ...getInputs(),
        images: ['local/app'],
        tags: ['type=ref,event=branch'],
        labels: [],
        annotations: []
      },
      await getContext(),
      testRepo
    );

    expect(meta.getLabels()).toEqual(
      expect.arrayContaining([
        `org.opencontainers.image.title=${testRepo.name}`,
        `org.opencontainers.image.description=${testRepo.description}`,
        `org.opencontainers.image.source=${testRepo.url}`,
        `org.opencontainers.image.url=${testRepo.url}`,
        `org.opencontainers.image.licenses=${testRepo.license}`,
        `org.opencontainers.image.revision=${defaultSha}`
      ])
    );
  });

  test('tag-names output strips image prefix', async () => {
    mockGitContext();
    const meta = new Meta(
      {
        ...getInputs(),
        images: ['local/app'],
        tags: ['type=ref,event=branch', 'type=raw,value=custom'],
        labels: [],
        annotations: []
      },
      await getContext(),
      testRepo
    );

    expect(meta.getTags()).toEqual(['local/app:main', 'local/app:custom']);
    expect(meta.getTags(true)).toEqual(['main', 'custom']);
  });

  test('json output includes tag-names and annotations derived from git', async () => {
    mockGitContext();
    const meta = new Meta(
      {
        ...getInputs(),
        images: ['local/app'],
        tags: ['type=ref,event=branch', 'type=raw,value=extra'],
        labels: [],
        annotations: ['org.example.build={{sha}}']
      },
      await getContext(),
      testRepo
    );

    const json = meta.getJSON(['manifest']) as {
      tags: string[];
      'tag-names': string[];
      annotations: string[];
    };

    expect(json.tags).toEqual(['local/app:main', 'local/app:extra']);
    expect(json['tag-names']).toEqual(['main', 'extra']);
    expect(json.annotations).toEqual(
      expect.arrayContaining(['manifest:org.example.build=860c190'])
    );
  });
});

