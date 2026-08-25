# Library Migration Instructions for Render

The Content Library feature requires database tables that need to be created on your production database.

## Problem
You're getting a 500 error when saving to library because the `content_library` tables don't exist on Render yet.

## Solution: Run Migration on Render

### Option 1: Using Render Shell (Recommended)

1. **Go to Render Dashboard**
   - Navigate to https://dashboard.render.com
   - Click on your **Backend service**

2. **Open Shell**
   - Click on "Shell" tab in the top navigation
   - This opens a terminal connected to your production server

3. **Run Migration Script**
   ```bash
   cd /opt/render/project/src/backend
   node migrate-library.js
   ```

4. **Verify Success**
   You should see:
   ```
   🚀 Starting library migration...
   📋 Checking if library tables exist...
   📖 Reading migration file...
   ⚙️  Applying migration...
   ✅ Created tables: [ 'content_library', 'library_activity_tags', 'library_tags' ]
   🎉 Migration completed successfully!
   ```

### Option 2: Using PostgreSQL Connection

If you prefer to connect directly to your database:

1. **Get Database Credentials**
   - In Render Dashboard, go to your PostgreSQL database
   - Click "Connect" to get connection string
   - It looks like: `postgres://user:pass@host:port/database`

2. **Run Migration Locally**
   ```bash
   psql "YOUR_DATABASE_URL" < database/migrations/012_add_content_library.sql
   ```

### Option 3: Using Render Environment Variables

1. **Add to Build Command** (in Render service settings)
   - Current: `npm install`
   - Change to: `npm install && node migrate-library.js`

2. **Redeploy**
   - Trigger a new deployment
   - Migration will run automatically on next deploy

## Verify Migration

After running migration, verify it worked:

### Check via API
Visit: `https://your-backend-url.onrender.com/api/library/health`

Expected response:
```json
{
  "status": "ok",
  "tables": [
    "content_library",
    "library_activity_tags",
    "library_tags"
  ],
  "message": "Library system ready"
}
```

### Check via Database
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%library%'
ORDER BY table_name;
```

Expected output:
```
content_library
library_activity_tags
library_tags
```

## Troubleshooting

### Error: "Migration file not found"
- Make sure you're in the `/opt/render/project/src/backend` directory
- The migration file should be at `../database/migrations/012_add_content_library.sql`

### Error: "DATABASE_URL not set"
- This shouldn't happen on Render as it auto-sets this
- Check your Environment Variables in Render dashboard

### Error: "relation already exists"
- Tables are already created, no action needed
- Try the health check API to verify

### Still getting 500 errors after migration
1. Restart your backend service in Render
2. Check that the health check API returns "ok"
3. Try saving to library again
4. Check backend logs for any other errors

## What This Migration Creates

The migration creates 3 tables:

1. **content_library** - Stores saved activities
   - Columns: id, teacher_id, title, description, type, content, difficulty_level, subject, etc.

2. **library_tags** - User-defined tags
   - Columns: id, teacher_id, name, color

3. **library_activity_tags** - Links activities to tags
   - Columns: library_item_id, tag_id

Plus indexes and triggers for performance and auto-updating timestamps.

## Need Help?

If you're still having issues:
1. Check Render backend logs for detailed error messages
2. Run the health check: `/api/library/health`
3. Share the error output with your developer
