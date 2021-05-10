# Upgrade notes

## v2 to v3

* Repository has been moved to docker org. Replace `crazy-max/ghaction-docker-meta@v2` with `docker/metadata-action@v3`
* The default bake target has been changed: `ghaction-docker-meta` > `docker-metadata-action`

## v1 to v2

* [inputs](#inputs)
  * [`tag-sha`](#tag-sha)
  * [`tag-edge` / `tag-edge-branch`](#tag-edge--tag-edge-branch)
  * [`tag-semver`](#tag-semver)
  * [`tag-match` / `tag-match-group`](#tag-match--tag-match-group)
  * [`tag-latest`](#tag-latest)
  * [`tag-schedule`](#tag-schedule)
  * [`tag-custom` / `tag-custom-only`](#tag-custom--tag-custom-only)
  * [`label-custom`](#label-custom)
* [Basic workflow](#basic-workflow)
* [Semver workflow](#semver-workflow)

### inputs

| New        | Unchanged       | Removed            |
|------------|-----------------|--------------------|
| `tags`     | `images`        | `tag-sha`          |
| `flavor`   | `sep-tags`      | `tag-edge`         |
| `labels`   | `sep-labels`    | `tag-edge-branch`  |
|            |                 | `tag-semver`       |
|            |                 | `tag-match`        |
|            |                 | `tag-match-group`  |
|            |                 | `tag-latest`       |
|            |                 | `tag-schedule`     |
|            |                 | `tag-custom`       |
|            |                 | `tag-custom-only`  |
|            |                 | `label-custom`     |

#### `tag-sha`

```yaml
tags: |
  type=sha
```

#### `tag-edge` / `tag-edge-branch`

```yaml
tags: |
  # default branch
  type=edge
  # specify branch
  type=edge,branch=main
```

#### `tag-semver`

```yaml
tags: |
  type=semver,pattern={{version}}
```

#### `tag-match` / `tag-match-group`

```yaml
tags: |
  type=match,pattern=v(.*),group=1
```

#### `tag-latest`

`tag-latest` is now handled through the [`flavor` input](README.md#flavor-input):

```yaml
flavor: |
  latest=auto
```

See also the notes about ["latest tag" behavior](README.md#latest-tag)

#### `tag-schedule`

```yaml
tags: |
  # default tag (nightly)
  type=schedule
  # specific pattern
  type=schedule,pattern={{date 'YYYYMMDD'}}
```

#### `tag-custom` / `tag-custom-only`

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

#### `label-custom`

Same behavior for `labels`:

```yaml
labels: |
  maintainer=CrazyMax
```

### Basic workflow

```yaml
# v1
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
        uses: docker/metadata-action@v1
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

```yaml
# v2
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
        uses: docker/metadata-action@v3
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

### Semver workflow

```yaml
# v1
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
        uses: docker/metadata-action@v1
        with:
          images: name/app
          tag-semver: |
            {{version}}
            {{major}}.{{minor}}
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

```yaml
# v2
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
        uses: docker/metadata-action@v3
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
