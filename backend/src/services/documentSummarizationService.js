import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

// Threshold for triggering summarization (characters)
const SUMMARIZATION_THRESHOLD = 10000
// Target summary length to fit in context window
const TARGET_SUMMARY_CHARS = 2000
// Max combined document context
const MAX_COMBINED_CHARS = 8000

/**
 * Check if document needs summarization based on length
 * @param {number} textLength - Length of extracted text
 * @returns {boolean}
 */
export function needsSummarization(textLength) {
  return textLength > SUMMARIZATION_THRESHOLD
}

/**
 * Generate AI summary for large documents
 * Preserves key educational content while reducing token usage
 *
 * @param {string} text - Full extracted text from document
 * @param {string} filename - Original filename for context
 * @param {string} documentType - File type (PDF, DOCX, PPTX, etc.)
 * @returns {Promise<string>} - Summarized content
 */
export async function summarizeDocument(text, filename, documentType) {
  const prompt = `You are summarizing an educational document for use as context in a student tutoring session.

Document: "${filename}" (${documentType})
Content length: ${text.length} characters

Your summary should:
1. Preserve all key concepts, definitions, and vocabulary terms
2. Maintain important facts, dates, formulas, or procedures
3. Keep the educational structure (main topics and subtopics)
4. Remove redundant explanations and filler text
5. Be approximately ${TARGET_SUMMARY_CHARS} characters

Provide a structured summary that a tutoring AI can use to verify student understanding.

Document content:
${text.substring(0, 30000)}`

  try {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    return response.content[0].text
  } catch (error) {
    console.error('Document summarization failed:', error)
    // Fall back to truncation if summarization fails
    return text.substring(0, TARGET_SUMMARY_CHARS) + '\n\n[Content truncated due to length]'
  }
}

/**
 * Combine multiple document summaries/texts into a single context prompt
 * Prioritizes most recent documents and respects token limits
 *
 * @param {Array} documents - Array of document objects with extracted_text, summary, etc.
 * @param {number} maxChars - Maximum characters for combined context
 * @returns {string|null} - Combined document context or null if no documents
 */
export function combineDocumentContexts(documents, maxChars = MAX_COMBINED_CHARS) {
  if (!documents || documents.length === 0) return null

  // Sort by upload date (most recent first)
  const sorted = [...documents].sort((a, b) =>
    new Date(b.uploaded_at) - new Date(a.uploaded_at)
  )

  const sections = []
  let totalChars = 0

  for (const doc of sorted) {
    // Use summary if available, otherwise use extracted text
    const content = doc.is_summarized && doc.summary
      ? doc.summary
      : doc.extracted_text

    const header = `[Document: ${doc.original_filename}]`
    const section = `${header}\n${content}`

    if (totalChars + section.length > maxChars) {
      // Truncate this document to fit remaining space
      const remaining = maxChars - totalChars - header.length - 50
      if (remaining > 500) {
        sections.push(`${header}\n${content.substring(0, remaining)}...`)
      }
      break
    }

    sections.push(section)
    totalChars += section.length
  }

  if (sections.length === 0) return null

  return sections.join('\n\n---\n\n')
}

export default {
  needsSummarization,
  summarizeDocument,
  combineDocumentContexts,
  SUMMARIZATION_THRESHOLD,
  TARGET_SUMMARY_CHARS,
  MAX_COMBINED_CHARS
}
