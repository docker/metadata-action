import {parse} from 'csv-parse/sync';
import * as core from '@actions/core';

export enum Type {
  Schedule = 'schedule',
  Semver = 'semver',
  Pep440 = 'pep440',
  Match = 'match',
  Edge = 'edge',
  Ref = 'ref',
  Raw = 'raw',
  Sha = 'sha'
}

export enum RefEvent {
  Branch = 'branch',
  Tag = 'tag',
  PR = 'pr'
}

export enum ShaFormat {
  Short = 'short',
  Long = 'long'
}

export class Tag {
  public type?: Type;
  public attrs: Record<string, string>;

  constructor() {
    this.attrs = {};
  }

  public toString(): string {
    const out: string[] = [`type=${this.type}`];
    for (const attr in this.attrs) {
      out.push(`${attr}=${this.attrs[attr]}`);
    }
    return out.join(',');
  }
}

export const DefaultPriorities: Record<Type, string> = {
  [Type.Schedule]: '1000',
  [Type.Semver]: '900',
  [Type.Pep440]: '900',
  [Type.Match]: '800',
  [Type.Edge]: '700',
  [Type.Ref]: '600',
  [Type.Raw]: '200',
  [Type.Sha]: '100'
};

export function Transform(inputs: string[]): Tag[] {
  const tags: Tag[] = [];
  if (inputs.length == 0) {
    // prettier-ignore
    inputs = [
      `type=schedule`,
      `type=ref,event=${RefEvent.Branch}`,
      `type=ref,event=${RefEvent.Tag}`,
      `type=ref,event=${RefEvent.PR}`
    ];
  }

  for (const input of inputs) {
    tags.push(Parse(input));
  }
  const sorted = tags.sort((tag1, tag2) => {
    if (Number(tag1.attrs['priority']) < Number(tag2.attrs['priority'])) {
      return 1;
    }
    if (Number(tag1.attrs['priority']) > Number(tag2.attrs['priority'])) {
      return -1;
    }
    return 0;
  });

  core.startGroup(`Processing tags input`);
  for (const tag of sorted) {
    core.info(tag.toString());
  }
  core.endGroup();

  return sorted;
}

export function Parse(s: string): Tag {
  const fields = parse(s, {
    relaxColumnCount: true,
    skipEmptyLines: true
  })[0];

  const tag = new Tag();
  for (const field of fields) {
    const parts = field
      .toString()
      .split(/(?<=^[^=]+?)=/)
      .map(item => item.trim());
    if (parts.length == 1) {
      tag.attrs['value'] = parts[0];
    } else {
      const key = parts[0].toLowerCase();
      const value = parts[1];
      switch (key) {
        case 'type': {
          if (!Object.values(Type).includes(value)) {
            throw new Error(`Unknown tag type attribute: ${value}`);
          }
          tag.type = value;
          break;
        }
        default: {
          tag.attrs[key] = value;
          break;
        }
      }
    }
  }

  if (tag.type == undefined) {
    tag.type = Type.Raw;
  }

  switch (tag.type) {
    case Type.Schedule: {
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'pattern')) {
        tag.attrs['pattern'] = 'nightly';
      }
      break;
    }
    case Type.Semver:
    case Type.Pep440: {
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'pattern')) {
        throw new Error(`Missing pattern attribute for ${s}`);
      }
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'value')) {
        tag.attrs['value'] = '';
      }
      break;
    }
    case Type.Match: {
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'pattern')) {
        throw new Error(`Missing pattern attribute for ${s}`);
      }
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'group')) {
        tag.attrs['group'] = '0';
      }
      if (isNaN(+tag.attrs['group'])) {
        throw new Error(`Invalid match group for ${s}`);
      }
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'value')) {
        tag.attrs['value'] = '';
      }
      break;
    }
    case Type.Edge: {
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'branch')) {
        tag.attrs['branch'] = '';
      }
      break;
    }
    case Type.Ref: {
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'event')) {
        throw new Error(`Missing event attribute for ${s}`);
      }
      if (
        !Object.keys(RefEvent)
          .map(k => RefEvent[k])
          .includes(tag.attrs['event'])
      ) {
        throw new Error(`Invalid event for ${s}`);
      }
      if (tag.attrs['event'] == RefEvent.PR && !Object.prototype.hasOwnProperty.call(tag.attrs, 'prefix')) {
        tag.attrs['prefix'] = 'pr-';
      }
      break;
    }
    case Type.Raw: {
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'value')) {
        throw new Error(`Missing value attribute for ${s}`);
      }
      break;
    }
    case Type.Sha: {
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'prefix')) {
        tag.attrs['prefix'] = 'sha-';
      }
      if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'format')) {
        tag.attrs['format'] = ShaFormat.Short;
      }
      if (
        !Object.keys(ShaFormat)
          .map(k => ShaFormat[k])
          .includes(tag.attrs['format'])
      ) {
        throw new Error(`Invalid format for ${s}`);
      }
      break;
    }
  }

  if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'enable')) {
    tag.attrs['enable'] = 'true';
  }
  if (!Object.prototype.hasOwnProperty.call(tag.attrs, 'priority')) {
    tag.attrs['priority'] = DefaultPriorities[tag.type];
  }

  return tag;
}
