#!/usr/bin/env node
/**
 * Validate overlay JSON files (new flat format).
 * Run: node packages/mock-overlays/validate.mjs
 *
 * Checks:
 *   1. Filename matches $meta.name
 *   2. $meta.visibility is valid; private overlays have non-empty clients
 *   3. $meta.fields is a non-empty string array
 *   4. values is a non-empty array
 *   5. Values count >= max row count of matching tables (cross-ref with base data)
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mockDataDir = join(__dirname, '..', 'mock-data')

// Colors
const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const dim = (s) => `\x1b[90m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

console.log(bold('\nValidating overlays...\n'))

const passed = []
const failed = []

// Discover all overlay JSON files (flat — no subdirectories)
const overlayFiles = readdirSync(__dirname)
  .filter(f => f.endsWith('.json') && f !== 'package.json')
  .map(f => ({
    path: join(__dirname, f),
    filename: f,
    name: basename(f, '.json'),
  }))

if (overlayFiles.length === 0) {
  console.error(red('No overlay files found'))
  process.exit(1)
}

console.log(dim(`  Found ${overlayFiles.length} overlay files\n`))

// Load base tables for row-count cross-reference
const baseTables = {}
try {
  const datasetPath = join(mockDataDir, 'dataset.json')
  const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'))
  for (const tableName of dataset.tables) {
    const tablePath = join(mockDataDir, `${tableName}.json`)
    try {
      const table = JSON.parse(readFileSync(tablePath, 'utf8'))
      baseTables[tableName] = table
    } catch { /* skip missing tables */ }
  }
} catch {
  console.log(dim('  Warning: could not load base tables for row-count check\n'))
}

// Parse all overlays up front
const overlays = overlayFiles.map(f => {
  const data = JSON.parse(readFileSync(f.path, 'utf8'))
  return { ...f, data }
})

// --- Check 1: Filename matches $meta.name ---
{
  const errors = []
  for (const o of overlays) {
    const metaName = o.data.$meta?.name
    if (!metaName) {
      errors.push(`${o.filename}: missing $meta.name`)
    } else if (metaName !== o.name) {
      errors.push(`${o.filename}: $meta.name "${metaName}" != filename "${o.name}"`)
    }
  }
  report('Filename matches $meta.name', errors)
}

// --- Check 2: Visibility is valid; private overlays have clients ---
{
  const errors = []
  for (const o of overlays) {
    const visibility = o.data.$meta?.visibility
    if (visibility !== 'public' && visibility !== 'private') {
      errors.push(`${o.filename}: $meta.visibility must be "public" or "private", got "${visibility}"`)
    }
    if (visibility === 'private') {
      const clients = o.data.$meta?.clients
      if (!Array.isArray(clients) || clients.length === 0) {
        errors.push(`${o.filename}: private overlay missing non-empty clients array`)
      }
    }
  }
  report('Visibility valid, private has clients', errors)
}

// --- Check 3: $meta.fields is non-empty string array ---
{
  const errors = []
  for (const o of overlays) {
    const fields = o.data.$meta?.fields
    if (!Array.isArray(fields) || fields.length === 0) {
      errors.push(`${o.filename}: $meta.fields must be a non-empty array`)
    } else if (fields.some(f => typeof f !== 'string')) {
      errors.push(`${o.filename}: $meta.fields must contain only strings`)
    }
  }
  report('Fields is non-empty string array', errors)
}

// --- Check 4: values is non-empty array ---
{
  const errors = []
  for (const o of overlays) {
    const values = o.data.values
    if (!Array.isArray(values) || values.length === 0) {
      errors.push(`${o.filename}: values must be a non-empty array`)
    }
  }
  report('Values is non-empty array', errors)
}

// --- Check 5: Values count >= max matching table row count ---
{
  const errors = []
  if (Object.keys(baseTables).length === 0) {
    console.log(`  ${dim('-')} Values >= row count ${dim('(skipped — no base tables loaded)')}`)
  } else {
    for (const o of overlays) {
      const fields = o.data.$meta?.fields || []
      const values = o.data.values || []

      for (const [tableName, table] of Object.entries(baseTables)) {
        const rows = table.rows || []
        if (rows.length === 0) continue

        // Check if any field in this overlay matches a column in this table
        const sampleRow = rows[0]
        const matchingFields = fields.filter(f => f in sampleRow)
        if (matchingFields.length === 0) continue

        if (values.length < rows.length) {
          for (const field of matchingFields) {
            errors.push(
              `${o.filename}: needs ${rows.length} values for ${tableName}.${field}, has ${values.length}`
            )
          }
        }
      }
    }
    report('Values >= row count for matching tables', errors)
  }
}

// --- Summary ---
console.log('')
const total = passed.length + failed.length
const failCount = failed.length
if (failCount === 0) {
  console.log(green(`All ${total} checks passed.`))
} else {
  console.log(red(`${failCount}/${total} checks failed.`))
}
console.log('')

process.exit(failCount > 0 ? 1 : 0)

// --- Helpers ---

function report(name, errors) {
  if (errors.length === 0) {
    console.log(`  ${green('✓')} ${name}`)
    passed.push(name)
  } else {
    console.log(`  ${red('✗')} ${name}`)
    for (const e of errors.slice(0, 10)) {
      console.log(`    ${dim('→')} ${e}`)
    }
    if (errors.length > 10) {
      console.log(`    ${dim(`... and ${errors.length - 10} more`)}`)
    }
    failed.push({ check: name, errors })
  }
}
