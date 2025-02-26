import * as fs from 'fs';
import * as core from '@actions/core';
import * as actionsToolkit from '@docker/actions-toolkit';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit';
import {Util} from '@docker/actions-toolkit/lib/util';

import {getContext, getInputs, Inputs} from './context';
import {Meta, Version} from './meta';

actionsToolkit.run(
  // main
  async () => {
    const inputs: Inputs = getInputs();
    const toolkit = new Toolkit({githubToken: inputs.githubToken});
    const context = await getContext(inputs.context, toolkit);
    const repo = await toolkit.github.repoData();
    const setOutput = outputEnvEnabled() ? setOutputAndEnv : core.setOutput;

    await core.group(`Context info`, async () => {
      core.info(`eventName: ${context.eventName}`);
      core.info(`sha: ${context.sha}`);
      core.info(`ref: ${context.ref}`);
      core.info(`workflow: ${context.workflow}`);
      core.info(`action: ${context.action}`);
      core.info(`actor: ${context.actor}`);
      core.info(`runNumber: ${context.runNumber}`);
      core.info(`runId: ${context.runId}`);
      core.info(`commitDate: ${context.commitDate}`);
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

    // Annotations
    const annotationsRaw: Array<string> = meta.getAnnotations();
    const annotationsLevels = process.env.DOCKER_METADATA_ANNOTATIONS_LEVELS || 'manifest';
    await core.group(`Annotations`, async () => {
      const annotations: Array<string> = [];
      for (const level of annotationsLevels.split(',')) {
        annotations.push(
          ...annotationsRaw.map(label => {
            const v = `${level}:${label}`;
            core.info(v);
            return v;
          })
        );
      }
      setOutput(`annotations`, annotations.join(inputs.sepAnnotations));
    });

    // JSON
    const jsonOutput = meta.getJSON(annotationsLevels.split(','));
    await core.group(`JSON output`, async () => {
      core.info(JSON.stringify(jsonOutput, null, 2));
      setOutput('json', JSON.stringify(jsonOutput));
    });

    // Bake files
    for (const kind of ['tags', 'labels', 'annotations:' + annotationsLevels]) {
      const outputName = kind.split(':')[0];
      const bakeFile: string = meta.getBakeFile(kind);
      await core.group(`Bake file definition (${outputName})`, async () => {
        core.info(fs.readFileSync(bakeFile, 'utf8'));
        setOutput(`bake-file-${outputName}`, bakeFile);
      });
    }

    // Bake file with tags and labels
    setOutput(`bake-file`, `${meta.getBakeFileTagsLabels()}`);
  }
);

function setOutputAndEnv(name: string, value: string) {
  core.setOutput(name, value);
  core.exportVariable(`DOCKER_METADATA_OUTPUT_${name.replace(/\W/g, '_').toUpperCase()}`, value);
}

function outputEnvEnabled(): boolean {
  if (process.env.DOCKER_METADATA_SET_OUTPUT_ENV) {
    return Util.parseBool(process.env.DOCKER_METADATA_SET_OUTPUT_ENV);
  }
  return true;
}
