# Validation

## Overview

`validate.mjs` is a CLI tool that checks mock data quality. It can validate the mock-data package or a seed's data copy. It runs 6 checks and exits with code 1 if any fail.

Overlay validation is separate — see the mock-overlays section below.

## Usage

```bash
# Validate mock tables (default)
node packages/mock-data/validate.mjs

# Validate a seed's data copy
node packages/mock-data/validate.mjs --seed-dir /path/to/seed
```

## Checks

### 1. Dataset Consistency

Verifies that `dataset.json` and the actual table files are in sync.

| What it checks | Error example |
|----------------|---------------|
| Every table in `dataset.json` has a matching file | `Table "users" listed in dataset.json but no file found` |
| Every table file is listed in `dataset.json` | `File prices.json exists but not listed in dataset.json` |

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

### 6. Checksum Registry

Verifies file list completeness against `checksums.json`.

| What it checks | Error example |
|----------------|---------------|
| Every file in `checksums.json` exists on disk | `checksums.json lists "prices.json" but file not found` |
| Every table file is listed in `checksums.json` | `File "users.json" exists but not in checksums.json` |

## Output Format

Checks produce colored terminal output:

```
Validating mock data...

  [pass] Dataset consistency
  [pass] Schema completeness
  [pass] ID uniqueness
  [pass] Foreign key integrity
  [pass] Relations consistency
  [pass] Checksum registry

All 6 checks passed.
```

On failure, up to 10 errors are shown per check, with a count of remaining errors:

```
  [fail] Foreign key integrity
    -> memberships.sourceId row mbr_001: "usr_999" not found in users
    -> ... and 3 more
```

## Overlay Validation

Overlay validation is a separate script in the mock-overlays package:

```bash
node packages/mock-overlays/validate.mjs
```

This validates overlay file correctness: filename/meta consistency, visibility, fields array, values array length, etc.

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Table "X" listed in dataset.json but no file found` | Table name in registry but no JSON file | Create the table file or remove from `dataset.json` |
| `row X missing "field"` | Row is missing a required schema field | Add the field to the row, or mark it nullable with `?` in schema |
| `duplicate "X"` | Two rows share the same ID | Change one of the duplicate IDs |
| `"X" not found in Y` | Foreign key points to nonexistent row | Fix the reference or add the missing target row |
| `checksums.json lists "X" but file not found` | Checksum entry for missing file | Create the file or remove the entry from `checksums.json` |
| `File "X" exists but not in checksums.json` | Table file missing from checksum registry | Run checksum generation or add the entry manually |
