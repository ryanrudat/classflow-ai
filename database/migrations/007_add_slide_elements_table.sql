-- Migration: Add slide_elements table for element-based canvas architecture
-- Enables Google Slides/Canva-style free-form positioning of text boxes, images, and shapes

CREATE TABLE IF NOT EXISTS slide_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  element_type VARCHAR(20) NOT NULL,  -- 'text', 'image', 'shape', 'line', etc.

  -- Position and size
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 200,
  height INTEGER NOT NULL DEFAULT 100,
  z_index INTEGER NOT NULL DEFAULT 0,

  -- Content (for text elements - HTML)
  content TEXT,

  -- Image reference (for image elements)
  image_id UUID REFERENCES uploaded_images(id) ON DELETE SET NULL,
  image_url TEXT,  -- Alternative to image_id for external URLs
  object_fit VARCHAR(20) DEFAULT 'contain',  -- 'contain', 'cover', 'fill', 'scale-down', 'none'

  -- Crop data (JSON: {x, y, width, height})
  crop_data JSONB,

  -- Styling (JSONB for flexible CSS-like properties)
  styles JSONB DEFAULT '{}',

  -- Element state
  locked BOOLEAN DEFAULT false,
  hidden BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index on slide_id for faster queries
CREATE INDEX IF NOT EXISTS idx_slide_elements_slide_id ON slide_elements(slide_id);

-- Add index on z_index for layer ordering
CREATE INDEX IF NOT EXISTS idx_slide_elements_z_index ON slide_elements(slide_id, z_index);

-- Add comments
COMMENT ON TABLE slide_elements IS 'Element-based canvas architecture for slides (Google Slides/Canva style)';
COMMENT ON COLUMN slide_elements.element_type IS 'Type of element: text, image, shape, line, etc.';
COMMENT ON COLUMN slide_elements.position_x IS 'X position in pixels from left edge of canvas';
COMMENT ON COLUMN slide_elements.position_y IS 'Y position in pixels from top edge of canvas';
COMMENT ON COLUMN slide_elements.z_index IS 'Layer order (higher = on top)';
COMMENT ON COLUMN slide_elements.content IS 'HTML content for text elements';
COMMENT ON COLUMN slide_elements.styles IS 'JSON object containing CSS-like styling properties (fontSize, color, fontFamily, etc.)';
COMMENT ON COLUMN slide_elements.crop_data IS 'JSON crop coordinates for images: {x, y, width, height}';
COMMENT ON COLUMN slide_elements.locked IS 'Prevent element from being moved or edited';
COMMENT ON COLUMN slide_elements.hidden IS 'Hide element from canvas (but keep in layers panel)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_slide_elements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER slide_elements_updated_at
  BEFORE UPDATE ON slide_elements
  FOR EACH ROW
  EXECUTE FUNCTION update_slide_elements_updated_at();
