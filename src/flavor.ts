import * as core from '@actions/core';

export interface Flavor {
  latest: string;
  prefix: string;
  suffix: string;
}

export function Transform(inputs: string[]): Flavor {
  const flavor: Flavor = {
    latest: 'auto',
    prefix: '',
    suffix: ''
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
      default: {
        throw new Error(`Unknown entry: ${input}`);
      }
    }
  }

  core.startGroup(`Processing flavor input`);
  core.info(`latest=${flavor.latest}`);
  core.info(`prefix=${flavor.prefix}`);
  core.info(`suffix=${flavor.suffix}`);
  core.endGroup();

  return flavor;
}
