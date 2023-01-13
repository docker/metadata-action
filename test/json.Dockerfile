# syntax=docker/dockerfile:1
FROM alpine
RUN apk add --no-cache coreutils jq
ARG BUILDINFO
RUN printenv BUILDINFO
RUN echo $BUILDINFO | jq
