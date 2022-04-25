import {parse} from 'csv-parse/sync';
import * as core from '@actions/core';

export interface Flavor {
  latest: string;
  prefix: string;
  prefixLatest: boolean;
  suffix: string;
  suffixLatest: boolean;
}

export function Transform(inputs: string[]): Flavor {
  const flavor: Flavor = {
    latest: 'auto',
    prefix: '',
    prefixLatest: false,
    suffix: '',
    suffixLatest: false
  };

  for (const input of inputs) {
    const fields = parse(input, {
      relaxColumnCount: true,
      skipEmptyLines: true
    })[0];
    let onlatestfor = '';
    for (const field of fields) {
      const parts = field
        .toString()
        .split('=')
        .map(item => item.trim());
      if (parts.length == 1) {
        throw new Error(`Invalid flavor entry: ${input}`);
      }
      const key = parts[0].toLowerCase();
      const value = parts[1];
      switch (key) {
        case 'latest': {
          flavor.latest = value;
          if (!['auto', 'true', 'false'].includes(flavor.latest)) {
            throw new Error(`Invalid latest flavor entry: ${input}`);
          }
          break;
        }
        case 'prefix': {
          flavor.prefix = value;
          onlatestfor = 'prefix';
          break;
        }
        case 'suffix': {
          flavor.suffix = value;
          onlatestfor = 'suffix';
          break;
        }
        case 'onlatest': {
          if (!['true', 'false'].includes(value)) {
            throw new Error(`Invalid value for onlatest attribute: ${value}`);
          }
          switch (onlatestfor) {
            case 'prefix': {
              flavor.prefixLatest = /true/i.test(value);
              break;
            }
            case 'suffix': {
              flavor.suffixLatest = /true/i.test(value);
              break;
            }
          }
          break;
        }
        default: {
          throw new Error(`Unknown flavor entry: ${input}`);
        }
      }
    }
  }

  core.startGroup(`Processing flavor input`);
  core.info(`latest=${flavor.latest}`);
  core.info(`prefix=${flavor.prefix}`);
  core.info(`prefixLatest=${flavor.prefixLatest}`);
  core.info(`suffix=${flavor.suffix}`);
  core.info(`suffixLatest=${flavor.suffixLatest}`);
  core.endGroup();

  return flavor;
}
