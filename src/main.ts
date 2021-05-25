import * as fs from 'fs';
import {getInputs, Inputs, setOutput} from './context';
import * as github from './github';
import {Meta, Version} from './meta';
import * as core from '@actions/core';
import {Context} from '@actions/github/lib/context';

async function run() {
  try {
    const inputs: Inputs = await getInputs();
    if (inputs.images.length == 0) {
      throw new Error(`images input required`);
    }

    const context: Context = github.context();
    const repo: github.ReposGetResponseData = await github.repo(inputs.githubToken);
    core.startGroup(`Context info`);
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

    const version: Version = meta.version;
    if (meta.version.main == undefined || meta.version.main.length == 0) {
      core.warning(`No Docker image version has been generated. Check tags input.`);
    } else {
      core.startGroup(`Docker image version`);
      core.info(version.main || '');
      core.endGroup();
    }
    setOutput('version', version.main || '');

    // Docker tags
    const tags: Array<string> = meta.getTags();
    if (tags.length == 0) {
      core.warning('No Docker tag has been generated. Check tags input.');
    } else {
      core.startGroup(`Docker tags`);
      for (let tag of tags) {
        core.info(tag);
      }
      core.endGroup();
    }
    setOutput('tags', tags.join(inputs.sepTags));

    // Docker labels
    const labels: Array<string> = meta.getLabels();
    core.startGroup(`Docker labels`);
    for (let label of labels) {
      core.info(label);
    }
    core.endGroup();
    setOutput('labels', labels.join(inputs.sepLabels));

    // JSON
    const jsonOutput = meta.getJSON();
    core.startGroup(`JSON output`);
    core.info(JSON.stringify(jsonOutput, null, 2));
    core.endGroup();
    setOutput('json', jsonOutput);

    // Bake definition file
    const bakeFile: string = meta.getBakeFile();
    core.startGroup(`Bake definition file`);
    core.info(fs.readFileSync(bakeFile, 'utf8'));
    core.endGroup();
    setOutput('bake-file', bakeFile);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
