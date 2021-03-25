import {Flavor, Transform} from '../src/flavor';

describe('transform', () => {
  // prettier-ignore
  test.each([
    [
      [
        `randomstr`,
        `latest=auto`
      ],
      {} as Flavor,
      true
    ],
    [
      [
        `unknwown=foo`
      ],
      {} as Flavor,
      true
    ],
    [
      [
        `latest`,
      ],
      {} as Flavor,
      true
    ],
    [
      [
        `latest=true`
      ],
      {
        latest: "true",
        prefix: "",
        suffix: ""
      } as Flavor,
      false
    ],
    [
      [
        `latest=false`
      ],
      {
        latest: "false",
        prefix: "",
        suffix: ""
      } as Flavor,
      false
    ],
    [
      [
        `latest=auto`
      ],
      {
        latest: "auto",
        prefix: "",
        suffix: ""
      } as Flavor,
      false
    ],
    [
      [
        `latest=foo`
      ],
      {} as Flavor,
      true
    ],
    [
      [
        `prefix=sha-`
      ],
      {
        latest: "auto",
        prefix: "sha-",
        suffix: ""
      } as Flavor,
      false
    ],
    [
      [
        `suffix=-alpine`
      ],
      {
        latest: "auto",
        prefix: "",
        suffix: "-alpine"
      } as Flavor,
      false
    ],
    [
      [
        `latest=false`,
        `prefix=dev-`,
        `suffix=-alpine`
      ],
      {
        latest: "false",
        prefix: "dev-",
        suffix: "-alpine"
      } as Flavor,
      false
    ],
  ])('given %p attributes ', async (inputs: string[], expected: Flavor, invalid: boolean) => {
    try {
      const flavor = Transform(inputs);
      console.log(flavor);
      expect(flavor).toEqual(expected);
    } catch (err) {
      if (!invalid) {
        console.error(err);
      }
      expect(true).toBe(invalid);
    }
  });
});
