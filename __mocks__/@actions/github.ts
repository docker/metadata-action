import {jest} from '@jest/globals';

export const context = {
  repo: {
    owner: 'docker',
    repo: 'actions-toolkit'
  },
  ref: 'refs/heads/master',
  runId: 123,
  payload: {
    after: '860c1904a1ce19322e91ac35af1ab07466440c37',
    base_ref: null,
    before: '5f3331d7f7044c18ca9f12c77d961c4d7cf3276a',
    commits: [
      {
        author: {
          email: 'crazy-max@users.noreply.github.com',
          name: 'CrazyMax',
          username: 'crazy-max'
        },
        committer: {
          email: 'crazy-max@users.noreply.github.com',
          name: 'CrazyMax',
          username: 'crazy-max'
        },
        distinct: true,
        id: '860c1904a1ce19322e91ac35af1ab07466440c37',
        message: 'hello dev',
        timestamp: '2022-04-19T11:27:24+02:00',
        tree_id: 'd2c60af597e863787d2d27f569e30495b0b92820',
        url: 'https://github.com/docker/test-docker-action/commit/860c1904a1ce19322e91ac35af1ab07466440c37'
      }
    ],
    compare: 'https://github.com/docker/test-docker-action/compare/5f3331d7f704...860c1904a1ce',
    created: false,
    deleted: false,
    forced: false,
    head_commit: {
      author: {
        email: 'crazy-max@users.noreply.github.com',
        name: 'CrazyMax',
        username: 'crazy-max'
      },
      committer: {
        email: 'crazy-max@users.noreply.github.com',
        name: 'CrazyMax',
        username: 'crazy-max'
      },
      distinct: true,
      id: '860c1904a1ce19322e91ac35af1ab07466440c37',
      message: 'hello dev',
      timestamp: '2022-04-19T11:27:24+02:00',
      tree_id: 'd2c60af597e863787d2d27f569e30495b0b92820',
      url: 'https://github.com/docker/test-docker-action/commit/860c1904a1ce19322e91ac35af1ab07466440c37'
    },
    organization: {
      avatar_url: 'https://avatars.githubusercontent.com/u/5429470?v=4',
      description: 'Docker helps developers bring their ideas to life by conquering the complexity of app development.',
      events_url: 'https://api.github.com/orgs/docker/events',
      hooks_url: 'https://api.github.com/orgs/docker/hooks',
      id: 5429470,
      issues_url: 'https://api.github.com/orgs/docker/issues',
      login: 'docker',
      members_url: 'https://api.github.com/orgs/docker/members{/member}',
      node_id: 'MDEyOk9yZ2FuaXphdGlvbjU0Mjk0NzA=',
      public_members_url: 'https://api.github.com/orgs/docker/public_members{/member}',
      repos_url: 'https://api.github.com/orgs/docker/repos',
      url: 'https://api.github.com/orgs/docker'
    },
    pusher: {
      email: 'github@crazymax.dev',
      name: 'crazy-max'
    },
    ref: 'refs/heads/dev',
    repository: {
      allow_forking: true,
      archive_url: 'https://api.github.com/repos/docker/test-docker-action/{archive_format}{/ref}',
      archived: false,
      assignees_url: 'https://api.github.com/repos/docker/test-docker-action/assignees{/user}',
      blobs_url: 'https://api.github.com/repos/docker/test-docker-action/git/blobs{/sha}',
      branches_url: 'https://api.github.com/repos/docker/test-docker-action/branches{/branch}',
      clone_url: 'https://github.com/docker/test-docker-action.git',
      collaborators_url: 'https://api.github.com/repos/docker/test-docker-action/collaborators{/collaborator}',
      comments_url: 'https://api.github.com/repos/docker/test-docker-action/comments{/number}',
      commits_url: 'https://api.github.com/repos/docker/test-docker-action/commits{/sha}',
      compare_url: 'https://api.github.com/repos/docker/test-docker-action/compare/{base}...{head}',
      contents_url: 'https://api.github.com/repos/docker/test-docker-action/contents/{+path}',
      contributors_url: 'https://api.github.com/repos/docker/test-docker-action/contributors',
      created_at: 1596792180,
      default_branch: 'master',
      deployments_url: 'https://api.github.com/repos/docker/test-docker-action/deployments',
      description: 'Test "Docker" Actions',
      disabled: false,
      downloads_url: 'https://api.github.com/repos/docker/test-docker-action/downloads',
      events_url: 'https://api.github.com/repos/docker/test-docker-action/events',
      fork: false,
      forks: 1,
      forks_count: 1,
      forks_url: 'https://api.github.com/repos/docker/test-docker-action/forks',
      full_name: 'docker/test-docker-action',
      git_commits_url: 'https://api.github.com/repos/docker/test-docker-action/git/commits{/sha}',
      git_refs_url: 'https://api.github.com/repos/docker/test-docker-action/git/refs{/sha}',
      git_tags_url: 'https://api.github.com/repos/docker/test-docker-action/git/tags{/sha}',
      git_url: 'git://github.com/docker/test-docker-action.git',
      has_downloads: true,
      has_issues: true,
      has_pages: false,
      has_projects: true,
      has_wiki: true,
      homepage: '',
      hooks_url: 'https://api.github.com/repos/docker/test-docker-action/hooks',
      html_url: 'https://github.com/docker/test-docker-action',
      id: 285789493,
      is_template: false,
      issue_comment_url: 'https://api.github.com/repos/docker/test-docker-action/issues/comments{/number}',
      issue_events_url: 'https://api.github.com/repos/docker/test-docker-action/issues/events{/number}',
      issues_url: 'https://api.github.com/repos/docker/test-docker-action/issues{/number}',
      keys_url: 'https://api.github.com/repos/docker/test-docker-action/keys{/key_id}',
      labels_url: 'https://api.github.com/repos/docker/test-docker-action/labels{/name}',
      language: 'JavaScript',
      languages_url: 'https://api.github.com/repos/docker/test-docker-action/languages',
      license: {
        key: 'mit',
        name: 'MIT License',
        node_id: 'MDc6TGljZW5zZTEz',
        spdx_id: 'MIT',
        url: 'https://api.github.com/licenses/mit'
      },
      master_branch: 'master',
      merges_url: 'https://api.github.com/repos/docker/test-docker-action/merges',
      milestones_url: 'https://api.github.com/repos/docker/test-docker-action/milestones{/number}',
      mirror_url: null,
      name: 'test-docker-action',
      node_id: 'MDEwOlJlcG9zaXRvcnkyODU3ODk0OTM=',
      notifications_url: 'https://api.github.com/repos/docker/test-docker-action/notifications{?since,all,participating}',
      open_issues: 6,
      open_issues_count: 6,
      organization: 'docker',
      owner: {
        avatar_url: 'https://avatars.githubusercontent.com/u/5429470?v=4',
        email: 'info@docker.com',
        events_url: 'https://api.github.com/users/docker/events{/privacy}',
        followers_url: 'https://api.github.com/users/docker/followers',
        following_url: 'https://api.github.com/users/docker/following{/other_user}',
        gists_url: 'https://api.github.com/users/docker/gists{/gist_id}',
        gravatar_id: '',
        html_url: 'https://github.com/docker',
        id: 5429470,
        login: 'docker',
        name: 'docker',
        node_id: 'MDEyOk9yZ2FuaXphdGlvbjU0Mjk0NzA=',
        organizations_url: 'https://api.github.com/users/docker/orgs',
        received_events_url: 'https://api.github.com/users/docker/received_events',
        repos_url: 'https://api.github.com/users/docker/repos',
        site_admin: false,
        starred_url: 'https://api.github.com/users/docker/starred{/owner}{/repo}',
        subscriptions_url: 'https://api.github.com/users/docker/subscriptions',
        type: 'Organization',
        url: 'https://api.github.com/users/docker'
      },
      private: true,
      pulls_url: 'https://api.github.com/repos/docker/test-docker-action/pulls{/number}',
      pushed_at: 1650360446,
      releases_url: 'https://api.github.com/repos/docker/test-docker-action/releases{/id}',
      size: 796,
      ssh_url: 'git@github.com:docker/test-docker-action.git',
      stargazers: 0,
      stargazers_count: 0,
      stargazers_url: 'https://api.github.com/repos/docker/test-docker-action/stargazers',
      statuses_url: 'https://api.github.com/repos/docker/test-docker-action/statuses/{sha}',
      subscribers_url: 'https://api.github.com/repos/docker/test-docker-action/subscribers',
      subscription_url: 'https://api.github.com/repos/docker/test-docker-action/subscription',
      svn_url: 'https://github.com/docker/test-docker-action',
      tags_url: 'https://api.github.com/repos/docker/test-docker-action/tags',
      teams_url: 'https://api.github.com/repos/docker/test-docker-action/teams',
      topics: [],
      trees_url: 'https://api.github.com/repos/docker/test-docker-action/git/trees{/sha}',
      updated_at: '2022-04-19T09:05:09Z',
      url: 'https://github.com/docker/test-docker-action',
      visibility: 'private',
      watchers: 0,
      watchers_count: 0
    },
    sender: {
      avatar_url: 'https://avatars.githubusercontent.com/u/1951866?v=4',
      events_url: 'https://api.github.com/users/crazy-max/events{/privacy}',
      followers_url: 'https://api.github.com/users/crazy-max/followers',
      following_url: 'https://api.github.com/users/crazy-max/following{/other_user}',
      gists_url: 'https://api.github.com/users/crazy-max/gists{/gist_id}',
      gravatar_id: '',
      html_url: 'https://github.com/crazy-max',
      id: 1951866,
      login: 'crazy-max',
      node_id: 'MDQ6VXNlcjE5NTE4NjY=',
      organizations_url: 'https://api.github.com/users/crazy-max/orgs',
      received_events_url: 'https://api.github.com/users/crazy-max/received_events',
      repos_url: 'https://api.github.com/users/crazy-max/repos',
      site_admin: false,
      starred_url: 'https://api.github.com/users/crazy-max/starred{/owner}{/repo}',
      subscriptions_url: 'https://api.github.com/users/crazy-max/subscriptions',
      type: 'User',
      url: 'https://api.github.com/users/crazy-max'
    }
  }
};

export const getOctokit = jest.fn(() => ({
  rest: {
    repos: {
      getCommit: jest.fn(() =>
        Promise.resolve({
          data: {
            commit: {
              committer: {
                date: '2024-11-13T13:42:28Z'
              }
            }
          }
        })
      )
    }
  }
}));
