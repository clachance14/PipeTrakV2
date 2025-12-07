/**
 * TypeScript types parser for database.types.ts
 * Uses regex-based parsing (no AST dependency)
 */
import { readFileSync, statSync } from 'fs'
import { resolve } from 'path'

/**
 * @typedef {Object} GeneratedSchema
 * @property {Map<string, GeneratedTable>} tables
 * @property {Map<string, string[]>} enums
 * @property {Date} mtime
 */

/**
 * @typedef {Object} GeneratedTable
 * @property {string} name
 * @property {Map<string, GeneratedColumn>} columns
 */

/**
 * @typedef {Object} GeneratedColumn
 * @property {string} name
 * @property {string} type
 * @property {boolean} nullable
 */

/**
 * Parse database.types.ts file
 * @param {string} typesPath
 * @returns {GeneratedSchema}
 */
export function parseGeneratedTypes(typesPath = 'src/types/database.types.ts') {
  const fullPath = resolve(process.cwd(), typesPath)
  const content = readFileSync(fullPath, 'utf-8')
  const stat = statSync(fullPath)

  /** @type {GeneratedSchema} */
  const schema = {
    tables: new Map(),
    enums: new Map(),
    mtime: stat.mtime,
  }

  // Parse Tables section
  parseTables(content, schema)

  // Parse Enums section
  parseEnums(content, schema)

  return schema
}

/**
 * Get types file modification time
 * @param {string} typesPath
 * @returns {Date}
 */
export function getTypesModTime(typesPath = 'src/types/database.types.ts') {
  const fullPath = resolve(process.cwd(), typesPath)
  try {
    return statSync(fullPath).mtime
  } catch {
    return new Date(0)
  }
}

/**
 * Parse Tables from generated types
 * Uses a simpler approach: find table names by looking for the pattern
 * where a table definition starts with "tablename: { Row: {"
 */
function parseTables(content, schema) {
  // Find the public.Tables section
  const publicMatch = content.match(/public:\s*\{[\s\S]*?Tables:\s*\{([\s\S]*?)\n\s{4}\}[\s\S]*?Views:/m)
  if (!publicMatch) {
    // Fallback: try to find Tables section directly
    const tablesMatch = content.match(/Tables:\s*\{([\s\S]*?)\n\s{4}\}/m)
    if (!tablesMatch) return
  }

  // Simpler approach: find all table names by looking for the pattern:
  // "      tablename: {" followed by "Row: {"
  // Tables are indented with 6 spaces in the generated types
  const tableNamePattern = /^(\s{6})(\w+):\s*\{/gm
  let match

  while ((match = tableNamePattern.exec(content)) !== null) {
    const tableName = match[2]

    // Verify this is actually a table by checking if it has a Row definition nearby
    const afterMatch = content.substring(match.index, match.index + 200)
    if (afterMatch.includes('Row: {')) {
      // Extract columns from the Row section
      const rowStart = content.indexOf('Row: {', match.index)
      if (rowStart !== -1 && rowStart < match.index + 100) {
        const rowEnd = findMatchingBrace(content, rowStart + 5)
        if (rowEnd !== -1) {
          const rowContent = content.substring(rowStart + 6, rowEnd)
          const columns = parseRowColumns(rowContent)

          schema.tables.set(tableName, {
            name: tableName,
            columns,
          })
        }
      }
    }
  }
}

/**
 * Find the matching closing brace for an opening brace
 * @param {string} content
 * @param {number} openBraceIndex
 * @returns {number} Index of closing brace, or -1 if not found
 */
function findMatchingBrace(content, openBraceIndex) {
  let depth = 1
  for (let i = openBraceIndex + 1; i < content.length; i++) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * Parse Row columns from table definition
 * @param {string} rowContent
 * @returns {Map<string, GeneratedColumn>}
 */
function parseRowColumns(rowContent) {
  const columns = new Map()

  // Match: column_name: type | null
  const columnPattern = /(\w+):\s*([^|\n]+?)(?:\s*\|\s*null)?(?:\n|$)/g
  let match

  while ((match = columnPattern.exec(rowContent)) !== null) {
    const [fullMatch, name, typeStr] = match
    const nullable = fullMatch.includes('| null')
    const type = typeStr.trim()

    columns.set(name, {
      name,
      type: normalizeType(type),
      nullable,
    })
  }

  return columns
}

/**
 * Normalize TypeScript type to comparable form
 * @param {string} type
 * @returns {string}
 */
function normalizeType(type) {
  // Remove whitespace and common wrappers
  return type
    .replace(/\s+/g, '')
    .replace(/Database\["public"\]\["Enums"\]\["(\w+)"\]/, 'enum:$1')
    .replace(/Json/, 'json')
}

/**
 * Parse Enums from generated types
 */
function parseEnums(content, schema) {
  const enumsMatch = content.match(/Enums:\s*\{([\s\S]*?)\n\s{6}\}/m)
  if (!enumsMatch) return

  const enumsContent = enumsMatch[1]

  // Match: enum_name: "value1" | "value2" | ...
  const enumPattern = /(\w+):\s*([^\n]+)/g
  let match

  while ((match = enumPattern.exec(enumsContent)) !== null) {
    const [, enumName, valuesStr] = match
    const values = valuesStr
      .split('|')
      .map(v => v.trim().replace(/"/g, ''))
      .filter(v => v && v !== 'null')

    schema.enums.set(enumName, values)
  }
}

/**
 * Map PostgreSQL types to TypeScript types
 * @param {string} pgType
 * @returns {string}
 */
export function pgTypeToTsType(pgType) {
  const mapping = {
    'UUID': 'string',
    'TEXT': 'string',
    'VARCHAR': 'string',
    'CHAR': 'string',
    'INTEGER': 'number',
    'INT': 'number',
    'BIGINT': 'number',
    'SMALLINT': 'number',
    'NUMERIC': 'number',
    'DECIMAL': 'number',
    'REAL': 'number',
    'DOUBLE PRECISION': 'number',
    'BOOLEAN': 'boolean',
    'BOOL': 'boolean',
    'TIMESTAMP': 'string',
    'TIMESTAMPTZ': 'string',
    'DATE': 'string',
    'TIME': 'string',
    'TIMETZ': 'string',
    'JSON': 'json',
    'JSONB': 'json',
    'BYTEA': 'string',
  }

  const normalized = pgType.toUpperCase().replace(/\([^)]+\)/, '')
  return mapping[normalized] || 'unknown'
}

/**
 * Compare schema column type with generated type
 * @param {string} schemaType - PostgreSQL type from migrations
 * @param {string} generatedType - TypeScript type from database.types.ts
 * @returns {boolean}
 */
export function typesMatch(schemaType, generatedType) {
  const expectedTs = pgTypeToTsType(schemaType)
  const normalizedGenerated = normalizeType(generatedType)

  // Handle enum types
  if (normalizedGenerated.startsWith('enum:')) {
    return true // Enums are handled separately
  }

  // Handle arrays
  if (schemaType.endsWith('[]')) {
    return normalizedGenerated.endsWith('[]')
  }

  return expectedTs === normalizedGenerated || generatedType === 'unknown'
}
