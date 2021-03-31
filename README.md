[![GitHub release](https://img.shields.io/github/release/crazy-max/ghaction-docker-meta.svg?style=flat-square)](https://github.com/crazy-max/ghaction-docker-meta/releases/latest)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-docker--meta-blue?logo=github&style=flat-square)](https://github.com/marketplace/actions/docker-meta)
[![Test workflow](https://img.shields.io/github/workflow/status/crazy-max/ghaction-docker-meta/test?label=test&logo=github&style=flat-square)](https://github.com/crazy-max/ghaction-docker-meta/actions?workflow=test)
[![Codecov](https://img.shields.io/codecov/c/github/crazy-max/ghaction-docker-meta?logo=codecov&style=flat-square)](https://codecov.io/gh/crazy-max/ghaction-docker-meta)
[![Become a sponsor](https://img.shields.io/badge/sponsor-crazy--max-181717.svg?logo=github&style=flat-square)](https://github.com/sponsors/crazy-max)
[![Paypal Donate](https://img.shields.io/badge/donate-paypal-00457c.svg?logo=paypal&style=flat-square)](https://www.paypal.me/crazyws)

## Upgrade from v1

`v2` of this action includes significant changes. Please read the [upgrade notes](UPGRADE.md) for a smooth migration.

## About

GitHub Action to extract metadata (tags, labels) for Docker. This action is particularly useful if used with
[Docker Build Push](https://github.com/docker/build-push-action) action.

If you are interested, [check out](https://git.io/Je09Y) my other :octocat: GitHub Actions!

![Screenshot](.github/ghaction-docker-meta.png)

___

* [Usage](#usage)
  * [Basic](#basic)
  * [Semver](#semver)
  * [Bake definition](#bake-definition)
* [Customizing](#customizing)
  * [inputs](#inputs)
  * [outputs](#outputs)
* [`flavor` input](#flavor-input)
* [`tags` input](#tags-input)
  * [`type=schedule`](#typeschedule)
  * [`type=semver`](#typesemver)
  * [`type=match`](#typematch)
  * [`type=edge`](#typeedge)
  * [`type=ref`](#typeref)
  * [`type=raw`](#typeraw)
  * [`type=sha`](#typesha)
* [Notes](#notes)
  * [Latest tag](#latest-tag)
  * [Overwrite labels](#overwrite-labels)
* [Keep up-to-date with GitHub Dependabot](#keep-up-to-date-with-github-dependabot)
* [Contributing](#contributing)
* [License](#license)

## Usage

### Basic

```yaml
name: ci

on:
  push:
    branches:
      - 'master'
    tags:
      - 'v*'
  pull_request:
    branches:
      - 'master'

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v2
      -
        name: Docker meta
        id: meta
        uses: crazy-max/ghaction-docker-meta@v2
        with:
          images: name/app
      -
        name: Login to DockerHub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      -
        name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

| Event           | Ref                           | Docker Tags                         |
|-----------------|-------------------------------|-------------------------------------|
| `pull_request`  | `refs/pull/2/merge`           | `pr-2`                              |
| `push`          | `refs/heads/master`           | `master`                            |
| `push`          | `refs/heads/releases/v1`      | `releases-v1`                       |
| `push tag`      | `refs/tags/v1.2.3`            | `v1.2.3`, `latest`                  |
| `push tag`      | `refs/tags/v2.0.8-beta.67`    | `v2.0.8-beta.67`, `latest`          |

### Semver

```yaml
name: ci

on:
  push:
    branches:
      - 'master'
    tags:
      - 'v*'
  pull_request:
    branches:
      - 'master'

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v2
      -
        name: Docker meta
        id: meta
        uses: crazy-max/ghaction-docker-meta@v2
        with:
          images: name/app
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
      -
        name: Login to DockerHub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      -
        name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

| Event           | Ref                           | Docker Tags                         |
|-----------------|-------------------------------|-------------------------------------|
| `pull_request`  | `refs/pull/2/merge`           | `pr-2`                              |
| `push`          | `refs/heads/master`           | `master`                            |
| `push`          | `refs/heads/releases/v1`      | `releases-v1`                       |
| `push tag`      | `refs/tags/v1.2.3`            | `1.2.3`, `1.2`, `latest`            |
| `push tag`      | `refs/tags/v2.0.8-beta.67`    | `2.0.8-beta.67`                     |

### Bake definition

This action also handles a bake definition file that can be used with the
[Docker Bake action](https://github.com/docker/bake-action). You just have to declare an empty target named
`ghaction-docker-meta` and inherit from it.

```hcl
// docker-bake.hcl
target "ghaction-docker-meta" {}

target "build" {
  inherits = ["ghaction-docker-meta"]
  context = "./"
  dockerfile = "Dockerfile"
  platforms = ["linux/amd64", "linux/arm/v6", "linux/arm/v7", "linux/arm64", "linux/386", "linux/ppc64le"]
}
```

```yaml
name: ci

on:
  push:
    branches:
      - 'master'
    tags:
      - 'v*'

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v2
      -
        name: Docker meta
        id: meta
        uses: crazy-max/ghaction-docker-meta@v2
        with:
          images: name/app
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      -
        name: Build
        uses: docker/bake-action@v1
        with:
          files: |
            ./docker-bake.hcl
            ${{ steps.meta.outputs.bake-file }}
          targets: build
```

Content of `${{ steps.meta.outputs.bake-file }}` file will look like this with `refs/tags/v1.2.3` ref:

```json
{
  "target": {
    "ghaction-docker-meta": {
      "tags": [
        "name/app:1.2.3",
        "name/app:1.2",
        "name/app:sha-90dd603",
        "name/app:latest"
      ],
      "labels": {
        "org.opencontainers.image.title": "Hello-World",
        "org.opencontainers.image.description": "This your first repo!",
        "org.opencontainers.image.url": "https://github.com/octocat/Hello-World",
        "org.opencontainers.image.source": "https://github.com/octocat/Hello-World",
        "org.opencontainers.image.version": "1.2.3",
        "org.opencontainers.image.created": "2020-01-10T00:30:00.000Z",
        "org.opencontainers.image.revision": "90dd6032fac8bda1b6c4436a2e65de27961ed071",
        "org.opencontainers.image.licenses": "MIT"
      },
      "args": {
        "DOCKER_META_IMAGES": "name/app",
        "DOCKER_META_VERSION": "1.2.3"
      }
    }
  }
}
```

## Customizing

### inputs

Following inputs can be used as `step.with` keys

> `List` type is a newline-delimited string
> ```yaml
> labels: |
>   org.opencontainers.image.title=MyCustomTitle
>   org.opencontainers.image.description=Another description
>   org.opencontainers.image.vendor=MyCompany
> ```

> `CSV` type is a comma-delimited string
> ```yaml
> images: name/app,ghcr.io/name/app
> ```

| Name                | Type     | Description                        |
|---------------------|----------|------------------------------------|
| `images`            | List/CSV | List of Docker images to use as base name for tags |
| `tags`              | List     | List of [tags](#tags-input) as key-value pair attributes |
| `flavor`            | List     | [Flavor](#flavor-input) to apply |
| `labels`            | List     | List of custom labels |
| `sep-tags`          | String   | Separator to use for tags output (default `\n`) |
| `sep-labels`        | String   | Separator to use for labels output (default `\n`) |

### outputs

Following outputs are available

| Name          | Type    | Description                           |
|---------------|---------|---------------------------------------|
| `version`     | String  | Docker image version |
| `tags`        | String  | Docker tags |
| `labels`      | String  | Docker labels |
| `bake-file`   | File    | [Bake definition file](https://github.com/docker/buildx#file-definition) path |

## `flavor` input

`flavor` defines a global behavior for [`tags`](#tags-input):

```yaml
flavor: |
  latest=auto
  prefix=
  suffix=
```

* `latest=<auto|true|false>`: Handle [latest tag](#latest-tag) (default `auto`)
* `prefix=<string>`: A global prefix for each generated tag
* `suffix=<string>`: A global suffix for each generated tag

## `tags` input

`tags` is the core input of this action as everything related to it will reflect the output metadata. This one is in
the form of a key-value pair list in CSV format to remove limitations intrinsically linked to GitHub Actions
(only string format is handled in the input fields). Here is an example:

```yaml
tags: |
  type=schedule
  type=ref,event=branch
  type=ref,event=pr
  type=semver,pattern={{version}}
  type=semver,pattern={{major}}.{{minor}}
  type=semver,pattern={{major}}
  type=sha
```

Each entry is defined by a `type`, which are:

* [`type=schedule`](#typeschedule)
* [`type=semver`](#typesemver)
* [`type=match`](#typematch)
* [`type=edge`](#typeedge)
* [`type=ref`](#typeref)
* [`type=raw`](#typeraw)
* [`type=sha`](#typesha)

And global attributes:

* `enable=<true|false>` enable this entry (default `true`)
* `priority=<number>` priority to manage the order of tags
* `prefix=<string>` add prefix
* `suffix=<string>` add suffix

Default entries if `tags` input is empty:

```yaml
tags: |
  type=schedule
  type=ref,event=branch
  type=ref,event=tag
  type=ref,event=pr
```

### `type=schedule`

```yaml
tags: |
  # minimal
  type=schedule
  # default
  type=schedule,pattern=nightly
  # handlebars
  type=schedule,pattern={{date 'YYYYMMDD'}}
```

Will be used on [schedule event](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#schedule).

`pattern` is a specially crafted attribute to support [Handlebars template](https://handlebarsjs.com/guide/) with
the following expressions:
* `date 'format'` ; render date by its [moment format](https://momentjs.com/docs/#/displaying/format/)

| Pattern                  | Output               |
|--------------------------|----------------------|
| `nightly`                | `nightly`            |
| `{{date 'YYYYMMDD'}}`    | `20210326`           |

Extended attributes and default values:

```yaml
tags: |
  type=schedule,enable=true,priority=1000,prefix=,suffix=,pattern=nightly
```

### `type=semver`

```yaml
tags: |
  # minimal
  type=semver,pattern={{version}}
  # use custom value instead of git tag
  type=semver,pattern={{version}},value=v1.0.0
```

Will be used on a [push tag event](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#push)
and requires a valid Git tag [semver](https://semver.org/) but you can also use a custom value through `value`
attribute.

`pattern` attribute supports [Handlebars template](https://handlebarsjs.com/guide/) with the following expressions:
* `raw` ; the actual semver
* `version` ; shorthand for `{{major}}.{{minor}}.{{patch}}` (can include pre-release)
* `major` ; major version identifier
* `minor` ; minor version identifier
* `patch` ; patch version identifier

| Git tag            | Pattern                                                  | Output               |
|--------------------|----------------------------------------------------------|----------------------|
| `v1.2.3`           | `{{raw}}`                                                | `v1.2.3`             |
| `v1.2.3`           | `{{version}}`                                            | `1.2.3`              |
| `v1.2.3`           | `{{major}}.{{minor}}`                                    | `1.2`                |
| `v1.2.3`           | `v{{major}}`                                             | `v1`                 |
| `v1.2.3`           | `{{minor}}`                                              | `2`                  |
| `v1.2.3`           | `{{patch}}`                                              | `3`                  |
| `v2.0.8-beta.67`   | `{{raw}}`                                                | `2.0.8-beta.67`*     |
| `v2.0.8-beta.67`   | `{{version}}`                                            | `2.0.8-beta.67`      |
| `v2.0.8-beta.67`   | `{{major}}.{{minor}}`                                    | `2.0.8-beta.67`*     |

> *Pre-release (rc, beta, alpha) will only extend `{{version}}` as tag because they are updated frequently,
> and contain many breaking changes that are (by the author's design) not yet fit for public consumption.

Extended attributes and default values:

```yaml
tags: |
  type=semver,enable=true,priority=900,prefix=,suffix=,pattern=,value=
```

### `type=match`

```yaml
tags: |
  # minimal
  type=match,pattern=\d{8}
  # double quotes if comma in pattern
  type=match,"pattern=\d{1,3}.\d{1,3}.\d{1,3}"
  # define match group
  type=match,pattern=v(.*),group=1
  # use custom value instead of git tag
  type=match,pattern=v(.*),group=1,value=v1.0.0
```

Can create a regular expression for matching Git tag with a pattern and capturing group. Will be used on a
[push tag event](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#push) but you can also use
a custom value through `value` attribute.

| Git tag                 | Pattern                       | Group   | Output                 |
|-------------------------|-------------------------------|---------|------------------------|
| `v1.2.3`                | `\d{1,3}.\d{1,3}.\d{1,3}`     | `0`     | `1.2.3`                |
| `v2.0.8-beta.67`        | `v(.*)`                       | `1`     | `2.0.8-beta.67`        |
| `v2.0.8-beta.67`        | `v(\d.\d)`                    | `1`     | `2.0`                  |
| `20200110-RC2`          | `\d+`                         | `0`     | `20200110`             |

Extended attributes and default values:

```yaml
tags: |
  type=group,enable=true,priority=800,prefix=,suffix=,pattern=,group=0,value=
```

### `type=edge`

```yaml
tags: |
  # minimal
  type=edge
  # define default branch
  type=edge,branch=main
```

An `edge` tag reflects the last commit of the active branch on your Git repository. I usually prefer to use `edge`
as a Docker tag for a better distinction or common pattern. This is also used by official images
like [Alpine](https://hub.docker.com/_/alpine).

Extended attributes and default values:

```yaml
tags: |
  type=edge,enable=true,priority=700,prefix=,suffix=,branch=$repo.default_branch
```

### `type=ref`

```yaml
tags: |
  # minimal branch event
  type=ref,event=branch
  # minimal tag event
  type=ref,event=tag
  # minimal pull request event
  type=ref,event=pr
```

This type handles Git ref (or reference) for the following events:
* `branch` ; eg. `refs/heads/master`
* `tag` ; eg. `refs/tags/v1.0.0`
* `pr` ; eg. `refs/pull/318/merge`

| Event           | Ref                           | Output                        |
|-----------------|-------------------------------|-------------------------------|
| `pull_request`  | `refs/pull/2/merge`           | `pr-2`                        |
| `push`          | `refs/heads/master`           | `master`                      |
| `push`          | `refs/heads/my/branch`        | `my-branch`                   |
| `push tag`      | `refs/tags/v1.2.3`            | `v1.2.3`                      |
| `push tag`      | `refs/tags/v2.0.8-beta.67`    | `v2.0.8-beta.67`              |

Extended attributes and default values:

```yaml
tags: |
  # event branch
  type=ref,enable=true,priority=600,prefix=,suffix=,event=
  # event tag
  type=ref,enable=true,priority=600,prefix=,suffix=,event=
  # event pr
  type=ref,enable=true,priority=600,prefix=pr-,suffix=,event=
```

### `type=raw`

```yaml
tags: |
  type=raw,value=foo
  type=raw,value=bar
  # or
  type=raw,foo
  type=raw,bar
  # or
  foo
  bar
```

Output custom tags according to your needs.

Extended attributes and default values:

```yaml
tags: |
  type=raw,enable=true,priority=200,prefix=,suffix=,value=
```

### `type=sha`

```yaml
tags: |
  # minimal
  type=sha
```

Output Git short commit as Docker tag like `sha-ad132f5`.

Extended attributes and default values:

```yaml
tags: |
  type=sha,enable=true,priority=100,prefix=sha-,suffix=
```

## Notes

### Latest tag

`latest` tag is handled through the [`flavor` input](#flavor-input). It will be generated by default (`auto` mode) for:
* [`type=ref,event=tag`](#typeref)
* [`type=semver,pattern=...`](#typesemver)
* [`type=match,pattern=...`](#typematch)

### Overwrite labels

If some of the [OCI Image Format Specification](https://github.com/opencontainers/image-spec/blob/master/annotations.md)
labels generated are not suitable, you can overwrite them like this:

```yaml
      -
        name: Docker meta
        id: docker_meta
        uses: crazy-max/ghaction-docker-meta@v2
        with:
          images: name/app
          labels: |
            maintainer=CrazyMax
            org.opencontainers.image.title=MyCustomTitle
            org.opencontainers.image.description=Another description
            org.opencontainers.image.vendor=MyCompany
```

## Keep up-to-date with GitHub Dependabot

Since [Dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-actions-up-to-date-with-github-dependabot)
has [native GitHub Actions support](https://docs.github.com/en/github/administering-a-repository/configuration-options-for-dependency-updates#package-ecosystem),
to enable it on your GitHub repo all you need to do is add the `.github/dependabot.yml` file:

```yaml
version: 2
updates:
  # Maintain dependencies for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "daily"
```

## Contributing

Want to contribute? Awesome! The most basic way to show your support is to star :star2: the project,
or to raise issues :speech_balloon:. If you want to open a pull request, please read the
[contributing guidelines](.github/CONTRIBUTING.md).

You can also support this project by [**becoming a sponsor on GitHub**](https://github.com/sponsors/crazy-max) or by
making a [Paypal donation](https://www.paypal.me/crazyws) to ensure this journey continues indefinitely!

Thanks again for your support, it is much appreciated! :pray:

## License

MIT. See `LICENSE` for more details.
