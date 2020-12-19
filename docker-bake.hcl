group "default" {
  targets = ["build"]
}

group "pre-checkin" {
  targets = ["update-yarn", "format", "build"]
}

group "validate" {
  targets = ["validate-format", "validate-build", "validate-yarn"]
}

target "dockerfile" {
  dockerfile = "Dockerfile.dev"
}

target "update-yarn" {
  inherits = ["dockerfile"]
  target = "update-yarn"
  output = ["."]
}

target "build" {
  inherits = ["dockerfile"]
  target = "dist"
  output = ["."]
}

target "test" {
  inherits = ["dockerfile"]
  target = "test-coverage"
  output = ["."]
}

target "format" {
  inherits = ["dockerfile"]
  target = "format"
  output = ["."]
}

target "validate-format" {
  inherits = ["dockerfile"]
  target = "validate-format"
}

target "validate-build" {
  inherits = ["dockerfile"]
  target = "validate-build"
}

target "validate-yarn" {
  inherits = ["dockerfile"]
  target = "validate-yarn"
}
