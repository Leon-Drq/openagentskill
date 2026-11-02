import { DatabaseSync } from 'node:sqlite'

// Exercises the actual Better Auth D1 dialect, not its Node SQLite dialect.
// Native workerd verification remains a separate deployment prerequisite.
export function sqliteD1(path = ':memory:') {
  const sqlite = new DatabaseSync(path)
  sqlite.exec('PRAGMA foreign_keys=ON')
  const execute = (query, parameters) => {
    const statement = sqlite.prepare(query)
    const results = statement.all(...parameters)
    const meta = sqlite.prepare('SELECT changes() AS changes, last_insert_rowid() AS last_row_id').get()
    return { results, meta, success: true }
  }
  const prepare = (query, parameters = []) => ({
    query, parameters,
    bind: (...values) => prepare(query, values),
    all: async () => execute(query, parameters),
  })
  return {
    sqlite,
    database: {
      prepare,
      async exec(query) { sqlite.exec(query) },
      async batch(statements) {
        sqlite.exec('BEGIN IMMEDIATE')
        try {
          const result = statements.map(statement => execute(statement.query, statement.parameters))
          sqlite.exec('COMMIT')
          return result
        } catch (error) { sqlite.exec('ROLLBACK'); throw error }
      },
    },
  }
}
