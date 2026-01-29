import {describe, expect, test} from '@jest/globals';

import {Transform, Annotation} from '../src/annotation';

describe('annotation transform', () => {
  test.each([
    [
      [`org.opencontainers.image.version=1.1.1`],
      [
        {
          name: `org.opencontainers.image.version`,
          value: `1.1.1`,
          enable: true
        }
      ] as Annotation[],
      false
    ],
    [
      [`name=my.annotation,value="my value",enable=true`],
      [
        {
          name: `my.annotation`,
          value: `"my value"`,
          enable: true
        }
      ] as Annotation[],
      false
    ],
    [
      [`name=my.annotation,value=myvalue,enable=false`],
      [
        {
          name: `my.annotation`,
          value: `myvalue`,
          enable: false
        }
      ] as Annotation[],
      false
    ],
    [
      [`my.annotation=my value`],
      [
        {
          name: `my.annotation`,
          value: `my value`,
          enable: true
        }
      ] as Annotation[],
      false
    ],
    [
      [`name=,value=val`], // empty name
      undefined,
      true
    ],
    [
      [`name=org.opencontainers.image.url,enable=false`], // empty value
      [
        {
          name: `org.opencontainers.image.url`,
          value: null,
          enable: false
        }
      ] as Annotation[],
      false
    ],
    [
      [`name=my.annotation,value=myvalue,enable=bar`], // invalid enable
      undefined,
      true
    ]
  ])('given %p', async (l: string[], expected: Annotation[] | undefined, invalid: boolean) => {
    try {
      const annotations = Transform(l);
      expect(annotations).toEqual(expected);
    } catch (err) {
      if (!invalid) {
        console.error(err);
      }
      expect(invalid).toBeTruthy();
    }
  });
});
