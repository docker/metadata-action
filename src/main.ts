import * as fs from 'fs';
import * as core from '@actions/core';
import * as actionsToolkit from '@docker/actions-toolkit';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit';

import {getContext, getInputs, Inputs} from './context';
import {Meta, Version} from './meta';

function setOutput(name: string, value: string) {
  core.setOutput(name, value);
  core.exportVariable(`DOCKER_METADATA_OUTPUT_${name.replace(/\W/g, '_').toUpperCase()}`, value);
}

actionsToolkit.run(
  // main
  async () => {
    const inputs: Inputs = getInputs();
    const toolkit = new Toolkit({githubToken: inputs.githubToken});
    const context = await getContext(inputs.context);
    const repo = await toolkit.github.repoData();

    await core.group(`Context info`, async () => {
      core.info(`eventName: ${context.eventName}`);
      core.info(`sha: ${context.sha}`);
      core.info(`ref: ${context.ref}`);
      core.info(`workflow: ${context.workflow}`);
      core.info(`action: ${context.action}`);
      core.info(`actor: ${context.actor}`);
      core.info(`runNumber: ${context.runNumber}`);
      core.info(`runId: ${context.runId}`);
    });

    if (core.isDebug()) {
      await core.group(`Webhook payload`, async () => {
        core.info(JSON.stringify(context.payload, null, 2));
      });
    }

    const meta: Meta = new Meta(inputs, context, repo);

    const version: Version = meta.version;
    if (meta.version.main == undefined || meta.version.main.length == 0) {
      core.warning(`No Docker image version has been generated. Check tags input.`);
    } else {
      await core.group(`Docker image version`, async () => {
        core.info(version.main || '');
      });
    }
    setOutput('version', version.main || '');

    // Docker tags
    const tags: Array<string> = meta.getTags();
    if (tags.length == 0) {
      core.warning('No Docker tag has been generated. Check tags input.');
    } else {
      await core.group(`Docker tags`, async () => {
        for (const tag of tags) {
          core.info(tag);
        }
      });
    }
    setOutput('tags', tags.join(inputs.sepTags));

    // Docker labels
    const labels: Array<string> = meta.getLabels();
    await core.group(`Docker labels`, async () => {
      for (const label of labels) {
        core.info(label);
      }
      setOutput('labels', labels.join(inputs.sepLabels));
    });

    // JSON
    const jsonOutput = meta.getJSON();
    await core.group(`JSON output`, async () => {
      core.info(JSON.stringify(jsonOutput, null, 2));
      setOutput('json', JSON.stringify(jsonOutput));
    });

    // Bake file definition
    const bakeFile: string = meta.getBakeFile();
    await core.group(`Bake file definition`, async () => {
      core.info(fs.readFileSync(bakeFile, 'utf8'));
      setOutput('bake-file', bakeFile);
    });
  }
);
