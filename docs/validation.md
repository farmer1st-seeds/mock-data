# Validation

## Overview

`validate.mjs` is a CLI tool that checks mock data quality. It can validate a mock version directory or a seed's data copy. It runs 6 checks and exits with code 1 if any fail.

## Usage

```bash
# Validate the latest mock version (default)
node db/mock/validate.mjs

# Validate a specific version
node db/mock/validate.mjs --version 1.00

# Validate a seed's data copy
node db/mock/validate.mjs --seed hello
```

The TUI also provides validation via the `v` key on the Mock Data page, which calls the `validateData()` function from `_lib/data.mjs`.

## Checks

### 1. Dataset Consistency

Verifies that `dataset.json` and the actual table files are in sync.

| What it checks | Error example |
|----------------|---------------|
| Every table in `dataset.json` has a matching file | `Table "users" listed in dataset.json but no file found` |
| Every table file is listed in `dataset.json` | `File tables/prices.json exists but not listed in dataset.json` |

### 2. Schema Completeness

Verifies that every row has all required fields defined in `$meta.schema`.

| What it checks | Error example |
|----------------|---------------|
| `$meta.schema` exists and is non-empty | `users: no schema in $meta` |
| Every non-nullable field is present in every row | `users row usr_003: missing "email"` |

Nullable fields (type string ending with `?`) are allowed to be absent.

### 3. ID Uniqueness

Verifies that no table has duplicate IDs.

| What it checks | Error example |
|----------------|---------------|
| Every row has an `id` field | `users: row without "id" field` |
| No duplicate IDs within a table | `users: duplicate "usr_003"` |

### 4. Foreign Key Integrity

Verifies that all foreign key references point to valid rows.

| What it checks | Error example |
|----------------|---------------|
| Referenced IDs exist in the target table | `memberships.sourceId row mbr_001: "usr_999" not found in users` |
| Non-nullable FKs are not null | `memberships.sourceId row mbr_001: null but not nullable` |
| `when` conditions are respected (polymorphic FKs) | Only checks rows matching the condition |

The `when` clause in relations (e.g., `{ "sourceType": "user" }`) means only rows where `sourceType === "user"` are checked against `users.id`. Rows with `sourceType === "entity"` are checked against `entities.id` instead.

### 5. Relations Consistency

Verifies that relation fields referenced in `dataset.json` exist in table schemas.

| What it checks | Error example |
|----------------|---------------|
| `from` field exists in source table schema | `Relation field "sourceId" not in memberships schema` |
| `to` field exists in target table schema | `Relation field "id" not in users schema` |

### 6. Overlay Validity

Verifies overlay file correctness.

| What it checks | Error example |
|----------------|---------------|
| Filename prefix matches `$meta.visibility` | `users/public_kenya.json: prefix says public, $meta says "private"` |
| Private overlays have `clients[]` | `entities/private_nestle.json: private overlay missing clients[]` |
| Override IDs exist in base table | `users/public_base.json: override "usr_999" not in base table` |
| `$meta.table` matches directory name | `users/public_base.json: $meta.table="entities" but in users/` |

## Output Format

Checks produce colored terminal output:

```
Validating mock v1.02...

  [green checkmark] Dataset consistency
  [green checkmark] Schema completeness
  [green checkmark] ID uniqueness
  [green checkmark] Foreign key integrity
  [green checkmark] Relations consistency
  [green checkmark] Overlay validity

All 6 checks passed.
```

On failure, up to 10 errors are shown per check, with a count of remaining errors:

```
  [red X] Foreign key integrity
    -> memberships.sourceId row mbr_001: "usr_999" not found in users
    -> ... and 3 more
```

## Library Function

The `validateData()` function in `_lib/data.mjs` provides a programmatic API for validation (used by the TUI). It runs 4 of the 6 checks (dataset consistency and relations consistency are CLI-only as they require `dataset.json` context):

```javascript
import { validateData } from './db/mock/_lib/data.mjs'

const results = validateData(dataDir, relations)
// results.passed: string[]  — names of passed checks
// results.failed: { check: string, errors: string[] }[]  — failed checks with errors
```

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Table "X" listed in dataset.json but no file found` | Table name in registry but no JSON file | Create the table file or remove from `dataset.json` |
| `row X missing "field"` | Row is missing a required schema field | Add the field to the row, or mark it nullable with `?` in schema |
| `duplicate "X"` | Two rows share the same ID | Change one of the duplicate IDs |
| `"X" not found in Y` | Foreign key points to nonexistent row | Fix the reference or add the missing target row |
| `prefix says public, $meta says "private"` | Filename/meta visibility mismatch | Rename the file or fix `$meta.visibility` |
| `private overlay missing clients[]` | Private overlay without client list | Add `"clients": ["client-name"]` to `$meta` |
| `override "X" not in base table` | Overlay references a row ID that doesn't exist | Fix the override key or add the row to the base table |
| `$meta.table="X" but in Y/` | Overlay is in wrong directory or has wrong meta | Move the file or fix `$meta.table` |
