-- Migration: Add image fitting options to slides table
-- Adds objectFit and lockAspectRatio fields for better image control

ALTER TABLE slides
ADD COLUMN IF NOT EXISTS image_object_fit VARCHAR(20) DEFAULT 'contain',
ADD COLUMN IF NOT EXISTS image_lock_aspect_ratio BOOLEAN DEFAULT false;

-- Add comment to describe the columns
COMMENT ON COLUMN slides.image_object_fit IS 'CSS object-fit value: contain, cover, fill, scale-down, or none';
COMMENT ON COLUMN slides.image_lock_aspect_ratio IS 'Whether to lock aspect ratio when resizing image in editor';
