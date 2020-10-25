import {getInputs, Inputs} from './context';
import * as github from './github';
import {Meta} from './meta';
import * as core from '@actions/core';
import {Context} from '@actions/github/lib/context';
import {ReposGetResponseData} from '@octokit/types';

async function run() {
  try {
    const inputs: Inputs = await getInputs();
    if (inputs.images.length == 0) {
      throw new Error(`images input required`);
    }

    const context: Context = github.context();
    const repo: ReposGetResponseData = await github.repo(inputs.githubToken);
    core.startGroup(`Context info`);
    core.info(`repo: ${context.repo}`);
    core.info(`eventName: ${context.eventName}`);
    core.info(`sha: ${context.sha}`);
    core.info(`ref: ${context.ref}`);
    core.info(`workflow: ${context.workflow}`);
    core.info(`action: ${context.action}`);
    core.info(`actor: ${context.actor}`);
    core.info(`runNumber: ${context.runNumber}`);
    core.info(`runId: ${context.runId}`);
    core.endGroup();

    const meta: Meta = new Meta(inputs, context, repo);

    const tags: Array<string> = meta.tags();
    core.startGroup(`Generated Docker tags`);
    core.info(JSON.stringify(tags));
    core.endGroup();
    core.setOutput('tags', tags.join(inputs.sepTags));

    const labels: Array<string> = meta.labels();
    core.startGroup(`Generated Docker labels`);
    core.info(JSON.stringify(labels));
    core.endGroup();
    core.setOutput('labels', labels.join(inputs.sepTags));
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
