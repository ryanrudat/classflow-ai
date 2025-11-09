import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

/**
 * Generate a complete slide deck using Claude AI
 */
export async function generateSlideDeck({ topic, subject, gradeLevel, difficulty, slideCount, includeQuizzes = true, presentationStyle = 'professional' }) {
  const contentSlides = includeQuizzes ? Math.floor(slideCount * 0.7) : slideCount - 1
  const questionSlides = includeQuizzes ? Math.ceil(slideCount * 0.3) : 0

  // Define style guidelines for each presentation style
  const styleGuides = {
    minimal: {
      description: 'Clean and simple with subtle colors, lots of whitespace, and elegant typography',
      colors: 'Use neutral tones (grays, whites) with one accent color (navy, teal, or charcoal)',
      formatting: 'Minimal decoration, focus on content with generous spacing'
    },
    professional: {
      description: 'Corporate and polished with structured layouts and professional color schemes',
      colors: 'Use business colors like navy blue (#1e3a8a), dark gray (#374151), and professional accent colors',
      formatting: 'Well-organized with clear hierarchies, professional bullet points, and balanced spacing'
    },
    creative: {
      description: 'Vibrant and engaging with bold colors, dynamic layouts, and expressive typography',
      colors: 'Use bright, energetic colors like orange (#f97316), purple (#a855f7), teal (#14b8a6), and pink (#ec4899)',
      formatting: 'Use colorful headings, highlighted text boxes, and creative emphasis'
    },
    academic: {
      description: 'Traditional and scholarly with classic serif fonts and academic color schemes',
      colors: 'Use traditional academic colors like burgundy (#991b1b), forest green (#065f46), and navy (#1e3a8a)',
      formatting: 'Formal structure with numbered lists, citations-style formatting'
    },
    modern: {
      description: 'Bold and contemporary with gradient colors, large typography, and dynamic layouts',
      colors: 'Use modern gradient colors combining blues (#3b82f6), purples (#8b5cf6), and vibrant accents',
      formatting: 'Large, bold headings with gradient backgrounds, modern card-style layouts'
    }
  }

  const currentStyle = styleGuides[presentationStyle] || styleGuides.professional

  const prompt = `You are an expert ${subject} teacher creating an engaging lesson presentation for ${gradeLevel} grade students.

Create a ${slideCount}-slide presentation about: "${topic}"

PRESENTATION STYLE: ${presentationStyle.toUpperCase()}
${currentStyle.description}

VISUAL DESIGN REQUIREMENTS:
- Colors: ${currentStyle.colors}
- Formatting: ${currentStyle.formatting}
- Typography: Use proper HTML heading tags and apply inline styles for colors and sizing
- Spacing: Use proper margins and padding for readability (wrap sections in styled divs)
- Visual Hierarchy: Make important points stand out with color, size, or styling

Content Guidelines:
- Difficulty level: ${difficulty}
- Each slide should be clear, focused, and age-appropriate
- Include ${includeQuizzes ? 'a mix of content types: title slide, informational slides, and interactive questions' : 'a title slide and informational slides only (NO question slides)'}
- Use ${difficulty === 'easy' ? 'simple vocabulary and clear explanations' : difficulty === 'hard' ? 'advanced vocabulary and complex concepts' : 'grade-appropriate language'}
- Make it engaging and educational

Return ONLY valid JSON in this exact format:
{
  "title": "Overall lesson title",
  "slides": [
    {
      "type": "title",
      "title": "Main Title",
      "body": "Subtitle or brief description with inline color styling",
      "template": "default"
    },
    {
      "type": "content",
      "title": "Slide title",
      "body": "Content in STYLED HTML format - use inline styles for colors, fonts, and spacing. Example: <div style='background-color: #f0f9ff; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem;'><h3 style='color: #1e40af; margin-bottom: 0.5rem;'>Key Point</h3><p style='color: #374151; line-height: 1.8;'>Important content here</p></div>",
      "template": "default"
    }${includeQuizzes ? `,
    {
      "type": "question",
      "title": "Question title",
      "body": "Context or setup for the question with styling",
      "template": "default",
      "question": {
        "text": "The question text?",
        "type": "multiple_choice",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0
      }
    }` : ''}
  ]
}

STYLING REQUIREMENTS - VERY IMPORTANT:
- Apply inline CSS styles throughout the HTML content
- Use styled <div> wrappers for sections with background colors, padding, and borders
- Style headings (<h2>, <h3>) with appropriate colors from the ${presentationStyle} palette
- Use colored text boxes for key concepts: <div style="background-color: [light color]; padding: 1rem; border-left: 4px solid [accent color]; margin: 1rem 0;">
- Add proper spacing with margin and padding in all elements
- Use line-height: 1.6-1.8 for better readability
- Make titles large and bold with proper colors
- Use bullet points with <ul style="margin-left: 1.5rem; line-height: 1.8;"> for lists

IMPORTANT:
- Return ONLY the JSON object, no markdown code blocks, no explanations
- MUST use inline styles extensively - every major element should have style attributes
- Use proper HTML tags: <div>, <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>
- Include ${contentSlides} content slides${includeQuizzes ? ` and ${questionSlides} question slides` : ' (NO question slides)'}
${includeQuizzes ? '- Make questions thought-provoking and aligned with the content' : ''}
- Ensure content is properly spaced for easy reading - avoid cramming too much on one slide`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0].text

    // Parse JSON response
    let parsedContent
    try {
      // Try to extract JSON if Claude wrapped it in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsedContent = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      throw new Error('AI returned invalid JSON format')
    }

    // Validate response structure
    if (!parsedContent.title || !Array.isArray(parsedContent.slides)) {
      throw new Error('AI response missing required fields')
    }

    console.log('✨ AI generated slides:', parsedContent.slides.length, 'slides')
    console.log('📋 Slide types:', parsedContent.slides.map(s => s.type))

    return {
      deck: {
        title: parsedContent.title
      },
      slides: parsedContent.slides
    }

  } catch (error) {
    console.error('Slide generation error:', error)
    throw new Error(`Failed to generate slides: ${error.message}`)
  }
}

/**
 * Generate an easier or harder variant of an existing slide
 */
export async function generateSlideVariant(originalSlide, direction) {
  const isEasier = direction === 'easier'

  const prompt = `You are helping a student who ${isEasier ? 'is struggling with' : 'has mastered'} this content.

Original slide content:
Title: ${originalSlide.title}
Body: ${originalSlide.body}
${originalSlide.question ? `Question: ${JSON.stringify(originalSlide.question)}` : ''}

Create a ${isEasier ? 'SIMPLER, more scaffolded' : 'MORE CHALLENGING, more in-depth'} version of this slide.

${isEasier ? `For easier version:
- Use simpler vocabulary
- Break down complex ideas into smaller steps
- Add more context and examples
- Make questions more straightforward` : `For harder version:
- Use more advanced vocabulary
- Add deeper analysis and connections
- Include more complex reasoning
- Make questions more challenging and open-ended`}

Return ONLY valid JSON in this format:
{
  "type": "${originalSlide.type}",
  "title": "Adjusted title",
  "body": "Adjusted content in HTML format",
  "template": "${originalSlide.template}"${originalSlide.question ? `,
  "question": {
    "text": "Adjusted question?",
    "type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0
  }` : ''}
}

Return ONLY the JSON, no markdown blocks or explanations.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0].text

    // Parse JSON response
    let parsedContent
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsedContent = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch (parseError) {
      console.error('Failed to parse variant response:', content)
      throw new Error('AI returned invalid JSON format for variant')
    }

    return parsedContent

  } catch (error) {
    console.error('Variant generation error:', error)
    throw new Error(`Failed to generate variant: ${error.message}`)
  }
}
