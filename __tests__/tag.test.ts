import {describe, expect, test} from '@jest/globals';

import {Transform, Parse, Tag, Type, RefEvent, ShaFormat, DefaultPriorities} from '../src/tag';

describe('transform', () => {
  // prettier-ignore
  test.each([
    [
      [
        `type=ref,event=branch`,
        `type=ref,event=tag`,
        `type=ref,event=pr`,
        `type=schedule`,
        `type=sha`,
        `type=raw,foo`,
        `type=edge`,
        `type=semver,pattern={{version}}`,
        `type=match,"pattern=\\d.\\d.\\d",group=0`
      ],
      [
        {
          type: Type.Schedule,
          attrs: {
            "priority": DefaultPriorities[Type.Schedule],
            "enable": "true",
            "pattern": "nightly"
          }
        },
        {
          type: Type.Semver,
          attrs: {
            "priority": DefaultPriorities[Type.Semver],
            "enable": "true",
            "pattern": "{{version}}",
            "value": ""
          }
        },
        {
          type: Type.Match,
          attrs: {
            "priority": DefaultPriorities[Type.Match],
            "enable": "true",
            "pattern": "\\d.\\d.\\d",
            "group": "0",
            "value": ""
          }
        },
        {
          type: Type.Edge,
          attrs: {
            "priority": DefaultPriorities[Type.Edge],
            "enable": "true",
            "branch": ""
          }
        },
        {
          type: Type.Ref,
          attrs: {
            "priority": DefaultPriorities[Type.Ref],
            "enable": "true",
            "event": RefEvent.Branch
          }
        },
        {
          type: Type.Ref,
          attrs: {
            "priority": DefaultPriorities[Type.Ref],
            "enable": "true",
            "event": RefEvent.Tag
          }
        },
        {
          type: Type.Ref,
          attrs: {
            "priority": DefaultPriorities[Type.Ref],
            "enable": "true",
            "prefix": "pr-",
            "event": RefEvent.PR
          }
        },
        {
          type: Type.Raw,
          attrs: {
            "priority": DefaultPriorities[Type.Raw],
            "enable": "true",
            "value": "foo"
          }
        },
        {
          type: Type.Sha,
          attrs: {
            "priority": DefaultPriorities[Type.Sha],
            "enable": "true",
            "prefix": "sha-",
            "format": ShaFormat.Short
          }
        }
      ] as Tag[],
      false
    ]
  ])('given %p', async (l: string[], expected: Tag[], invalid: boolean) => {
    try {
      const tags = Transform(l);
      expect(tags).toEqual(expected);
    } catch (err) {
      if (!invalid) {
        console.error(err);
      }
      // eslint-disable-next-line jest/no-conditional-expect
      expect(true).toBe(invalid);
    }
  });
});

describe('parse', () => {
  // prettier-ignore
  test.each([
    [
      `type=schedule,enable=true,pattern={{date 'YYYYMMDD'}}`,
      {
        type: Type.Schedule,
        attrs: {
          "priority": DefaultPriorities[Type.Schedule],
          "enable": "true",
          "pattern": "{{date 'YYYYMMDD'}}"
        }
      } as Tag,
      false
    ],
    [
      `type=schedule,enable=true,pattern={{date 'YYYYMMDD' tz='Asia/Tokyo'}}`,
      {
        type: Type.Schedule,
        attrs: {
          "priority": DefaultPriorities[Type.Schedule],
          "enable": "true",
          "pattern": `{{date 'YYYYMMDD' tz='Asia/Tokyo'}}`
        }
      } as Tag,
      false
    ],
    [
      `type=semver,enable=true,pattern={{version}}`,
      {
        type: Type.Semver,
        attrs: {
          "priority": DefaultPriorities[Type.Semver],
          "enable": "true",
          "pattern": "{{version}}",
          "value": ""
        }
      } as Tag,
      false
    ],
    [
      `type=semver,priority=1,enable=true,pattern={{version}}`,
      {
        type: Type.Semver,
        attrs: {
          "priority": "1",
          "enable": "true",
          "pattern": "{{version}}",
          "value": ""
        }
      } as Tag,
      false
    ],
    [
      `type=semver,priority=1,enable=true,pattern={{version}},value=v1.0.0`,
      {
        type: Type.Semver,
        attrs: {
          "priority": "1",
          "enable": "true",
          "pattern": "{{version}}",
          "value": "v1.0.0"
        }
      } as Tag,
      false
    ],
    [
      `type=match,enable=true,pattern=v(.*),group=1`,
      {
        type: Type.Match,
        attrs: {
          "priority": DefaultPriorities[Type.Match],
          "enable": "true",
          "pattern": "v(.*)",
          "group": "1",
          "value": ""
        }
      } as Tag,
      false
    ],
    [
      `type=match,enable=true,"pattern=^v(\\d.\\d.\\d)$",group=1`,
      {
        type: Type.Match,
        attrs: {
          "priority": DefaultPriorities[Type.Match],
          "enable": "true",
          "pattern": "^v(\\d.\\d.\\d)$",
          "group": "1",
          "value": ""
        }
      } as Tag,
      false
    ],
    [
      `type=match,priority=700,enable=true,pattern=v(.*),group=1`,
      {
        type: Type.Match,
        attrs: {
          "priority": "700",
          "enable": "true",
          "pattern": "v(.*)",
          "group": "1",
          "value": ""
        }
      } as Tag,
      false
    ],
    [
      `type=match,enable=true,pattern=v(.*),group=1,value=v1.2.3`,
      {
        type: Type.Match,
        attrs: {
          "priority": DefaultPriorities[Type.Match],
          "enable": "true",
          "pattern": "v(.*)",
          "group": "1",
          "value": "v1.2.3"
        }
      } as Tag,
      false
    ],
    [
      `type=match,enable=true,pattern=v(.*),group=foo`,
      {} as Tag,
      true
    ],
    [
      `type=edge`,
      {
        type: Type.Edge,
        attrs: {
          "priority": DefaultPriorities[Type.Edge],
          "enable": "true",
          "branch": ""
        }
      } as Tag,
      false
    ],
    [
      `type=edge,enable=true,branch=master`,
      {
        type: Type.Edge,
        attrs: {
          "priority": DefaultPriorities[Type.Edge],
          "enable": "true",
          "branch": "master"
        }
      } as Tag,
      false
    ],
    [
      `type=ref,event=tag`,
      {
        type: Type.Ref,
        attrs: {
          "priority": DefaultPriorities[Type.Ref],
          "enable": "true",
          "event": RefEvent.Tag
        }
      } as Tag,
      false
    ],
    [
      `type=ref,event=branch`,
      {
        type: Type.Ref,
        attrs: {
          "priority": DefaultPriorities[Type.Ref],
          "enable": "true",
          "event": RefEvent.Branch
        }
      } as Tag,
      false
    ],
    [
      `type=ref,event=pr`,
      {
        type: Type.Ref,
        attrs: {
          "priority": DefaultPriorities[Type.Ref],
          "enable": "true",
          "prefix": "pr-",
          "event": RefEvent.PR
        }
      } as Tag,
      false
    ],
    [
      `type=ref,event=foo`,
      {} as Tag,
      true
    ],
    [
      `type=ref`,
      {} as Tag,
      true
    ],
    [
      `acustomtag`,
      {
        type: Type.Raw,
        attrs: {
          "priority": DefaultPriorities[Type.Raw],
          "enable": "true",
          "value": "acustomtag"
        }
      } as Tag,
      false
    ],
    [
      `type=raw`,
      {} as Tag,
      true
    ],
    [
      `type=raw,value=acustomtag2`,
      {
        type: Type.Raw,
        attrs: {
          "priority": DefaultPriorities[Type.Raw],
          "enable": "true",
          "value": "acustomtag2"
        }
      } as Tag,
      false
    ],
    [
      `type=raw,enable=true,value=acustomtag4`,
      {
        type: Type.Raw,
        attrs: {
          "priority": DefaultPriorities[Type.Raw],
          "enable": "true",
          "value": "acustomtag4"
        }
      } as Tag,
      false
    ],
    [
      `type=raw,enable=false,value=acustomtag5`,
      {
        type: Type.Raw,
        attrs: {
          "priority": DefaultPriorities[Type.Raw],
          "enable": "false",
          "value": "acustomtag5"
        }
      } as Tag,
      false
    ],
    [
      `type=sha`,
      {
        type: Type.Sha,
        attrs: {
          "priority": DefaultPriorities[Type.Sha],
          "enable": "true",
          "prefix": "sha-",
          "format": ShaFormat.Short
        }
      } as Tag,
      false
    ],
    [
      `type=sha,format=long`,
      {
        type: Type.Sha,
        attrs: {
          "priority": DefaultPriorities[Type.Sha],
          "enable": "true",
          "prefix": "sha-",
          "format": ShaFormat.Long
        }
      } as Tag,
      false
    ],
    [
      `type=sha,prefix=`,
      {
        type: Type.Sha,
        attrs: {
          "priority": DefaultPriorities[Type.Sha],
          "enable": "true",
          "prefix": "",
          "format": ShaFormat.Short
        }
      } as Tag,
      false
    ],
    [
      `type=sha,enable=false`,
      {
        type: Type.Sha,
        attrs: {
          "priority": DefaultPriorities[Type.Sha],
          "enable": "false",
          "prefix": "sha-",
          "format": ShaFormat.Short
        }
      } as Tag,
      false
    ],
    [
      `type=semver`,
      {} as Tag,
      true
    ],
    [
      `type=match`,
      {} as Tag,
      true
    ],
    [
      `type=foo`,
      {} as Tag,
      true
    ],
    [
      `type=sha,format=foo`,
      {} as Tag,
      true
    ]
  ])('given %p event', async (s: string, expected: Tag, invalid: boolean) => {
    try {
      const tag = Parse(s);
      expect(tag).toEqual(expected);
    } catch (err) {
      if (!invalid) {
        console.error(err);
      }
      // eslint-disable-next-line jest/no-conditional-expect
      expect(true).toBe(invalid);
    }
  });
});
