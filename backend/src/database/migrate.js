import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
})

async function runMigrations() {
  const client = await pool.connect()

  try {
    console.log('🔄 Starting database migrations...')

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Get list of already executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT filename FROM migrations ORDER BY filename'
    )
    const executedFiles = new Set(executedMigrations.map(m => m.filename))

    // Read migration files from database/migrations directory
    const migrationsDir = path.join(__dirname, '../../../database/migrations')

    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found')
      return
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    if (files.length === 0) {
      console.log('✅ No migration files found')
      return
    }

    // Execute pending migrations
    for (const file of files) {
      if (executedFiles.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`)
        continue
      }

      console.log(`🔧 Running migration: ${file}`)

      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')

      // Execute the migration
      await client.query(sql)

      // Record the migration
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [file]
      )

      console.log(`✅ Completed migration: ${file}`)
    }

    console.log('✅ All migrations completed successfully!')

  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations()
  .then(() => {
    console.log('🎉 Migration process finished')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
