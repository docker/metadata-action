import simpleGit, {SimpleGit} from 'simple-git';

export interface GitContext {
  sha: string;
  ref: string;
  commitDate: Date;
  remoteUrl?: string;
  defaultBranch: string;
}

export interface Repo {
  name: string;
  description?: string;
  url?: string;
  default_branch: string;
  license?: string;
}

export async function getGitContext(): Promise<GitContext> {
  const git: SimpleGit = simpleGit();

  try {
    const sha = await git.revparse(['HEAD']);

    let ref = '';
    if (process.env.GITHUB_REF) {
      ref = process.env.GITHUB_REF;
    } else {
      try {
        ref = await git.revparse(['--symbolic-full-name', 'HEAD']);
      } catch {
        try {
          const tag = await git.raw(['describe', '--tags', '--exact-match']);
          if (tag) {
            ref = `refs/tags/${tag.trim()}`;
          }
        } catch {
          ref = 'HEAD';
        }
      }
    }

    const commitDateStr = await git.show(['-s', '--format=%cI', 'HEAD']);
    const commitDate = commitDateStr ? new Date(commitDateStr.trim()) : new Date();

    let remoteUrl = '';
    try {
      const url = await git.remote(['get-url', 'origin']);
      remoteUrl = url ? url.trim() : '';
    } catch {
      // No remote configured
    }

    let defaultBranch = '';
    try {
      const remoteHead = await git.revparse(['--symbolic-full-name', 'refs/remotes/origin/HEAD']);
      if (remoteHead) {
        defaultBranch = remoteHead.trim().replace(/^refs\/remotes\/origin\//, '');
      }
    } catch {
      try {
        const branches = await git.branch(['-r']);
        if (branches.all.includes('origin/main')) {
          defaultBranch = 'main';
        } else if (branches.all.includes('origin/master')) {
          defaultBranch = 'master';
        }
      } catch {
        defaultBranch = 'main';
      }
    }

    return {
      sha: sha.trim(),
      ref: ref.trim(),
      commitDate,
      remoteUrl,
      defaultBranch
    };
  } catch (error) {
    throw new Error(`Failed to get git context: ${(error as Error).message}`);
  }
}

export function parseRepoFromRemoteUrl(remoteUrl: string, defaultBranch: string): Repo {
  let name = '';
  let url = '';

  if (remoteUrl) {
    const sshMatch = remoteUrl.match(/git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
    const httpsMatch = remoteUrl.match(/https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);

    if (sshMatch) {
      const [, host, user, repo] = sshMatch;
      name = repo;
      url = `https://${host}/${user}/${repo}`;
    } else if (httpsMatch) {
      const [, host, user, repo] = httpsMatch;
      name = repo;
      url = `https://${host}/${user}/${repo}`;
    } else {
      const parts = remoteUrl.split('/');
      name = parts[parts.length - 1].replace(/\.git$/, '');
      url = remoteUrl;
    }
  }

  return {
    name,
    url,
    default_branch: defaultBranch,
    description: '',
    license: ''
  };
}

