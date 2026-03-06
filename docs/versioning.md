# Versioning

## Version Format

Versions follow **semver** (`MAJOR.MINOR.PATCH`) and are defined in `packages/mock-overlays/package.json`.

There are no version directories. The package uses a flat layout at the package root.

## Breaking vs Non-Breaking Changes

### Minor bumps (e.g., `4.0.0` -> `4.1.0`)

Additive, non-breaking changes:
- Adding new overlay files
- Adding new values to existing overlays
- Modifying overlay content

### Major bumps (e.g., `4.x.x` -> `5.0.0`)

Breaking changes that require consumer updates:
- Removing or renaming overlay files
- Restructuring overlay format
- Changing the meaning of existing fields
