import {describe, expect, jest, it} from '@jest/globals';
import * as github from '../src/github';

import * as repoFixture from './fixtures/repo.json';
jest.spyOn(github, 'repo').mockImplementation((): Promise<github.ReposGetResponseData> => {
  return <Promise<github.ReposGetResponseData>>(repoFixture as unknown);
});

describe('repo', () => {
  it('returns GitHub repository', async () => {
    const repo = await github.repo(process.env.GITHUB_TOKEN || '');
    expect(repo.name).not.toBeNull();
  });
});
