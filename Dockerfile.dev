#syntax=docker/dockerfile:1.2

FROM node:12 AS deps
WORKDIR /src
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/src/node_modules \
  yarn install

FROM scratch AS update-yarn
COPY --from=deps /src/yarn.lock /

FROM deps AS validate-yarn
COPY .git .git
RUN status=$(git status --porcelain -- yarn.lock); if [ -n "$status" ]; then echo $status; exit 1; fi

FROM deps AS base
COPY . .

FROM base AS build
RUN --mount=type=cache,target=/src/node_modules \
  yarn build

FROM deps AS test
ENV RUNNER_TEMP=/tmp/github_runner
ENV RUNNER_TOOL_CACHE=/tmp/github_tool_cache
COPY . .
RUN --mount=type=cache,target=/src/node_modules \
  yarn run test

FROM scratch AS test-coverage
COPY --from=test /src/coverage /coverage/

FROM base AS run-format
RUN --mount=type=cache,target=/src/node_modules \
  yarn run format

FROM scratch AS format
COPY --from=run-format /src/src/*.ts /src/

FROM base AS validate-format
RUN --mount=type=cache,target=/src/node_modules \
  yarn run format-check

FROM scratch AS dist
COPY --from=build /src/dist/ /dist/

FROM build AS validate-build
RUN status=$(git status --porcelain -- dist); if [ -n "$status" ]; then echo $status; exit 1; fi

FROM base AS dev
ENTRYPOINT ["bash"]
