import * as core from '@actions/core';

export interface Flavor {
  latest: string;
  prefix: string;
  suffix: string;
  on_latest: string;
}

export function Transform(inputs: string[]): Flavor {
  const flavor: Flavor = {
    latest: 'auto',
    prefix: '',
    suffix: '',
    on_latest: 'false'
  };

  for (const input of inputs) {
    const parts = input.split('=', 2);
    if (parts.length == 1) {
      throw new Error(`Invalid entry: ${input}`);
    }
    switch (parts[0]) {
      case 'latest': {
        flavor.latest = parts[1];
        if (!['auto', 'true', 'false'].includes(flavor.latest)) {
          throw new Error(`Invalid latest flavor entry: ${input}`);
        }
        break;
      }
      case 'prefix': {
        flavor.prefix = parts[1];
        break;
      }
      case 'suffix': {
        flavor.suffix = parts[1];
        break;
      }
      case 'on_latest': {
        flavor.on_latest = parts[1];
        if (!['true', 'false'].includes(flavor.on_latest)) {
          throw new Error(`Invalid on_latest flavor entry: ${input}`);
        }
        break;
      }
      default: {
        throw new Error(`Unknown entry: ${input}`);
      }
    }
  }

  core.startGroup(`Processing flavor input`);
  core.info(`latest=${flavor.latest}`);
  core.info(`prefix=${flavor.prefix}`);
  core.info(`suffix=${flavor.suffix}`);
  core.info(`on_latest=${flavor.on_latest}`);

  core.endGroup();

  return flavor;
}
