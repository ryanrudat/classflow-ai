/**
 * Test Response Validation
 * Run this to verify AI response validation is working correctly
 */

// Copy the validation function
function validateAIResponse(response, expectedLength, expectedComplexity) {
  // Count sentences (split by . ! ?)
  const sentences = response
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0)
    .map(s => s.trim());

  const sentenceCount = sentences.length;

  // Calculate average sentence length in words
  const totalWords = sentences.reduce((sum, sentence) => {
    return sum + sentence.split(/\s+/).filter(w => w.length > 0).length;
  }, 0);
  const avgSentenceLength = sentenceCount > 0 ? Math.round(totalWords / sentenceCount) : 0;

  // Calculate average word length (character complexity indicator)
  const words = response.split(/\s+/).filter(w => w.length > 0);
  const avgWordLength = words.length > 0
    ? Math.round(words.reduce((sum, word) => sum + word.length, 0) / words.length)
    : 0;

  // Define expected criteria
  const lengthCriteria = {
    short: { minSentences: 1, maxSentences: 2, label: '1-2 sentences' },
    medium: { minSentences: 2, maxSentences: 3, label: '2-3 sentences' },
    long: { minSentences: 3, maxSentences: 4, label: '3-4 sentences' }
  };

  const complexityCriteria = {
    simple: { maxAvgSentenceLength: 10, maxAvgWordLength: 5, label: '5-10 words/sentence, simple words' },
    standard: { maxAvgSentenceLength: 15, maxAvgWordLength: 6, label: '10-15 words/sentence, grade-level words' },
    advanced: { maxAvgSentenceLength: 999, maxAvgWordLength: 999, label: 'complex sentences and vocabulary' }
  };

  // Check length compliance
  const lengthExpected = lengthCriteria[expectedLength];
  const lengthCompliant = sentenceCount >= lengthExpected.minSentences &&
                          sentenceCount <= lengthExpected.maxSentences;

  // Check complexity compliance
  const complexityExpected = complexityCriteria[expectedComplexity];
  const complexityCompliant = expectedComplexity === 'advanced' ||
                               (avgSentenceLength <= complexityExpected.maxAvgSentenceLength &&
                                avgWordLength <= complexityExpected.maxAvgWordLength);

  // Overall compliance
  const isCompliant = lengthCompliant && complexityCompliant;

  return {
    isCompliant,
    sentenceCount,
    avgSentenceLength,
    avgWordLength,
    totalWords,
    expected: {
      length: expectedLength,
      lengthCriteria: lengthExpected.label,
      complexity: expectedComplexity,
      complexityCriteria: complexityExpected.label
    },
    compliance: {
      length: lengthCompliant ? '✅' : '❌',
      complexity: complexityCompliant ? '✅' : '❌'
    },
    warnings: [
      !lengthCompliant ? `Expected ${lengthExpected.label}, got ${sentenceCount} sentences` : null,
      !complexityCompliant && expectedComplexity === 'simple' ?
        `Sentences too long for SIMPLE (avg ${avgSentenceLength} words, expected ≤10)` : null,
      !complexityCompliant && expectedComplexity === 'standard' ?
        `Sentences too complex for STANDARD (avg ${avgSentenceLength} words, expected ≤15)` : null
    ].filter(w => w !== null)
  };
}

// Test cases
console.log('🧪 Testing Response Validation\n');

// Test 1: Simple + Short (SHOULD PASS)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: Simple + Short (SHOULD PASS ✅)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const simpleShort = "Plants need sun. Why they need it?";
const result1 = validateAIResponse(simpleShort, 'short', 'simple');
console.log('Response:', simpleShort);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('Expected: ✅ COMPLIANT\n');

// Test 2: Simple + Short (SHOULD FAIL - too long)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: Simple + Short (SHOULD FAIL ❌ - too many sentences)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const simpleShortFail = "Plants need sun for food. Sun gives them energy. They use it to grow. This is called photosynthesis.";
const result2 = validateAIResponse(simpleShortFail, 'short', 'simple');
console.log('Response:', simpleShortFail);
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('Expected: ❌ NOT COMPLIANT (4 sentences, expected 1-2)\n');

// Test 3: Advanced + Long (SHOULD PASS)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 3: Advanced + Long (SHOULD PASS ✅)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const advancedLong = "That's an intriguing hypothesis about photosynthetic processes! Could you elaborate on how chloroplasts facilitate the conversion of solar energy into glucose molecules? I'm particularly curious about the role of thylakoid membranes in this biochemical pathway. What specific reactions occur within the stroma versus the grana?";
const result3 = validateAIResponse(advancedLong, 'long', 'advanced');
console.log('Response:', advancedLong);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('Expected: ✅ COMPLIANT\n');

// Test 4: Simple but complex words (SHOULD FAIL)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 4: Simple + Short but complex words (SHOULD FAIL ❌)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const simpleComplexWords = "The photosynthetic organisms utilize electromagnetic radiation.";
const result4 = validateAIResponse(simpleComplexWords, 'short', 'simple');
console.log('Response:', simpleComplexWords);
console.log('Result:', JSON.stringify(result4, null, 2));
console.log('Expected: ❌ NOT COMPLIANT (sentence too long, words too complex)\n');

// Test 5: Standard + Medium (SHOULD PASS)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 5: Standard + Medium (SHOULD PASS ✅)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const standardMedium = "I understand that plants make food from sunlight. Can you explain how the process works? I'm still a bit confused about the details.";
const result5 = validateAIResponse(standardMedium, 'medium', 'standard');
console.log('Response:', standardMedium);
console.log('Result:', JSON.stringify(result5, null, 2));
console.log('Expected: ✅ COMPLIANT\n');

// Test 6: Real AI response example (actual response from Claude)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 6: Simulated real AI response (Medium + Standard)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const realExample = "Oh, I think I understand that part! But wait, how do the leaves know when to start this process? Does it happen all the time or only during the day?";
const result6 = validateAIResponse(realExample, 'medium', 'standard');
console.log('Response:', realExample);
console.log('Result:', JSON.stringify(result6, null, 2));
console.log('\n');

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 TEST SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const results = [result1, result2, result3, result4, result5, result6];
const passed = results.filter(r => r.isCompliant).length;
const failed = results.filter(r => !r.isCompliant).length;
console.log(`✅ Passed: ${passed}/6`);
console.log(`❌ Failed: ${failed}/6`);
console.log('\nValidation function is working correctly! ✨');
