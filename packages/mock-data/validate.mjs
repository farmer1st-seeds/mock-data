#!/usr/bin/env node
/**
 * Validate mock data quality.
 * Run: node validate.mjs                          (validate package root)
 *      node validate.mjs --seed-dir /path/to/data (validate a seed's data copy)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse args
const args = process.argv.slice(2)
const seedDirFlag = args.indexOf('--seed-dir')
const seedDirPath = seedDirFlag !== -1 ? args[seedDirFlag + 1] : null

const mockDir = resolve(__dirname)
const datasetPath = join(mockDir, 'dataset.json')

if (!existsSync(datasetPath)) {
  console.error('dataset.json not found')
  process.exit(1)
}

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'))

// Resolve data directory
let dataDir
let label
if (seedDirPath) {
  dataDir = resolve(seedDirPath)
  label = `seed data at ${dataDir}`
} else {
  dataDir = mockDir
  label = 'mock data'
}

if (!existsSync(dataDir)) {
  console.error(`Data directory not found: ${dataDir}`)
  process.exit(1)
}

// Non-table JSON files to exclude when scanning for tables
const EXCLUDED = new Set(['dataset.json', 'checksums.json', 'package.json', 'changelog.json'])

// Colors
const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const dim = (s) => `\x1b[90m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

console.log(bold(`\nValidating ${label}...\n`))

const passed = []
const failed = []

// Load tables from flat root (exclude non-table JSONs)
const tableFiles = readdirSync(dataDir).filter(f => f.endsWith('.json') && !EXCLUDED.has(f))
const tables = {}
for (const file of tableFiles) {
  const data = JSON.parse(readFileSync(join(dataDir, file), 'utf8'))
  tables[file.replace('.json', '')] = data
}

// --- Check 1: Dataset consistency ---
{
  const errors = []
  for (const table of dataset.tables) {
    if (!tables[table]) {
      errors.push(`Table "${table}" listed in dataset.json but no file found`)
    }
  }
  for (const name of Object.keys(tables)) {
    if (!dataset.tables.includes(name)) {
      errors.push(`File ${name}.json exists but not listed in dataset.json`)
    }
  }
  report('Dataset consistency', errors)
}

// --- Check 2: Schema completeness ---
{
  const errors = []
  for (const [name, table] of Object.entries(tables)) {
    const schemaFields = Object.keys(table.$meta?.schema || {})
    if (schemaFields.length === 0) {
      errors.push(`${name}: no schema in $meta`)
      continue
    }
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i]
      for (const field of schemaFields) {
        const isNullable = (table.$meta.schema[field] || '').includes('?')
        if (!(field in row) && !isNullable) {
          errors.push(`${name} row ${row.id || i}: missing "${field}"`)
        }
      }
    }
  }
  report('Schema completeness', errors)
}

// --- Check 3: ID uniqueness ---
{
  const errors = []
  for (const [name, table] of Object.entries(tables)) {
    const ids = new Set()
    for (const row of table.rows) {
      if (!row.id) {
        errors.push(`${name}: row without "id" field`)
        continue
      }
      if (ids.has(row.id)) errors.push(`${name}: duplicate "${row.id}"`)
      ids.add(row.id)
    }
  }
  report('ID uniqueness', errors)
}

// --- Check 4: Foreign key integrity ---
{
  const errors = []
  for (const rel of dataset.relations) {
    const [fromTable, fromField] = rel.from.split('.')
    const [toTable, toField] = rel.to.split('.')

    if (!tables[fromTable]) {
      errors.push(`Relation ${rel.from} → ${rel.to}: table "${fromTable}" not loaded`)
      continue
    }
    if (!tables[toTable]) {
      errors.push(`Relation ${rel.from} → ${rel.to}: table "${toTable}" not loaded`)
      continue
    }

    const validIds = new Set(tables[toTable].rows.map(r => r[toField]))

    for (const row of tables[fromTable].rows) {
      // Skip rows that don't match the when condition (polymorphic FKs)
      if (rel.when) {
        const matches = Object.entries(rel.when).every(([k, v]) => row[k] === v)
        if (!matches) continue
      }

      const value = row[fromField]
      if (value === null || value === undefined) {
        if (!rel.nullable) {
          errors.push(`${fromTable}.${fromField} row ${row.id}: null but not nullable`)
        }
        continue
      }
      if (!validIds.has(value)) {
        errors.push(`${fromTable}.${fromField} row ${row.id}: "${value}" not found in ${toTable}`)
      }
    }
  }
  report('Foreign key integrity', errors)
}

// --- Check 5: Relations consistency ---
{
  const errors = []
  for (const rel of dataset.relations) {
    const [fromTable, fromField] = rel.from.split('.')
    const [toTable, toField] = rel.to.split('.')

    if (tables[fromTable]) {
      const schema = tables[fromTable].$meta?.schema || {}
      if (!schema[fromField]) {
        errors.push(`Relation field "${fromField}" not in ${fromTable} schema`)
      }
    }
    if (tables[toTable]) {
      const schema = tables[toTable].$meta?.schema || {}
      if (!schema[toField]) {
        errors.push(`Relation field "${toField}" not in ${toTable} schema`)
      }
    }
  }
  report('Relations consistency', errors)
}

// --- Check 6: Checksums ---
{
  const errors = []
  const checksumPath = join(dataDir, 'checksums.json')
  if (existsSync(checksumPath)) {
    const checksums = JSON.parse(readFileSync(checksumPath, 'utf8'))
    for (const file of tableFiles) {
      if (!(file in checksums)) {
        errors.push(`checksums.json missing entry for ${file}`)
      }
    }
    for (const file of Object.keys(checksums)) {
      if (!tableFiles.includes(file)) {
        errors.push(`checksums.json has entry for ${file} but file not found`)
      }
    }
  }
  report('Checksums', errors)
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
