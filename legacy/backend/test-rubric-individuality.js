/**
 * Test script to check if rubric analysis is being individualized per student
 */

import db from './src/database/db.js'

async function testRubricIndividuality() {
  try {
    console.log('🔍 Testing Rubric Individuality...\n')

    // Get recent session with conversations
    const sessionResult = await db.query(`
      SELECT DISTINCT s.id, s.join_code, s.created_at
      FROM sessions s
      JOIN reverse_tutoring_conversations rtc ON s.id = rtc.session_id
      WHERE rtc.conversation_history IS NOT NULL
      ORDER BY s.created_at DESC
      LIMIT 1
    `)

    if (sessionResult.rows.length === 0) {
      console.log('❌ No sessions with conversations found')
      process.exit(0)
    }

    const sessionId = sessionResult.rows[0].id
    console.log(`📋 Testing session: ${sessionResult.rows[0].join_code}\n`)

    // Get all conversations for this session
    const convResult = await db.query(`
      SELECT
        rtc.id,
        rtc.student_id,
        ss.student_name,
        rtc.topic,
        rtc.conversation_history,
        rtc.message_count
      FROM reverse_tutoring_conversations rtc
      JOIN session_students ss ON rtc.student_id = ss.id
      WHERE rtc.session_id = $1
        AND jsonb_array_length(rtc.conversation_history) > 2
      ORDER BY rtc.last_updated DESC
      LIMIT 5
    `, [sessionId])

    console.log(`Found ${convResult.rows.length} conversations with messages\n`)

    if (convResult.rows.length === 0) {
      console.log('❌ No conversations with messages found')
      process.exit(0)
    }

    // Analyze each conversation's latest student analysis
    const analysisData = []

    for (const conv of convResult.rows) {
      const history = conv.conversation_history

      // Find latest student message with analysis
      const studentMessages = history.filter(msg => msg.role === 'student' && msg.analysis)

      if (studentMessages.length === 0) {
        console.log(`⚠️  ${conv.student_name}: No analyzed messages yet`)
        continue
      }

      const latestAnalysis = studentMessages[studentMessages.length - 1]

      analysisData.push({
        studentName: conv.student_name,
        conversationId: conv.id,
        messageCount: conv.message_count,
        studentMessage: latestAnalysis.content?.substring(0, 50) + '...',
        analysis: latestAnalysis.analysis
      })
    }

    // Display analysis for each student
    console.log('='.repeat(60))
    for (const data of analysisData) {
      console.log(`\n👤 ${data.studentName} (Conv ID: ${data.conversationId})`)
      console.log(`   Message: "${data.studentMessage}"`)

      const analysis = data.analysis

      // Check for multi-dimensional rubric
      if (analysis.contentUnderstanding) {
        console.log(`   ✅ Multi-dimensional rubric:`)
        console.log(`      Content: Level ${analysis.contentUnderstanding.level}/4`)
        console.log(`      Communication: Level ${analysis.communicationEffectiveness.level}/4`)
        console.log(`      Vocabulary: Level ${analysis.vocabularyUsage.level}/4`)
        console.log(`      Engagement: Level ${analysis.engagementLevel.level}/4`)
        console.log(`      Evidence: ${analysis.contentUnderstanding.evidence?.substring(0, 60)}...`)
      }
      // Check for legacy format
      else if (analysis.legacyScore) {
        console.log(`   📊 Legacy score: ${analysis.legacyScore.understandingLevel}%`)
        console.log(`   Concepts: ${analysis.legacyScore.conceptsDemonstrated?.join(', ') || 'none'}`)
      }
      else {
        console.log(`   ❌ Unknown analysis format:`, JSON.stringify(analysis, null, 2))
      }
    }
    console.log('\n' + '='.repeat(60))

    // Check for identical analysis (THE BUG)
    console.log('\n🔍 Checking for identical analysis across students...\n')

    const uniqueAnalysis = new Set()
    const duplicates = []

    for (const data of analysisData) {
      const analysisJSON = JSON.stringify(data.analysis)

      if (uniqueAnalysis.has(analysisJSON)) {
        duplicates.push(data.studentName)
        console.log(`❌ ${data.studentName}: DUPLICATE ANALYSIS (same as another student)`)
      } else {
        uniqueAnalysis.add(analysisJSON)
        console.log(`✅ ${data.studentName}: Unique analysis`)
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    if (duplicates.length > 0) {
      console.log(`\n🚨 PROBLEM FOUND: ${duplicates.length} student(s) have identical analysis!`)
      console.log(`   This indicates the rubric is NOT being individualized.`)
      console.log(`   Affected students: ${duplicates.join(', ')}`)
    } else {
      console.log(`\n✅ All ${analysisData.length} students have unique analysis.`)
      console.log(`   The rubric appears to be working correctly.`)
    }

    process.exit(0)

  } catch (error) {
    console.error('❌ Test error:', error)
    process.exit(1)
  }
}

testRubricIndividuality()
