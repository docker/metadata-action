interface ExplainedVersion {
  epoch: number;
  release: [number, number, number];
  pre?: [string, number];
  post?: number;
  dev?: number;
  local?: string;
  public: string;
  base_version: string;
  is_prerelease: boolean;
  is_devrelease: boolean;
  is_postrelease: boolean;
}

interface Version {
  epoch: number;
  release: [number, number, number];
  pre?: [string, number] | null;
  post?: [string, number] | null;
  dev?: [string, number] | null;
  local?: Array<number> | null;
  public: string;
  base_version: string;
}

declare module '@renovate/pep440' {
  function valid(version: string): string | null;
  function clean(version: string): string;
  function explain(version: string): ExplainedVersion;
  function major(input: string): string;
  function minor(input: string): string;
  function patch(input: string): string;
  function inc(input: string, release: string, preReleaseIdentifier?: string): string;
}

declare module '@renovate/pep440/lib/version' {
  function stringify(parsed: Version): string;
  function parse(version: string): Version;
}
