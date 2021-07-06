import * as path from 'path';
import * as github from '../src/github';

jest.spyOn(github, 'repo').mockImplementation((): Promise<github.ReposGetResponseData> => {
  return <Promise<github.ReposGetResponseData>>require(path.join(__dirname, 'fixtures', 'repo.json'));
});

describe('repo', () => {
  it('returns GitHub repository', async () => {
    const repo = await github.repo(process.env.GITHUB_TOKEN || '');
    console.log(repo);
    expect(repo.name).not.toBeNull();
  });
});
