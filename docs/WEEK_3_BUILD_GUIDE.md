# Week 3 Build Guide - Adaptive AI & Web Integration

**Goal:** AI adapts to student performance + web content integration

---

## Day 15-16: Adaptive Content Generation

### Adaptive AI Service (Backend)

**Update:** `backend/src/services/aiService.js`

**Tell Windsurf:**
```
Add functions:

generateEasierVersion(originalActivity, studentErrors):
- Takes original content and what student got wrong
- Generates simpler version with:
  - Shorter sentences
  - Simpler vocabulary
  - More scaffolding/hints
- Returns adapted activity

generateHarderVersion(originalActivity):
- Creates advanced version with:
  - More complex concepts
  - Extension questions
  - Critical thinking prompts
```

### Automatic Adaptation Trigger (Backend)

**Update:** `backend/src/controllers/activityController.js`

**Tell Windsurf:**
```
After student submits response:
- Check their performance on current activity
- If 0/3 or 1/3 correct: trigger generateEasierVersion
- If 3/3 correct quickly: suggest generateHarderVersion
- Save suggestion to database
- Emit socket event to teacher: "Student X is struggling, generate easier content?"
```

### Adaptation UI (Frontend)

**Create:** `frontend/src/components/AdaptiveSuggestions.jsx`

**Tell Windsurf:**
```
Component shows notifications like:
"Kevin L. is struggling with this activity. Generate easier version?"
[Yes] [No]

If Yes: Call AI to generate, automatically push to that student
If No: Dismiss suggestion

Shows queue of suggestions
Teacher can batch-process multiple suggestions
```

---

## Day 17-18: Subject-Specific Templates

### Template System (Backend)

**Create:** `backend/src/services/templateService.js`

**Tell Windsurf:**
```
Create prompt templates for each subject:

English templates:
- Reading Comprehension
- Literary Analysis (theme, character, symbolism)
- Writing Prompts (narrative, argumentative, expository)
- Grammar Practice
- Vocabulary in Context

History templates:
- Primary Source Analysis
- Cause & Effect Chains
- Timeline Activities
- Compare & Contrast (events, figures, movements)
- Historical Perspective Questions

Social Studies templates:
- Current Events Analysis
- Geographic Concepts
- Economic Principles
- Civic Engagement Questions

Government templates:
- Constitutional Analysis
- Branches of Government
- Rights & Responsibilities
- Policy Debates

Biology templates:
- Scientific Method Application
- Diagram Labeling
- Process Explanations (photosynthesis, cell division)
- Lab Report Questions
- Ecosystem Analysis

Each template should build proper Claude prompts with subject-specific formatting
```

### Template UI (Frontend)

**Update:** `frontend/src/pages/TeacherDashboard.jsx`

**Tell Windsurf:**
```
Replace free-form prompt with:
1. Dropdown to select subject
2. Dropdown to select template type (based on subject)
3. Input field for specific topic
4. Additional options (difficulty, length)

Example:
Subject: History
Template: Primary Source Analysis
Topic: Declaration of Independence
Difficulty: Medium

This generates: "Create a primary source analysis activity for the Declaration of Independence at medium difficulty..."
```

---

## Day 19-20: Web Content Integration

### Web Scraper Service (Backend)

**Create:** `backend/src/services/webScraperService.js`

**Tell Windsurf:**
```
Create web content integration:

scrapeArticle(url):
- Fetch webpage content
- Extract main text (remove ads, navigation, etc.)
- Use readability algorithm or simple HTML parsing
- Return cleaned text + metadata (title, author, date)

generateFromWebContent(url, activityType):
- Call scrapeArticle(url)
- Pass cleaned text to Claude
- Generate questions/analysis based on article
- Return activity with embedded article content
```

### Web Import UI (Frontend)

**Update:** `frontend/src/components/AIGenerator.jsx`

**Tell Windsurf:**
```
Add tab: "Generate from Web Article"

UI:
- URL input field
- "Import" button
- Shows preview of article title + excerpt
- Buttons:
  - Generate Questions
  - Generate Summary
  - Generate Discussion Prompts
- Same difficulty/targeting options as regular generation
```

### Student Web Content Display (Frontend)

**Update:** `frontend/src/pages/StudentView.jsx`

**Tell Windsurf:**
```
When activity includes web content:
- Show article in top half (scrollable iframe or rendered HTML)
- Show questions in bottom half
- Students read article, then answer questions
- Can't navigate away (embedded content only)
```

---

## Day 21: Testing & Refinement

### Test Scenarios

**Adaptive AI:**
1. Create activity, have student get all wrong → see easier version suggestion
2. Accept suggestion → verify easier content generated
3. Student gets all right → see harder version suggestion

**Subject Templates:**
1. Try each subject's templates
2. Verify prompts generate appropriate content
3. Refine templates based on output quality

**Web Integration:**
1. Import news article from multiple sources (NYTimes, Smithsonian, etc.)
2. Generate questions from article
3. Push to students
4. Verify article displays correctly + questions are relevant

### Refinements

- Improve template prompts based on testing
- Add more subject templates if needed
- Optimize web scraping for common news sites
- Polish adaptive suggestions UI

---

## ✅ Week 3 Complete When:

- ✅ AI detects struggling students automatically
- ✅ AI generates easier/harder versions on demand
- ✅ Subject-specific templates work for all 5 subjects
- ✅ Teacher can import web articles
- ✅ AI generates questions from web content
- ✅ Students can read + answer questions from web articles

---

## Next: Week 4 - Quizzes, Analytics & Launch Prep
