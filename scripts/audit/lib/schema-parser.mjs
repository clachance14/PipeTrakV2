/**
 * Migration parser for static analysis
 * Parses SQL migrations to extract schema state
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

/**
 * @typedef {Object} TableDef
 * @property {string} name
 * @property {Map<string, ColumnDef>} columns
 * @property {boolean} rlsEnabled
 * @property {string} migrationFile
 * @property {number} lineNumber
 */

/**
 * @typedef {Object} ColumnDef
 * @property {string} name
 * @property {string} type
 * @property {boolean} nullable
 * @property {string} [defaultValue]
 */

/**
 * @typedef {Object} FunctionDef
 * @property {string} name
 * @property {string[]} parameters
 * @property {string} returnType
 * @property {string} body
 * @property {boolean} securityDefiner
 * @property {string} migrationFile
 * @property {number} lineNumber
 */

/**
 * @typedef {Object} IndexDef
 * @property {string} name
 * @property {string} tableName
 * @property {string[]} columns
 * @property {string} migrationFile
 */

/**
 * @typedef {Object} PolicyDef
 * @property {string} name
 * @property {string} tableName
 * @property {string} operation
 * @property {string} migrationFile
 */

/**
 * @typedef {Object} ViewDef
 * @property {string} name
 * @property {boolean} materialized
 * @property {string} migrationFile
 */

/**
 * @typedef {Object} SchemaState
 * @property {Map<string, TableDef>} tables
 * @property {Map<string, FunctionDef>} functions
 * @property {Map<string, IndexDef>} indexes
 * @property {Map<string, PolicyDef>} policies
 * @property {Map<string, ViewDef>} views
 * @property {Set<string>} rlsEnabledTables
 */

/**
 * Parse all migrations and build schema state
 * @param {string} migrationsDir
 * @returns {SchemaState}
 */
export function parseAllMigrations(migrationsDir = 'supabase/migrations') {
  const fullPath = resolve(process.cwd(), migrationsDir)
  const files = getMigrationFiles(fullPath)

  /** @type {SchemaState} */
  const schema = {
    tables: new Map(),
    functions: new Map(),
    indexes: new Map(),
    policies: new Map(),
    views: new Map(),
    rlsEnabledTables: new Set(),
  }

  for (const file of files) {
    const content = readFileSync(join(fullPath, file), 'utf-8')
    parseMigration(content, file, schema)
  }

  return schema
}

/**
 * Get migration files sorted by timestamp
 * @param {string} dir
 * @returns {string[]}
 */
export function getMigrationFiles(dir) {
  return readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => {
      // Sort by timestamp prefix
      const aNum = parseInt(a.split('_')[0], 10) || 0
      const bNum = parseInt(b.split('_')[0], 10) || 0
      return aNum - bNum
    })
}

/**
 * Get the newest migration file info
 * @param {string} migrationsDir
 * @returns {{file: string, mtime: Date}}
 */
export function getNewestMigration(migrationsDir = 'supabase/migrations') {
  const fullPath = resolve(process.cwd(), migrationsDir)
  const files = getMigrationFiles(fullPath)

  if (files.length === 0) {
    return { file: '', mtime: new Date(0) }
  }

  // Get the most recently modified file
  let newest = { file: files[0], mtime: new Date(0) }

  for (const file of files) {
    const stat = statSync(join(fullPath, file))
    if (stat.mtime > newest.mtime) {
      newest = { file, mtime: stat.mtime }
    }
  }

  return newest
}

/**
 * Parse a single migration file
 * @param {string} content
 * @param {string} filename
 * @param {SchemaState} schema
 */
function parseMigration(content, filename, schema) {
  // Parse CREATE TABLE statements
  parseCreateTables(content, filename, schema)

  // Parse ALTER TABLE ADD COLUMN statements
  parseAlterTableAddColumn(content, filename, schema)

  // Parse DROP TABLE statements
  parseDropTables(content, schema)

  // Parse ENABLE ROW LEVEL SECURITY
  parseEnableRls(content, schema)

  // Parse CREATE FUNCTION statements
  parseCreateFunctions(content, filename, schema)

  // Parse CREATE INDEX statements
  parseCreateIndexes(content, filename, schema)

  // Parse CREATE POLICY statements
  parseCreatePolicies(content, filename, schema)

  // Parse CREATE VIEW and CREATE MATERIALIZED VIEW statements
  parseCreateViews(content, filename, schema)
}

/**
 * Parse CREATE TABLE statements
 */
function parseCreateTables(content, filename, schema) {
  const pattern = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/gi
  let match

  while ((match = pattern.exec(content)) !== null) {
    const tableName = match[1]
    const columnsStr = match[2]
    const lineNumber = getLineNumber(content, match.index)

    const columns = parseColumns(columnsStr)

    schema.tables.set(tableName, {
      name: tableName,
      columns,
      rlsEnabled: false,
      migrationFile: filename,
      lineNumber,
    })
  }
}

/**
 * Parse columns from CREATE TABLE body
 * @param {string} columnsStr
 * @returns {Map<string, ColumnDef>}
 */
function parseColumns(columnsStr) {
  const columns = new Map()

  // Remove all SQL comments first to prevent false matches
  const cleanedStr = columnsStr
    .replace(/--[^\n]*/g, '')      // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments

  // Simple column parser - handles common patterns
  const lines = cleanedStr.split(',').map(l => l.trim()).filter(l => l)

  for (const line of lines) {
    // Skip constraints
    if (/^(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|CONSTRAINT)/i.test(line)) {
      continue
    }

    // Match: column_name TYPE [NOT NULL] [DEFAULT value]
    const colMatch = line.match(/^(\w+)\s+(\w+(?:\([^)]+\))?)\s*(.*)/i)
    if (colMatch) {
      const [, name, type, rest] = colMatch
      columns.set(name, {
        name,
        type: type.toUpperCase(),
        nullable: !/NOT NULL/i.test(rest),
        defaultValue: extractDefault(rest),
      })
    }
  }

  return columns
}

/**
 * Extract DEFAULT value from column definition
 */
function extractDefault(rest) {
  const match = rest.match(/DEFAULT\s+(.+?)(?:\s+(?:NOT NULL|REFERENCES|CHECK|$))/i)
  return match ? match[1].trim() : undefined
}

/**
 * Parse ALTER TABLE ADD COLUMN statements
 */
function parseAlterTableAddColumn(content, filename, schema) {
  const pattern = /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)\s+(\w+)/gi
  let match

  while ((match = pattern.exec(content)) !== null) {
    const [, tableName, columnName, columnType] = match

    const table = schema.tables.get(tableName)
    if (table) {
      table.columns.set(columnName, {
        name: columnName,
        type: columnType.toUpperCase(),
        nullable: true, // Default assumption for ALTER ADD
      })
    }
  }
}

/**
 * Parse DROP TABLE statements
 */
function parseDropTables(content, schema) {
  const pattern = /DROP TABLE\s+(?:IF EXISTS\s+)?(\w+)/gi
  let match

  while ((match = pattern.exec(content)) !== null) {
    schema.tables.delete(match[1])
  }
}

/**
 * Parse ENABLE ROW LEVEL SECURITY
 */
function parseEnableRls(content, schema) {
  const pattern = /ALTER TABLE\s+(\w+)\s+ENABLE ROW LEVEL SECURITY/gi
  let match

  while ((match = pattern.exec(content)) !== null) {
    const tableName = match[1]
    schema.rlsEnabledTables.add(tableName)

    const table = schema.tables.get(tableName)
    if (table) {
      table.rlsEnabled = true
    }
  }
}

/**
 * Parse CREATE FUNCTION statements
 */
function parseCreateFunctions(content, filename, schema) {
  const pattern = /CREATE\s+(?:OR REPLACE\s+)?FUNCTION\s+(\w+)\s*\(([\s\S]*?)\)\s*RETURNS\s+([\s\S]*?)\s+(?:LANGUAGE|AS)/gi
  let match

  while ((match = pattern.exec(content)) !== null) {
    const [fullMatch, name, params, returnType] = match
    const lineNumber = getLineNumber(content, match.index)

    // Extract function body (rough)
    const bodyStart = content.indexOf('$$', match.index + fullMatch.length)
    const bodyEnd = content.indexOf('$$', bodyStart + 2)
    const body = bodyStart >= 0 && bodyEnd >= 0
      ? content.substring(bodyStart + 2, bodyEnd)
      : ''

    // Check for SECURITY DEFINER
    const securityDefiner = /SECURITY\s+DEFINER/i.test(
      content.substring(match.index, match.index + fullMatch.length + 500)
    )

    schema.functions.set(name, {
      name,
      parameters: params.split(',').map(p => p.trim()).filter(p => p),
      returnType: returnType.trim(),
      body,
      securityDefiner,
      migrationFile: filename,
      lineNumber,
    })
  }
}

/**
 * Parse CREATE INDEX statements
 */
function parseCreateIndexes(content, filename, schema) {
  const pattern = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)/gi
  let match

  while ((match = pattern.exec(content)) !== null) {
    const [, indexName, tableName, columnsStr] = match
    const columns = columnsStr.split(',').map(c => c.trim().split(/\s+/)[0])

    schema.indexes.set(indexName, {
      name: indexName,
      tableName,
      columns,
      migrationFile: filename,
    })
  }
}

/**
 * Parse CREATE POLICY statements
 */
function parseCreatePolicies(content, filename, schema) {
  const pattern = /CREATE POLICY\s+"?([^"]+)"?\s+ON\s+(\w+)\s+(?:AS\s+\w+\s+)?(?:FOR\s+(\w+))?/gi
  let match

  while ((match = pattern.exec(content)) !== null) {
    const [, policyName, tableName, operation] = match

    schema.policies.set(policyName, {
      name: policyName,
      tableName,
      operation: operation?.toUpperCase() || 'ALL',
      migrationFile: filename,
    })
  }
}

/**
 * Get line number for a given index in content
 * @param {string} content
 * @param {number} index
 * @returns {number}
 */
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length
}

/**
 * Extract table references from SQL body
 * @param {string} body
 * @returns {string[]}
 */
export function extractTableReferences(body) {
  const tables = new Set()

  const patterns = [
    /FROM\s+(\w+)/gi,
    /JOIN\s+(\w+)/gi,
    /UPDATE\s+(\w+)/gi,
    /INSERT\s+INTO\s+(\w+)/gi,
    /DELETE\s+FROM\s+(\w+)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(body)) !== null) {
      // Skip common keywords that might be matched
      const table = match[1].toLowerCase()
      if (!['select', 'from', 'where', 'set', 'values'].includes(table)) {
        tables.add(match[1])
      }
    }
  }

  return Array.from(tables)
}

/**
 * Extract column references from SQL body
 * @param {string} body
 * @returns {Map<string, string[]>}
 */
export function extractColumnReferences(body) {
  const columns = new Map()

  // Match table.column patterns
  const pattern = /(\w+)\.(\w+)/g
  let match

  while ((match = pattern.exec(body)) !== null) {
    const [, table, column] = match
    if (!columns.has(table)) {
      columns.set(table, [])
    }
    if (!columns.get(table).includes(column)) {
      columns.get(table).push(column)
    }
  }

  return columns
}

/**
 * Parse CREATE VIEW and CREATE MATERIALIZED VIEW statements
 */
function parseCreateViews(content, filename, schema) {
  // Match CREATE VIEW
  const viewPattern = /CREATE\s+(?:OR REPLACE\s+)?VIEW\s+(?:IF NOT EXISTS\s+)?(\w+)/gi
  let match

  while ((match = viewPattern.exec(content)) !== null) {
    const viewName = match[1]
    schema.views.set(viewName, {
      name: viewName,
      materialized: false,
      migrationFile: filename,
    })
    // Also add to tables map so it's recognized as valid
    schema.tables.set(viewName, {
      name: viewName,
      columns: new Map(),
      rlsEnabled: false,
      migrationFile: filename,
      lineNumber: getLineNumber(content, match.index),
    })
  }

  // Match CREATE MATERIALIZED VIEW
  const mvPattern = /CREATE\s+MATERIALIZED\s+VIEW\s+(?:IF NOT EXISTS\s+)?(\w+)/gi

  while ((match = mvPattern.exec(content)) !== null) {
    const viewName = match[1]
    schema.views.set(viewName, {
      name: viewName,
      materialized: true,
      migrationFile: filename,
    })
    // Also add to tables map so it's recognized as valid
    schema.tables.set(viewName, {
      name: viewName,
      columns: new Map(),
      rlsEnabled: false,
      migrationFile: filename,
      lineNumber: getLineNumber(content, match.index),
    })
  }
}
