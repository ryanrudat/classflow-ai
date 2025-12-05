# Video-Centric Lesson Flow Feature Plan

> **Document Created:** November 29, 2024
> **Status:** Planning Complete, Ready for Development
> **Priority:** High - Core differentiating feature

---

## Vision

Transform static Canva videos into immersive, interactive learning experiences. Teachers (starting with Ryan) create educational videos in Canva, upload them to ClassFlow AI, and add interactive elements that make the videos dynamic and engaging.

**End Goal:** A marketplace of pre-built, interactive video lesson units that teachers can browse and use instantly.

---

## Architecture Decision

**Chosen: Option C - Video Lesson Mode in Lesson Flow**

Video lessons are a special mode within the existing Lesson Flow system, not a separate feature.

```
Lesson Flow
├── Standard Mode (existing)
│   └── Activity → Activity → Activity
│
└── Video Lesson Mode (new)
    └── Video is the backbone
        ├── Interactions woven INTO video
        ├── Activities triggered BY video timeline
        └── Everything synced to video playback
```

**Rationale:**
- Teachers already understand "Lesson Flow"
- Marketplace will sell "Lesson Flows" (some video-based, some not)
- One unified system to maintain
- Existing pacing controls still apply

---

## What Stays the Same

| Feature | Status |
|---------|--------|
| Activity types (quiz, reading, discussion, matching, etc.) | No changes |
| Activity editors (QuizEditor, MatchingEditor, etc.) | No changes |
| Basic Lesson Flow | No changes |
| Pacing controls (student/teacher paced) | No changes |
| Student view for activities | No changes |

---

## What Gets Built (New)

| Feature | Description |
|---------|-------------|
| **Video Interaction Editor** | Timeline UI to add interactions at any timestamp |
| **Enhanced Video Player** | Plays video with pause points, hotspots, branches |
| **Branching Video Support** | Multiple video segments with choice-based paths |
| **Video Lesson Builder** | Wizard for creating video-centric lesson flows |

---

## Interaction Types

### Phase 1: Core Interactions

#### 1. Pause Questions
Video pauses at a timestamp, student answers a question before continuing.

```
┌─────────────────────────────────────┐
│         [VIDEO PAUSED]              │
│                                     │
│  "What causes evaporation?"         │
│                                     │
│  ○ Cold temperatures                │
│  ○ Heat from the sun  ←             │
│  ○ Wind                             │
│                                     │
│         [Submit Answer]             │
└─────────────────────────────────────┘
```

#### 2. Branching Paths
Video pauses, student makes a choice, different video segment plays based on choice.

```
         ┌─────────────┐
         │ Main Video  │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │  DECISION   │
         └──────┬──────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌───────┐
│Path A │  │Path B │  │Path C │
└───────┘  └───────┘  └───────┘
```

**Implementation:** Multiple video segments (separate files), not timestamps in one file.
- Easier to edit individual paths in Canva
- Can reuse segments across lessons
- Swap out paths without re-exporting everything

### Phase 2: Additional Interactions

#### 3. Hotspots
Clickable regions that appear on the video at specific timestamps.

```
┌─────────────────────────────────────┐
│                                     │
│     🎬 VIDEO PLAYING                │
│                                     │
│         ┌─────────┐                 │
│         │ Click   │ ← Clickable     │
│         │  Here   │                 │
│         └─────────┘                 │
│                                     │
└─────────────────────────────────────┘
```

#### 4. Synchronized Side Panel
Content alongside video that updates as video plays.

```
┌──────────────────────┬─────────────────┐
│                      │                 │
│    🎬 VIDEO          │  📝 NOTES       │
│                      │                 │
│                      │  Key term:      │
│                      │  "Evaporation"  │
│                      │                 │
└──────────────────────┴─────────────────┘
```

### Phase 3: Future Enhancements

#### 5. AI Companion
AI that "watches with" the student and makes contextual comments.

```
┌─────────────────────────────────────┐
│  🎬 VIDEO                           │
├─────────────────────────────────────┤
│  🤖 "Did you notice how the arrows  │
│      show water going UP? That's    │
│      because warm air rises!"       │
│                                     │
│  [Ask a question about this]        │
└─────────────────────────────────────┘
```

---

## Data Structures

### Video Interaction Timeline

```javascript
{
  videoId: "uuid",
  interactions: [
    {
      id: "int_1",
      timestamp: 45,           // seconds
      type: "pause_question",
      data: {
        question: "What just happened to the water?",
        options: ["Evaporated", "Condensed", "Froze"],
        correctAnswer: 0
      }
    },
    {
      id: "int_2",
      timestamp: 120,
      type: "hotspot",
      data: {
        x: 65,                 // percentage from left
        y: 40,                 // percentage from top
        width: 15,             // percentage
        height: 20,            // percentage
        label: "Click the sun",
        content: "The sun provides energy for evaporation"
      }
    },
    {
      id: "int_3",
      timestamp: 180,
      type: "branch",
      data: {
        question: "Which path should we explore?",
        choices: [
          { label: "Mountain Route", nextSegmentId: "seg_mountain" },
          { label: "River Route", nextSegmentId: "seg_river" }
        ]
      }
    }
  ]
}
```

### Branching Video Structure

```javascript
{
  type: "branching_video",
  segments: [
    {
      id: "intro",
      videoUrl: "/videos/intro.mp4",
      duration: 150,
      interactions: [...]
    },
    {
      id: "seg_mountain",
      videoUrl: "/videos/mountain.mp4",
      duration: 120,
      interactions: [...]
    },
    {
      id: "seg_river",
      videoUrl: "/videos/river.mp4",
      duration: 180,
      interactions: [...]
    },
    {
      id: "outro",
      videoUrl: "/videos/outro.mp4",
      duration: 60,
      interactions: [...]
    }
  ],
  flow: [
    { segmentId: "intro" },
    {
      type: "branch",
      question: "Which route should the colonists take?",
      choices: [
        { label: "Mountain Pass", nextSegment: "seg_mountain" },
        { label: "River Route", nextSegment: "seg_river" }
      ]
    },
    { segmentId: "outro" }  // all paths converge here
  ]
}
```

---

## Build Phases

### Phase 1a: Pause Questions (1-2 days)
- [ ] Create `VideoInteractionEditor` component
- [ ] Timeline UI to add/edit/delete pause points
- [ ] Enhance `InteractiveVideoPlayer` to use new data structure
- [ ] Save interactions to database

### Phase 1b: Branching Support (3-4 days)
- [ ] Support multiple video segments in one "lesson"
- [ ] Branch point UI in editor
- [ ] Player logic to switch between segments
- [ ] "Then continue to..." flow configuration

### Phase 2: Hotspots (2-3 days)
- [ ] Hotspot placement UI (drag on video preview)
- [ ] Hotspot rendering in player
- [ ] Click handling and content display

### Phase 3: Lesson Flow Integration (2 days)
- [ ] "Video Lesson" mode in Lesson Flow Builder
- [ ] Auto-generate follow-up activities from video content
- [ ] Pacing controls for video lessons

### Phase 4+: Future
- [ ] Synchronized side panel
- [ ] AI companion comments
- [ ] Analytics on student paths/choices

---

## UI Mockups

### Video Interaction Editor

```
┌─────────────────────────────────────────────────────────────┐
│  📹 Edit Video Interactions                    [Preview] [Save] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │              [VIDEO PREVIEW]                        │    │
│  │                ▶ 2:30 / 8:00                        │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Timeline:                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ●────────●───────────●────────────────●─────────▶  │    │
│  │ 0:00    1:30       3:45              7:20    8:00  │    │
│  │ [Q]     [B]        [H]               [Q]           │    │
│  └─────────────────────────────────────────────────────┘    │
│  [Q] = Question  [B] = Branch  [H] = Hotspot                │
│                                                              │
│  Interactions:                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ❓ 0:00 - Pause Question           [Edit] [Delete] │    │
│  │ 🔀 1:30 - Branch Point             [Edit] [Delete] │    │
│  │ 🎯 3:45 - Hotspot                  [Edit] [Delete] │    │
│  │ ❓ 7:20 - Pause Question           [Edit] [Delete] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [+ Pause Question]  [+ Branch Point]  [+ Hotspot]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Branch Point Editor

```
┌─────────────────────────────────────────────────────────────┐
│  🔀 Edit Branch Point                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Timestamp: 1:30                                             │
│                                                              │
│  Question shown to student:                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Which route should the colonists take?              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Choices:                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Label: [Mountain Pass______________]                │    │
│  │ Video: [mountain_route.mp4      ▼]  [Upload New]    │    │
│  │ After: [Continue to outro       ▼]                  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Label: [River Route________________]                │    │
│  │ Video: [river_route.mp4         ▼]  [Upload New]    │    │
│  │ After: [Continue to outro       ▼]                  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ [+ Add Another Choice]                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│                              [Cancel]  [Save Branch Point]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Proposed)

```sql
-- Video interactions table
CREATE TABLE video_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES uploaded_videos(id) ON DELETE CASCADE,

  -- Timing
  timestamp_seconds INTEGER NOT NULL,

  -- Type: 'pause_question', 'branch', 'hotspot', 'ai_comment'
  interaction_type VARCHAR(50) NOT NULL,

  -- Type-specific data (JSON)
  data JSONB NOT NULL,

  -- Ordering (for interactions at same timestamp)
  sequence_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Video segments for branching
CREATE TABLE video_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_video_id UUID REFERENCES uploaded_videos(id) ON DELETE CASCADE,

  -- Segment info
  segment_key VARCHAR(100) NOT NULL,  -- e.g., 'intro', 'path_a', 'outro'
  video_url TEXT NOT NULL,
  duration_seconds INTEGER,

  -- This segment's interactions
  -- (stored in video_interactions with segment_id reference)

  created_at TIMESTAMP DEFAULT NOW()
);

-- Add segment reference to interactions
ALTER TABLE video_interactions
ADD COLUMN segment_id UUID REFERENCES video_segments(id) ON DELETE CASCADE;
```

---

## Questions to Resolve During Development

1. **Branching convergence:** Can paths re-merge, or always linear after branch?
2. **Student path tracking:** Do we save which path each student took?
3. **Hotspot shapes:** Just rectangles, or circles/polygons too?
4. **Mobile support:** How do hotspots work on touch devices?

---

## Success Criteria

- [ ] Can upload a video and add pause questions at any timestamp
- [ ] Can create a branching video with 2-3 paths
- [ ] Student sees smooth transitions between video segments
- [ ] Can integrate video lesson into existing Lesson Flow
- [ ] Editor is intuitive enough for teachers (not just developers)

---

## Related Existing Code

- `frontend/src/components/InteractiveVideoPlayer.jsx` - Base video player
- `frontend/src/components/InteractiveVideoEditor.jsx` - Current basic editor
- `frontend/src/components/LessonFlowBuilder.jsx` - Lesson flow creation
- `backend/src/routes/videos.js` - Video upload endpoints
- `database/migrations/022_add_uploaded_videos.sql` - Video schema
