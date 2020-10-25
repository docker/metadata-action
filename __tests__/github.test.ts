import * as path from 'path';
import * as github from '../src/github';
import {ReposGetResponseData} from '@octokit/types';

jest.spyOn(github, 'repo').mockImplementation(
  (): Promise<ReposGetResponseData> => {
    return <Promise<ReposGetResponseData>>require(path.join(__dirname, 'fixtures', 'repo.json'));
  }
);

describe('repo', () => {
  it('returns GitHub repository', async () => {
    const repo = await github.repo(process.env.GITHUB_TOKEN || '');
    console.log(repo);
    expect(repo.name).not.toBeNull();
  });
});
