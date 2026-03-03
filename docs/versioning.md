# Versioning

## Version Format

Versions follow **semver** (`MAJOR.MINOR.PATCH`) and are defined in each package's `package.json`.

- `@farmer1st-seeds/mock-data` — version in `packages/mock-data/package.json`
- `@farmer1st-seeds/mock-overlays` — version in `packages/mock-overlays/package.json`

There are no version directories. Each package uses a flat layout at the package root.

## Package Layout

```
packages/mock-data/
  package.json              # Version source (semver)
  dataset.json              # Table registry (tables, relations)
  changelog.json            # Version history
  checksums.json            # SHA256 hashes for table files
  users.json                # Table file — flat at package root
  entities.json
  memberships.json
  validate.mjs
```

## Key Files

| File | Purpose |
|------|---------|
| `dataset.json` | Registry of tables and relations. No version pointer — version lives only in `package.json` |
| `changelog.json` | Array of version entries with date, description, breaking flag, and changes list |
| `checksums.json` | SHA256 hashes for each table file, used by validation to verify file list completeness |
| `users.json`, `entities.json`, `memberships.json` | Table data files at the package root |

Note: The `$meta.version` field was removed from `dataset.json` in v3.0.0. Version is now sourced exclusively from `package.json`.

## Breaking vs Non-Breaking Changes

### Minor bumps (e.g., `3.0.0` -> `3.1.0`)

Additive, non-breaking changes:
- Adding new rows to existing tables
- Adding new optional fields to schemas
- Adding new overlay files
- Adding new entity types
- Modifying overlay content

### Major bumps (e.g., `3.x.x` -> `4.0.0`)

Breaking changes that require seed updates:
- Removing or renaming tables
- Removing rows or changing IDs
- Restructuring table schemas
- Changing the meaning of existing fields

## Changelog Format

`changelog.json` is an array of version entries:

```json
[
  {
    "version": "3.0.0",
    "date": "2026-02-20",
    "breaking": true,
    "description": "Flat layout, removed version directories",
    "changes": [
      "BREAKING: Removed version directories — tables now live at package root",
      "BREAKING: Removed $meta.version from dataset.json",
      "..."
    ]
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | `string` | Semver version string |
| `date` | `string` | ISO date (YYYY-MM-DD) |
| `breaking` | `boolean` | Whether this version has breaking changes |
| `description` | `string` | Summary of the version |
| `changes` | `string[]` | List of individual changes (prefix `BREAKING:` for breaking items) |
