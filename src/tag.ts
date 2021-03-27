import csvparse from 'csv-parse/lib/sync';

export enum Type {
  Schedule = 'schedule',
  Semver = 'semver',
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

export interface Tag {
  type: Type;
  attrs: Record<string, string>;
}

export const DefaultPriorities: Record<Type, string> = {
  [Type.Schedule]: '1000',
  [Type.Semver]: '900',
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
  return tags.sort((tag1, tag2) => {
    if (Number(tag1.attrs['priority']) < Number(tag2.attrs['priority'])) {
      return 1;
    }
    if (Number(tag1.attrs['priority']) > Number(tag2.attrs['priority'])) {
      return -1;
    }
    return 0;
  });
}

export function Parse(s: string): Tag {
  const fields = csvparse(s, {
    relaxColumnCount: true,
    skipLinesWithEmptyValues: true
  })[0];

  const tag = {
    attrs: {}
  } as Tag;

  for (const field of fields) {
    const parts = field.toString().split('=', 2);
    if (parts.length == 1) {
      tag.attrs['value'] = parts[0].trim();
    } else {
      const key = parts[0].trim().toLowerCase();
      const value = parts[1].trim();
      switch (key) {
        case 'type': {
          if (!Object.values(Type).includes(value)) {
            throw new Error(`Unknown type attribute: ${value}`);
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
      if (!tag.attrs.hasOwnProperty('pattern')) {
        tag.attrs['pattern'] = 'nightly';
      }
      break;
    }
    case Type.Semver: {
      if (!tag.attrs.hasOwnProperty('pattern')) {
        throw new Error(`Missing pattern attribute for ${s}`);
      }
      if (!tag.attrs.hasOwnProperty('value')) {
        tag.attrs['value'] = '';
      }
      break;
    }
    case Type.Match: {
      if (!tag.attrs.hasOwnProperty('pattern')) {
        throw new Error(`Missing pattern attribute for ${s}`);
      }
      if (!tag.attrs.hasOwnProperty('group')) {
        tag.attrs['group'] = '0';
      }
      if (isNaN(+tag.attrs['group'])) {
        throw new Error(`Invalid match group for ${s}`);
      }
      if (!tag.attrs.hasOwnProperty('value')) {
        tag.attrs['value'] = '';
      }
      break;
    }
    case Type.Edge: {
      if (!tag.attrs.hasOwnProperty('branch')) {
        tag.attrs['branch'] = '';
      }
      break;
    }
    case Type.Ref: {
      if (!tag.attrs.hasOwnProperty('event')) {
        throw new Error(`Missing event attribute for ${s}`);
      }
      if (
        !Object.keys(RefEvent)
          .map(k => RefEvent[k])
          .includes(tag.attrs['event'])
      ) {
        throw new Error(`Invalid event for ${s}`);
      }
      if (tag.attrs['event'] == RefEvent.PR && !tag.attrs.hasOwnProperty('prefix')) {
        tag.attrs['prefix'] = 'pr-';
      }
      break;
    }
    case Type.Raw: {
      if (!tag.attrs.hasOwnProperty('value')) {
        throw new Error(`Missing value attribute for ${s}`);
      }
      break;
    }
    case Type.Sha: {
      if (!tag.attrs.hasOwnProperty('prefix')) {
        tag.attrs['prefix'] = 'sha-';
      }
      break;
    }
  }

  if (!tag.attrs.hasOwnProperty('enable')) {
    tag.attrs['enable'] = 'true';
  }
  if (!tag.attrs.hasOwnProperty('priority')) {
    tag.attrs['priority'] = DefaultPriorities[tag.type];
  }
  if (!tag.attrs.hasOwnProperty('prefix')) {
    tag.attrs['prefix'] = '';
  }
  if (!tag.attrs.hasOwnProperty('suffix')) {
    tag.attrs['suffix'] = '';
  }
  if (!['true', 'false'].includes(tag.attrs['enable'])) {
    throw new Error(`Invalid value for enable attribute: ${tag.attrs['enable']}`);
  }

  return tag;
}
