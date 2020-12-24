target "ghaction-docker-meta" {}

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
  inherits = ["ghaction-docker-meta"]
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
