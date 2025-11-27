-- Migration: Fix uploaded_videos table - add missing columns
-- This fixes the "column updated_at does not exist" error

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_videos' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE uploaded_videos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add transcript column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_videos' AND column_name = 'transcript'
  ) THEN
    ALTER TABLE uploaded_videos ADD COLUMN transcript JSONB;
  END IF;
END $$;

-- Add duration_seconds column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_videos' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE uploaded_videos ADD COLUMN duration_seconds INTEGER;
  END IF;
END $$;

-- Add mime_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_videos' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE uploaded_videos ADD COLUMN mime_type VARCHAR(100);
  END IF;
END $$;
