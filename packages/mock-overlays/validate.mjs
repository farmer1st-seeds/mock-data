#!/usr/bin/env node
/**
 * Validate overlay JSON files.
 * Run: node packages/mock-overlays/validate.mjs
 *
 * Checks:
 *   1. Filename prefix (public_/private_) matches $meta.visibility
 *   2. $meta.table matches parent directory name
 *   3. Private overlays have non-empty clients array
 *   4. Override IDs exist in corresponding base table
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
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

// Discover all overlay files from flat table directories
const overlayFiles = []
const tableDirs = readdirSync(__dirname).filter(d => {
  const p = join(__dirname, d)
  try { return statSync(p).isDirectory() && !d.startsWith('.') && d !== 'node_modules' } catch { return false }
})

for (const tableDir of tableDirs) {
  const tPath = join(__dirname, tableDir)
  const files = readdirSync(tPath).filter(f => f.endsWith('.json'))
  for (const file of files) {
    overlayFiles.push({
      path: join(tPath, file),
      table: tableDir,
      filename: file,
    })
  }
}

if (overlayFiles.length === 0) {
  console.error(red('No overlay files found'))
  process.exit(1)
}

console.log(dim(`  Found ${overlayFiles.length} overlay files across ${tableDirs.length} tables\n`))

// --- Check 1: Filename prefix matches $meta.visibility ---
{
  const errors = []
  for (const f of overlayFiles) {
    const data = JSON.parse(readFileSync(f.path, 'utf8'))
    const visibility = data.$meta?.visibility
    const prefix = f.filename.startsWith('public_') ? 'public' : f.filename.startsWith('private_') ? 'private' : null
    if (!prefix) {
      errors.push(`${f.table}/${f.filename}: filename must start with public_ or private_`)
    } else if (prefix !== visibility) {
      errors.push(`${f.table}/${f.filename}: prefix "${prefix}" != $meta.visibility "${visibility}"`)
    }
  }
  report('Filename prefix matches visibility', errors)
}

// --- Check 2: $meta.table matches parent directory ---
{
  const errors = []
  for (const f of overlayFiles) {
    const data = JSON.parse(readFileSync(f.path, 'utf8'))
    const metaTable = data.$meta?.table
    if (!metaTable) {
      errors.push(`${f.table}/${f.filename}: missing $meta.table`)
    } else if (metaTable !== f.table) {
      errors.push(`${f.table}/${f.filename}: $meta.table "${metaTable}" != directory "${f.table}"`)
    }
  }
  report('$meta.table matches directory', errors)
}

// --- Check 3: Private overlays have non-empty clients ---
{
  const errors = []
  for (const f of overlayFiles) {
    const data = JSON.parse(readFileSync(f.path, 'utf8'))
    if (data.$meta?.visibility === 'private') {
      const clients = data.$meta?.clients
      if (!Array.isArray(clients) || clients.length === 0) {
        errors.push(`${f.table}/${f.filename}: private overlay missing non-empty clients array`)
      }
    }
  }
  report('Private overlays have clients', errors)
}

// --- Check 4: Override IDs exist in base table ---
{
  const errors = []
  for (const f of overlayFiles) {
    const data = JSON.parse(readFileSync(f.path, 'utf8'))
    const overrides = data.overrides || {}
    const overrideIds = Object.keys(overrides)
    if (overrideIds.length === 0) continue

    // Resolve base table from sibling mock-data package
    const baseTablePath = join(mockDataDir, `${f.table}.json`)
    if (!existsSync(baseTablePath)) {
      errors.push(`${f.table}/${f.filename}: base table not found at ../mock-data/${f.table}.json`)
      continue
    }

    const baseTable = JSON.parse(readFileSync(baseTablePath, 'utf8'))
    const validIds = new Set(baseTable.rows.map(r => r.id))

    for (const id of overrideIds) {
      if (!validIds.has(id)) {
        errors.push(`${f.table}/${f.filename}: override ID "${id}" not found in base table`)
      }
    }
  }
  report('Override IDs exist in base table', errors)
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
