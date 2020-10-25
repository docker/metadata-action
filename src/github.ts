import * as github from '@actions/github';
import {Context} from '@actions/github/lib/context';
import {ReposGetResponseData} from '@octokit/types';

export function context(): Context {
  return github.context;
}

export async function repo(token: string): Promise<ReposGetResponseData> {
  const octokit = github.getOctokit(token);
  const repo = await octokit.repos.get({
    ...github.context.repo
  });
  if (!repo?.data) {
    throw new Error('Cannot get GitHub repository');
  }
  return repo.data;
}
