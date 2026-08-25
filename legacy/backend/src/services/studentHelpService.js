import Anthropic from '@anthropic-ai/sdk'
import db from '../database/db.js'

// Initialize Claude client
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

/**
 * Student Help Service
 * Generates personalized feedback when students get questions wrong
 */

/**
 * Generate personalized help for a student who got a question wrong
 * @param {Object} params
 * @param {string} params.questionText - The question text
 * @param {string} params.correctAnswer - The correct answer
 * @param {string} params.studentAnswer - What the student answered
 * @param {number} params.attemptNumber - Which attempt this is (1, 2, 3...)
 * @param {Object} params.studentContext - Student's recent performance
 * @returns {Object} Feedback object with explanation, hint, and options
 */
export async function generateHelp({
  questionText,
  correctAnswer,
  studentAnswer,
  attemptNumber = 1,
  studentContext = {}
}) {
  const prompt = buildHelpPrompt({
    questionText,
    correctAnswer,
    studentAnswer,
    attemptNumber,
    studentContext
  })

  try {
    const startTime = Date.now()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const generationTime = Date.now() - startTime
    const response = JSON.parse(message.content[0].text)

    // Log for analytics
    await logHelpGenerated({
      studentId: studentContext.studentId,
      sessionId: studentContext.sessionId,
      activityId: studentContext.activityId,
      questionNumber: studentContext.questionNumber,
      attemptNumber,
      helpType: response.helpType,
      generationTime
    })

    return response
  } catch (error) {
    console.error('Error generating student help:', error)
    // Fallback to generic help
    return generateGenericHelp(questionText, correctAnswer, attemptNumber)
  }
}

/**
 * Generate a simpler version of a question for struggling students
 * @param {Object} params
 * @param {string} params.originalQuestion - The original question
 * @param {string} params.correctAnswer - The correct answer
 * @param {Object} params.studentContext - Student context
 * @returns {Object} Simpler question with same learning objective
 */
export async function generateSimplerVersion({
  originalQuestion,
  correctAnswer,
  studentContext = {}
}) {
  const prompt = `You are a helpful tutor for a high school student who is struggling with a question.

ORIGINAL QUESTION:
"${originalQuestion}"

CORRECT ANSWER:
"${correctAnswer}"

STUDENT CONTEXT:
- Recent correct rate: ${studentContext.recentCorrectRate || 'unknown'}%
- This student has been struggling (multiple wrong attempts)

YOUR TASK:
Create a SIMPLER version of this same question that:
1. Tests the same concept/learning objective
2. Uses simpler language and shorter sentences
3. Removes unnecessary complexity
4. Breaks down multi-part questions into one clear question
5. Provides more context or scaffolding

CRITICAL RULES:
- Must test the SAME concept (don't change the learning objective)
- Make it notably easier, not just slightly different
- Keep it a real question (not a fill-in-the-blank with obvious answer)
- High school level (don't talk down to them like children)

OUTPUT FORMAT (JSON only, no other text):
{
  "simplerQuestion": "The rewritten, simpler question",
  "answer": "The correct answer to the simpler version",
  "scaffolding": "Optional hint or context to help them",
  "sameConceptCheck": "Brief note confirming this tests the same concept"
}

EXAMPLE:
Original: "Analyze how the author's use of metaphor in the third stanza contributes to the poem's overall theme of isolation."
Simpler: "What does the author compare loneliness to in the poem, and why do you think they chose that comparison?"`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const response = JSON.parse(message.content[0].text)

    // Log simpler version request
    await db.query(
      `INSERT INTO simpler_version_requests
       (student_id, session_id, activity_id, original_question, simpler_question, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        studentContext.studentId,
        studentContext.sessionId,
        studentContext.activityId,
        originalQuestion,
        response.simplerQuestion
      ]
    )

    return response
  } catch (error) {
    console.error('Error generating simpler version:', error)
    // Fallback
    return {
      simplerQuestion: originalQuestion,
      answer: correctAnswer,
      scaffolding: "Take your time and think about what the question is really asking.",
      sameConceptCheck: "Unable to generate simpler version"
    }
  }
}

/**
 * Build the AI prompt for generating student help
 */
function buildHelpPrompt({ questionText, correctAnswer, studentAnswer, attemptNumber, studentContext }) {
  const attemptContext = attemptNumber > 1
    ? `This is attempt #${attemptNumber}. The student has tried before and still got it wrong.`
    : 'This is their first attempt.'

  const performanceContext = studentContext.recentCorrectRate !== undefined
    ? `Recent performance: ${studentContext.recentCorrectRate}% correct rate`
    : 'No recent performance data'

  return `You are a helpful tutor providing feedback to a high school student who got a question wrong.

QUESTION:
"${questionText}"

CORRECT ANSWER:
"${correctAnswer}"

STUDENT'S ANSWER:
"${studentAnswer}"

CONTEXT:
- ${attemptContext}
- ${performanceContext}
- Subject: ${studentContext.subject || 'unknown'}

YOUR TASK:
Generate helpful feedback that:
1. Acknowledges their attempt (be encouraging, not condescending)
2. Explains what's wrong with THEIR SPECIFIC answer (not generic)
3. Provides a hint toward the right answer
4. Adjusts approach based on attempt number:
   - Attempt 1: Give hints, make them think, DON'T give the answer
   - Attempt 2: Be more direct, offer clearer guidance
   - Attempt 3+: Provide very direct help or offer simpler version

CRITICAL RULES:
- DON'T talk down to them (they're high schoolers, not children)
- BE SPECIFIC to their answer (not "that's wrong, try again")
- DON'T just give the answer on first attempt (make them think)
- On attempt 2+, be more helpful and offer simpler version
- Keep it brief (3-4 sentences max)

OUTPUT FORMAT (JSON only, no other text):
{
  "feedback": "Your encouraging response to their attempt",
  "explanation": "Why their answer is wrong, specific to what they said",
  "hint": "Helpful hint pointing toward correct answer",
  "helpType": "gentle-nudge" | "direct-explanation" | "simpler-version",
  "offerSimplerVersion": true/false,
  "encouragement": "Short encouraging message"
}

EXAMPLE 1 (Attempt 1):
Question: "What is the main theme of To Kill a Mockingbird?"
Student: "It's about a trial"
Correct: "Injustice and moral growth"
Attempt: 1

Good Response:
{
  "feedback": "You're right that there's an important trial in the story!",
  "explanation": "But the trial is just one event. The theme is the bigger idea the author wants us to understand about life.",
  "hint": "Think about what Scout learns throughout the story, especially about fairness and doing what's right even when it's hard.",
  "helpType": "gentle-nudge",
  "offerSimplerVersion": false,
  "encouragement": "You're on the right track - think bigger picture!"
}

EXAMPLE 2 (Attempt 2):
Same question, attempt 2, student still wrong

Good Response:
{
  "feedback": "I can see you're working hard on this!",
  "explanation": "We're looking for the central message about life that Harper Lee wants readers to take away - not just what happens in the plot.",
  "hint": "The story shows us how people can be treated unfairly because of prejudice, and how characters like Atticus choose to stand up for what's right despite opposition. What lesson is Lee teaching us?",
  "helpType": "direct-explanation",
  "offerSimplerVersion": true,
  "encouragement": "Let me know if you want me to rephrase the question in a simpler way."
}`

  return prompt
}

/**
 * Generate generic help as fallback when AI fails
 */
function generateGenericHelp(questionText, correctAnswer, attemptNumber) {
  if (attemptNumber === 1) {
    return {
      feedback: "Not quite right, but good effort!",
      explanation: "Take another look at what the question is asking.",
      hint: "Read the question carefully and think about each part of it.",
      helpType: "gentle-nudge",
      offerSimplerVersion: false,
      encouragement: "You can do this - try again!"
    }
  } else if (attemptNumber === 2) {
    return {
      feedback: "I can see you're working on this!",
      explanation: `The correct answer is: ${correctAnswer}`,
      hint: "Think about why this is the right answer and how it connects to the question.",
      helpType: "direct-explanation",
      offerSimplerVersion: true,
      encouragement: "Would you like a simpler version of this question?"
    }
  } else {
    return {
      feedback: "Let's try a different approach.",
      explanation: `The answer we're looking for is: ${correctAnswer}`,
      hint: "Let's break this down into smaller steps.",
      helpType: "simpler-version",
      offerSimplerVersion: true,
      encouragement: "I can give you a simpler version of this question."
    }
  }
}

/**
 * Log help generation to database
 */
async function logHelpGenerated({
  studentId,
  sessionId,
  activityId,
  questionNumber,
  attemptNumber,
  helpType,
  generationTime
}) {
  try {
    // This will be logged when help is requested via the API endpoint
    // (not here, to avoid duplication)
    console.log('Help generated:', {
      studentId,
      sessionId,
      activityId,
      questionNumber,
      attemptNumber,
      helpType,
      generationTime: `${generationTime}ms`
    })
  } catch (error) {
    console.error('Error logging help:', error)
  }
}

/**
 * Get student's recent performance for help context
 */
export async function getStudentPerformance(studentId, sessionId) {
  try {
    const result = await db.query(
      'SELECT * FROM get_student_recent_performance($1, $2, $3)',
      [studentId, sessionId, 10] // Last 10 responses
    )

    if (result.rows.length > 0) {
      return result.rows[0]
    }

    return {
      correct_rate: 0,
      avg_time_seconds: 0,
      total_responses: 0,
      helped_count: 0,
      struggling: false
    }
  } catch (error) {
    console.error('Error getting student performance:', error)
    return null
  }
}

export default {
  generateHelp,
  generateSimplerVersion,
  getStudentPerformance
}
