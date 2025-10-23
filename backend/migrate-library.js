// Run this script on Render to apply library migration
// Command: node migrate-library.js

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

async function runMigration() {
  console.log('🚀 Starting library migration...')

  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable not set')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    // Check if tables already exist
    console.log('📋 Checking if library tables exist...')
    const checkResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('content_library', 'library_tags', 'library_activity_tags')
      ORDER BY table_name
    `)

    const existingTables = checkResult.rows.map(r => r.table_name)
    console.log('Existing tables:', existingTables)

    if (existingTables.length === 3) {
      console.log('✅ Library tables already exist! No migration needed.')
      await pool.end()
      return
    }

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/012_add_content_library.sql')
    console.log('📖 Reading migration file:', migrationPath)

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Run migration
    console.log('⚙️  Applying migration...')
    await pool.query(migrationSQL)

    // Verify tables were created
    const verifyResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('content_library', 'library_tags', 'library_activity_tags')
      ORDER BY table_name
    `)

    const createdTables = verifyResult.rows.map(r => r.table_name)
    console.log('✅ Created tables:', createdTables)

    if (createdTables.length === 3) {
      console.log('🎉 Migration completed successfully!')
    } else {
      console.error('⚠️  Warning: Not all tables were created')
      console.log('Expected: content_library, library_activity_tags, library_tags')
      console.log('Got:', createdTables)
    }

    await pool.end()
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Error details:', {
      code: error.code,
      detail: error.detail,
      position: error.position
    })
    await pool.end()
    process.exit(1)
  }
}

runMigration()
