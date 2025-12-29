import JSZip from 'jszip'
import { parseStringPromise } from 'xml2js'
import fs from 'fs/promises'

/**
 * Extract text content from PowerPoint (.pptx) file
 * PPTX files are ZIP archives containing XML files
 * Slide content is in ppt/slides/slide*.xml
 *
 * @param {string} filePath - Path to the PPTX file
 * @returns {Promise<string>} - Extracted text with slide numbers
 */
export async function extractTextFromPPTX(filePath) {
  const buffer = await fs.readFile(filePath)
  const zip = await JSZip.loadAsync(buffer)

  // Find all slide XML files and sort by slide number
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)[1])
      const numB = parseInt(b.match(/slide(\d+)/)[1])
      return numA - numB
    })

  const slides = []

  for (const slideFile of slideFiles) {
    try {
      const xmlContent = await zip.file(slideFile).async('string')
      const parsed = await parseStringPromise(xmlContent, {
        explicitArray: false,
        ignoreAttrs: true
      })

      const slideText = extractTextFromSlideXML(parsed)
      if (slideText.trim()) {
        slides.push(slideText.trim())
      }
    } catch (error) {
      console.error(`Error parsing slide ${slideFile}:`, error.message)
    }
  }

  // Format with slide numbers
  if (slides.length === 0) {
    return '[No text content found in slides]'
  }

  return slides
    .map((text, i) => `[Slide ${i + 1}]\n${text}`)
    .join('\n\n')
}

/**
 * Recursively extract text from slide XML structure
 * PowerPoint stores text in a:t (text) elements
 *
 * @param {object} obj - Parsed XML object
 * @returns {string} - Extracted text joined by spaces
 */
function extractTextFromSlideXML(obj) {
  const texts = []

  function traverse(node) {
    if (!node || typeof node !== 'object') return

    // Text content is typically in a:t elements
    if (node['a:t']) {
      const text = typeof node['a:t'] === 'string' ? node['a:t'] : ''
      if (text.trim()) {
        texts.push(text.trim())
      }
    }

    // Recurse through all keys
    for (const key of Object.keys(node)) {
      const value = node[key]
      if (Array.isArray(value)) {
        value.forEach(traverse)
      } else if (typeof value === 'object') {
        traverse(value)
      }
    }
  }

  traverse(obj)

  // Join text elements, trying to preserve some structure
  return texts.join(' ')
}

export default { extractTextFromPPTX }
