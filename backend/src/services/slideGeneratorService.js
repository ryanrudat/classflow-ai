import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

/**
 * Generate a complete slide deck using Claude AI
 */
export async function generateSlideDeck({ topic, subject, gradeLevel, difficulty, slideCount }) {
  const prompt = `You are an expert ${subject} teacher creating an engaging lesson presentation for ${gradeLevel} grade students.

Create a ${slideCount}-slide presentation about: "${topic}"

Guidelines:
- Difficulty level: ${difficulty}
- Each slide should be clear, focused, and age-appropriate
- Include a mix of content types: title slide, informational slides, and interactive questions
- Use ${difficulty === 'easy' ? 'simple vocabulary and clear explanations' : difficulty === 'hard' ? 'advanced vocabulary and complex concepts' : 'grade-appropriate language'}
- Make it engaging and educational

Return ONLY valid JSON in this exact format:
{
  "title": "Overall lesson title",
  "slides": [
    {
      "type": "title",
      "title": "Main Title",
      "body": "Subtitle or brief description",
      "template": "default"
    },
    {
      "type": "content",
      "title": "Slide title",
      "body": "Content in HTML format with <p>, <ul>, <li>, <strong>, <em> tags for formatting",
      "template": "default"
    },
    {
      "type": "question",
      "title": "Question title",
      "body": "Context or setup for the question",
      "template": "default",
      "question": {
        "text": "The question text?",
        "type": "multiple_choice",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0
      }
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown code blocks, no explanations
- Use proper HTML tags in body content: <p> for paragraphs, <ul> and <li> for lists, <strong> for bold, <em> for italic
- Include ${Math.floor(slideCount * 0.7)} content slides and ${Math.ceil(slideCount * 0.3)} question slides
- Make questions thought-provoking and aligned with the content`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
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
      model: 'claude-3-5-sonnet-20240620',
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
