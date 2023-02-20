import * as core from '@actions/core';
import {Util} from '@docker/actions-toolkit/lib/util';

export interface Inputs {
  images: string[];
  tags: string[];
  flavor: string[];
  labels: string[];
  sepTags: string;
  sepLabels: string;
  bakeTarget: string;
  githubToken: string;
}

export function getInputs(): Inputs {
  return {
    images: Util.getInputList('images', {ignoreComma: true}),
    tags: Util.getInputList('tags', {ignoreComma: true}),
    flavor: Util.getInputList('flavor', {ignoreComma: true}),
    labels: Util.getInputList('labels', {ignoreComma: true}),
    sepTags: core.getInput('sep-tags', {trimWhitespace: false}) || `\n`,
    sepLabels: core.getInput('sep-labels', {trimWhitespace: false}) || `\n`,
    bakeTarget: core.getInput('bake-target') || `docker-metadata-action`,
    githubToken: core.getInput('github-token')
  };
}
