target "docker-metadata-action" {}

group "default" {
  targets = ["db", "app"]
}

group "release" {
  targets = ["db", "app-plus"]
}

target "db" {
  context = "./test"
  tags = ["docker.io/tonistiigi/db"]
}

target "app" {
  inherits = ["docker-metadata-action"]
  context = "./test"
  dockerfile = "Dockerfile"
  args = {
    name = "foo"
  }
}

target "cross" {
  platforms = [
    "linux/amd64",
    "linux/arm64",
    "linux/386"
  ]
}

target "app-plus" {
  inherits = ["app", "cross"]
  args = {
    IAMPLUS = "true"
  }
}
