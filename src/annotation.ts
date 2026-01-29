import {parse} from 'csv-parse/sync';
import * as core from '@actions/core';

export interface Annotation {
  name: string;
  value: string | null;
  enable: boolean;
}

export function Transform(inputs: string[]): Annotation[] {
  let annotations: Annotation[] = [];

  for (const input of inputs) {
    const annotation: Annotation = {name: '', value: null, enable: true};
    const fields = parse(input, {
      relaxColumnCount: true,
      relaxQuotes: true,
      skipEmptyLines: true
    })[0];
    let usesAttributes = false;

    for (const field of fields) {
      const parts = field
        .toString()
        .split('=')
        .map(item => item.trim());
      if (parts.length > 0) {
        const key = parts[0].toLowerCase();
        if (['name', 'value', 'enable'].includes(key)) {
          usesAttributes = true;
          break;
        }
      }
    }

    if (usesAttributes) {
      for (const field of fields) {
        const parts = field
          .toString()
          .split('=')
          .map(item => item.trim());
        if (parts.length === 1) {
          annotation.name = parts[0];
        } else {
          const key = parts[0].toLowerCase();
          const value = parts.slice(1).join('='); // preserve '=' in values if any
          switch (key) {
            case 'name': {
              annotation.name = value;
              break;
            }
            case 'value': {
              annotation.value = value;
              break;
            }
            case 'enable': {
              if (!['true', 'false'].includes(value.toLowerCase())) {
                throw new Error(`Invalid enable attribute value: ${input}`);
              }
              annotation.enable = /true/i.test(value);
              break;
            }
            default: {
              throw new Error(`Unknown annotation attribute: ${input}`);
            }
          }
        }
      }
    } else {
      const idx = input.indexOf('=');
      if (idx === -1) {
        annotation.name = input.trim();
      } else {
        annotation.name = input.substring(0, idx).trim();
        annotation.value = input.substring(idx + 1).trim();
      }
      annotation.enable = true;
    }

    if (annotation.name.length === 0) {
      throw new Error(`Annotation name attribute empty: ${input}`);
    }

    annotations.push(annotation);
  }

  return output(annotations);
}

function output(annotations: Annotation[]): Annotation[] {
  core.startGroup(`Processing annotations input`);
  for (const annotation of annotations) {
    core.info(`name=${annotation.name},value=${annotation.value},enable=${annotation.enable}`);
  }
  core.endGroup();
  return annotations;
}
