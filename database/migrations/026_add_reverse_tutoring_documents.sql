-- Migration: Add document uploads for reverse tutoring topics
-- Teachers can upload PDFs, slides, and documents that ALEX uses as context

CREATE TABLE IF NOT EXISTS reverse_tutoring_topic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES reverse_tutoring_topics(id) ON DELETE CASCADE,

  -- Document metadata
  original_filename VARCHAR(500) NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  file_size_bytes INTEGER NOT NULL,

  -- Extracted content
  extracted_text TEXT NOT NULL,
  text_length INTEGER NOT NULL,

  -- Summarization (for large documents)
  is_summarized BOOLEAN DEFAULT false,
  summary TEXT,
  summary_generated_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_file_type CHECK (file_type IN ('pdf', 'docx', 'doc', 'txt', 'md', 'pptx'))
);

-- Index for efficient topic lookups
CREATE INDEX IF NOT EXISTS idx_topic_documents_topic_id ON reverse_tutoring_topic_documents(topic_id);

-- Add cached combined document context to topics table
-- This is regenerated whenever documents are added/removed
ALTER TABLE reverse_tutoring_topics
ADD COLUMN IF NOT EXISTS document_context TEXT,
ADD COLUMN IF NOT EXISTS document_context_updated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON TABLE reverse_tutoring_topic_documents IS
'Stores uploaded documents for reverse tutoring topics. Text is extracted and optionally summarized for AI context.';

COMMENT ON COLUMN reverse_tutoring_topic_documents.summary IS
'AI-generated summary for documents exceeding 10,000 characters. Used to fit in context window.';

COMMENT ON COLUMN reverse_tutoring_topics.document_context IS
'Cached combined context from all documents. Regenerated when documents are added or removed.';
