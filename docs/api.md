# API Reference

## No JavaScript API

`@farmer1st-seeds/mock-data` is a **pure data package**. It contains only JSON files and exports no JavaScript functions. Consume it by importing or reading the JSON files directly.

```javascript
// Example: reading mock data from node_modules
import dataset from '@farmer1st-seeds/mock-data/dataset.json' assert { type: 'json' }
import users from '@farmer1st-seeds/mock-data/users.json' assert { type: 'json' }
```

Or read files from disk:

```javascript
import { readFileSync } from 'node:fs'

const users = JSON.parse(readFileSync('node_modules/@farmer1st-seeds/mock-data/users.json', 'utf8'))
```

## Validation Script

Each package includes a standalone `validate.mjs` CLI script for checking data integrity. These are not importable libraries — they are meant to be run directly.

### mock-data

```bash
node packages/mock-data/validate.mjs                      # Validate mock tables
node packages/mock-data/validate.mjs --seed-dir /path      # Validate a seed's data copy
```

### mock-overlays

```bash
node packages/mock-overlays/validate.mjs                   # Validate overlay files
```

## Package Contents

### @farmer1st-seeds/mock-data

| File | Description |
|------|-------------|
| `dataset.json` | Table registry (table names, relations) |
| `users.json` | User records |
| `entities.json` | Entity records (farms, cooperatives, brands, etc.) |
| `memberships.json` | Membership/relationship records |
| `changelog.json` | Version history |
| `checksums.json` | SHA256 hashes for table files |
| `validate.mjs` | Standalone validation CLI script |

### @farmer1st-seeds/mock-overlays

A separate package containing overlay JSON files (realistic names, regional data) and its own `validate.mjs` script. Overlay files follow the naming convention `{field}-{group}.json` (e.g., `first-names-kenya.json`).
