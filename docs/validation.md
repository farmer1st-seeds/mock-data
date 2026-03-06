# Validation

## Overview

`validate.mjs` is a CLI tool that checks overlay data quality. It runs 5 checks and exits with code 1 if any fail.

## Usage

```bash
node packages/mock-overlays/validate.mjs
```

## Checks

| # | Check | Error example |
|---|-------|---------------|
| 1 | Filename matches `$meta.name` | `first-names-kenya.json: name "wrong-name" doesn't match filename` |
| 2 | Visibility is valid | `first-names-kenya.json: visibility "unknown" not in [public, private]` |
| 3 | Fields array exists and is non-empty | `first-names-kenya.json: fields must be a non-empty array` |
| 4 | Values array exists and is non-empty | `first-names-kenya.json: values must be a non-empty array` |
| 5 | Values count >= minimum row count | `first-names-kenya.json: only 5 values, need at least 50` |

## Output Format

Checks produce colored terminal output:

```
Validating overlays...

  [pass] Filename consistency
  [pass] Visibility valid
  [pass] Fields array
  [pass] Values array
  [pass] Values count

All 5 checks passed.
```

On failure, errors are shown per check:

```
  [fail] Values count
    -> first-names-kenya.json: only 5 values, need at least 50
```
