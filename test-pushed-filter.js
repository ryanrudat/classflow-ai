/**
 * Test script to verify pushed_at filtering is working
 * Run this with: node test-pushed-filter.js
 */

const { Pool } = require('pg');

async function testPushedFilter() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/classflow_ai'
  });

  try {
    console.log('🔍 Testing pushed_at filtering...\n');

    // 1. Check if column exists
    console.log('1️⃣ Checking if pushed_at column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'activities' AND column_name = 'pushed_at'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ PROBLEM: pushed_at column does NOT exist in activities table');
      console.log('   → You need to run migration 003_add_activity_pushed_at.sql');
      return;
    } else {
      console.log('✅ pushed_at column exists:', columnCheck.rows[0]);
    }

    // 2. Check total activities
    console.log('\n2️⃣ Checking activities...');
    const totalActivities = await pool.query('SELECT COUNT(*) FROM activities');
    console.log(`   Total activities in database: ${totalActivities.rows[0].count}`);

    // 3. Check activities WITH pushed_at
    const pushedActivities = await pool.query(
      'SELECT COUNT(*) FROM activities WHERE pushed_at IS NOT NULL'
    );
    console.log(`   Activities WITH pushed_at (actually pushed): ${pushedActivities.rows[0].count}`);

    // 4. Check activities WITHOUT pushed_at
    const unpushedActivities = await pool.query(
      'SELECT COUNT(*) FROM activities WHERE pushed_at IS NULL'
    );
    console.log(`   Activities WITHOUT pushed_at (generated but not pushed): ${unpushedActivities.rows[0].count}`);

    // 5. Show sample data
    console.log('\n3️⃣ Sample activities:');
    const sampleActivities = await pool.query(`
      SELECT
        id,
        type,
        difficulty_level,
        pushed_to,
        pushed_at,
        created_at
      FROM activities
      ORDER BY created_at DESC
      LIMIT 5
    `);

    sampleActivities.rows.forEach((activity, i) => {
      console.log(`\n   Activity ${i + 1}:`);
      console.log(`   - Type: ${activity.type}`);
      console.log(`   - Difficulty: ${activity.difficulty_level}`);
      console.log(`   - Pushed to: ${activity.pushed_to || 'NOT PUSHED'}`);
      console.log(`   - Pushed at: ${activity.pushed_at ? new Date(activity.pushed_at).toLocaleString() : 'NULL (not pushed yet)'}`);
      console.log(`   - Created at: ${new Date(activity.created_at).toLocaleString()}`);
    });

    // 6. Test the actual query used by the API
    console.log('\n4️⃣ Testing API query (pushedOnly=true):');
    const apiQuery = await pool.query(`
      SELECT COUNT(*)
      FROM activities
      WHERE pushed_at IS NOT NULL
    `);
    console.log(`   API would return ${apiQuery.rows[0].count} activities when pushedOnly=true`);

    console.log('\n✅ Test complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Column exists: YES`);
    console.log(`   - Total activities: ${totalActivities.rows[0].count}`);
    console.log(`   - Pushed activities: ${pushedActivities.rows[0].count}`);
    console.log(`   - Unpushed activities: ${unpushedActivities.rows[0].count}`);

    if (pushedActivities.rows[0].count === '0' && totalActivities.rows[0].count !== '0') {
      console.log('\n⚠️  WARNING: You have activities but none are marked as pushed.');
      console.log('   This could mean:');
      console.log('   1. No activities have been pushed yet (this is normal)');
      console.log('   2. Activities were pushed before the migration was run');
      console.log('   3. The backend is not setting pushed_at correctly');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '42P01') {
      console.log('\n💡 This error means the activities table doesn\'t exist.');
    } else if (error.code === '42703') {
      console.log('\n💡 This error means the pushed_at column doesn\'t exist.');
      console.log('   → Run migration 003_add_activity_pushed_at.sql');
    }
  } finally {
    await pool.end();
  }
}

testPushedFilter();
