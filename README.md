[![GitHub release](https://img.shields.io/github/release/crazy-max/ghaction-docker-meta.svg?style=flat-square)](https://github.com/crazy-max/ghaction-docker-meta/releases/latest)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-docker--meta-blue?logo=github&style=flat-square)](https://github.com/marketplace/actions/docker-meta)
[![Test workflow](https://img.shields.io/github/workflow/status/crazy-max/ghaction-docker-meta/test?label=test&logo=github&style=flat-square)](https://github.com/crazy-max/ghaction-docker-meta/actions?workflow=test)
[![Codecov](https://img.shields.io/codecov/c/github/crazy-max/ghaction-docker-meta?logo=codecov&style=flat-square)](https://codecov.io/gh/crazy-max/ghaction-docker-meta)
[![Become a sponsor](https://img.shields.io/badge/sponsor-crazy--max-181717.svg?logo=github&style=flat-square)](https://github.com/sponsors/crazy-max)
[![Paypal Donate](https://img.shields.io/badge/donate-paypal-00457c.svg?logo=paypal&style=flat-square)](https://www.paypal.me/crazyws)

## About

GitHub Action to extract metadata (tags, labels) for Docker. This action is particularly useful if used with
[Docker Build Push](https://github.com/docker/build-push-action) action.

If you are interested, [check out](https://git.io/Je09Y) my other :octocat: GitHub Actions!

___

* [Features](#features)
* [Usage](#usage)
* [Customizing](#customizing)
  * [inputs](#inputs)
  * [outputs](#outputs)
* [Keep up-to-date with GitHub Dependabot](#keep-up-to-date-with-github-dependabot)
* [How can I help?](#how-can-i-help)
* [License](#license)

## Features

* Docker tags generated through GitHub action event and Git metadata
* [OCI Image Format Specification](https://github.com/opencontainers/image-spec/blob/master/annotations.md) used to generate Docker labels

## Usage

| Event           | Ref                           | Commit SHA | Docker Tag                         | Pushed |
|-----------------|-------------------------------|------------|------------------------------------|--------|
| `schedule`      |                               |            | `nightly`                          | Yes    |
| `pull_request`  | `refs/pull/2/merge`           | `a123b57`  | `sha-a123b57`, `pr-2`              | No     |
| `push`          | `refs/heads/<default_branch>` | `676cae2`  | `sha-676cae2`, `edge`              | Yes    |
| `push`          | `refs/heads/dev`              | `cf20257`  | `sha-cf20257`, `dev`               | Yes    |
| `push`          | `refs/heads/my/branch`        | `a5df687`  | `sha-a5df687`, `my-branch`         | Yes    |
| `push tag`      | `refs/tags/v1.2.3`            |            | `1.2.3`, `latest`                  | Yes    |
| `push tag`      | `refs/tags/mytag`             |            | `mytag`                            | Yes    |

```yaml
name: ci

on:
  schedule:
    - cron: '0 10 * * *' # everyday at 10am
  push:
    branches:
      - '**'
    tags:
      - 'v*.*.*'
  pull_request:

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v2
      -
        name: Docker meta
        id: docker_meta
        uses: crazy-max/ghaction-docker-meta@v1
        with:
          images: |
            name/app
            ghcr.io/name/app
          tag-sha: true
      -
        name: Set up QEMU
        uses: docker/setup-qemu-action@v1
      -
        name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1
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
          file: ./Dockerfile
          platforms: linux/amd64,linux/arm64,linux/386
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.docker_meta.outputs.tags }}
          labels: ${{ steps.docker_meta.outputs.labels }}
```

## Customizing

### inputs

Following inputs can be used as `step.with` keys

| Name                | Type     | Description                        |
|---------------------|----------|------------------------------------|
| `images`            | List/CSV | List of Docker images to use as base name for tags |
| `tag-sha`           | Bool     | Add git short SHA as Docker tag (default `false`) |
| `tag-edge`          | String   | Branch that will be tagged as edge (default `${{ repo.default_branch }}` |
| `sep-tags`          | String   | Separator to use for tags output (default `\n`) |
| `sep-labels`        | String   | Separator to use for labels output (default `\n`) |

> List/CSV type can be a newline or comma delimited string

### outputs

Following outputs are available

| Name          | Type    | Description                           |
|---------------|---------|---------------------------------------|
| `tags`        | String  | Generated Docker tags |
| `labels`      | String  | Generated Docker labels |

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

## How can I help?

All kinds of contributions are welcome :raised_hands:! The most basic way to show your support is to star :star2:
the project, or to raise issues :speech_balloon: You can also support this project by
[**becoming a sponsor on GitHub**](https://github.com/sponsors/crazy-max) :clap: or by making a
[Paypal donation](https://www.paypal.me/crazyws) to ensure this journey continues indefinitely! :rocket:

Thanks again for your support, it is much appreciated! :pray:

## License

MIT. See `LICENSE` for more details.
