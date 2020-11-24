# Changelog

## 1.8.5 (2020/11/24)

* Use sepLabels when joining labels for output (#17)

## 1.8.4 (2020/11/20)

* Pre-release (rc, beta, alpha) will only extend `{{version}}` as tag for `tag-semver`

## 1.8.3 (2020/11/20)

* Lowercase image name (#16)

## 1.8.2 (2020/11/18)

* Remove duplicated tags

## 1.8.1 (2020/11/18)

* Missing input in `action.yml`

## 1.8.0 (2020/11/17)

* Handle semver tags (#14)

## 1.7.0 (2020/10/31)

* Use `repo.html_url` for `org.opencontainers.image.source` label to be able to display README on GHCR
* Handle `tag-match-latest` on Git tag event (#8)

## 1.6.0 (2020/10/28)

* Generate latest tag by default on push tag event (#5)

## 1.5.0 (2020/10/27)

* Add `tag-match-group` input to choose group to get if `tag-match` matches
* Check `tag-match` is a valid regex 

## 1.4.0 (2020/10/27)

* Use RegExp to match against a Git tag instead of coerce

## 1.3.0 (2020/10/26)

* Set latest tag only if matches with a pattern

## 1.2.0 (2020/10/26)

* Coerces Git tag to semver (#3)

## 1.1.0 (2020/10/25)

* Allow to templatize schedule tag (#1)
* Allow to disable edge branch tagging (#2)

## 1.0.0 (2020/10/25)

* Initial version
