-- Migration: Add uploaded_videos table for video uploads
-- Supports large video files (up to 500MB) for interactive video activities

-- Create uploaded_videos table
CREATE TABLE IF NOT EXISTS uploaded_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  duration_seconds INTEGER,
  mime_type VARCHAR(100),
  transcript JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_uploaded_videos_user_id ON uploaded_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_videos_created_at ON uploaded_videos(created_at DESC);

-- Create uploaded_images table if it doesn't exist (for image uploads)
CREATE TABLE IF NOT EXISTS uploaded_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(500),
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_uploaded_images_user_id ON uploaded_images(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_created_at ON uploaded_images(created_at DESC);
