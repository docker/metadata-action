import * as github from '@actions/github';
import {Context} from '@actions/github/lib/context';
import {components as OctoOpenApiTypes} from '@octokit/openapi-types';

export type ReposGetResponseData = OctoOpenApiTypes['schemas']['repository'];

export function context(): Context {
  return github.context;
}

export async function repo(token: string): Promise<ReposGetResponseData> {
  return github
    .getOctokit(token)
    .rest.repos.get({
      ...github.context.repo
    })
    .then(response => response.data as ReposGetResponseData);
}
