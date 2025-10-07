# Week 2 Build Guide - Real-Time Features & Screen Control

**Goal:** Add real-time student tracking, screen control, and content pushing

---

## Overview

Week 2 adds:
- Real-time WebSocket communication
- Live student list showing who's online
- Color-coded performance tracking (🟢🟡🔴)
- Screen control (lock, view, focus mode)
- Push activities to students in real-time

---

## Day 8-9: Real-Time Student Tracking

### Update WebSocket Service (Backend)

**File:** `backend/src/services/socketService.js`

**Tell Windsurf:**
```
Expand WebSocket service to handle:

Events to listen for:
- 'join-session': student joins session, emit to teacher
- 'student-response': student submits answer, save to database, emit to teacher
- 'student-active': heartbeat to track who's online

Events to emit:
- 'student-joined': notify teacher when student joins
- 'student-left': notify when student disconnects
- 'activity-pushed': send new activity to students
- 'student-list-updated': send updated student list to teacher

Maintain rooms per session
Track online students per session
```

### Build Student Tracker Component (Frontend)

**Create:** `frontend/src/components/StudentList.jsx`

**Tell Windsurf:**
```
Create StudentList component that:
- Connects to WebSocket
- Shows live list of students in session
- Color codes students based on performance:
  - Green: 80%+ correct
  - Yellow: 50-79% correct
  - Red: <50% correct
- Click student to see their responses
- Shows device type icon
- Shows online/offline status
```

---

## Day 10-11: Screen Control Features

### Screen Control API (Backend)

**Update:** `backend/src/controllers/sessionController.js`

**Tell Windsurf:**
```
Add screen control functions:

lockScreens(sessionId, studentIds):
- Updates session_students table, set current_screen_state = 'locked'
- If studentIds is empty, lock all students
- Emit socket event 'screen-locked' to affected students

unlockScreens(sessionId, studentIds):
- Set current_screen_state = 'free'
- Emit 'screen-unlocked'

viewStudentScreen(sessionId, studentId):
- Set current_screen_state = 'viewing'
- Emit 'teacher-viewing' to student (if notifications enabled)

setFocusMode(sessionId, enabled):
- Updates session.focus_mode_enabled
- Emit to all students
```

### Screen Control UI (Frontend)

**Create:** `frontend/src/components/ScreenControls.jsx`

**Tell Windsurf:**
```
Create ScreenControls component with buttons:
- Lock All Screens
- Unlock All Screens
- Focus Mode toggle
- View Student Screen (when clicking student)

Each button calls appropriate API and emits socket event
Show current state of each control
```

### Student Screen States (Frontend)

**Update:** `frontend/src/pages/StudentView.jsx`

**Tell Windsurf:**
```
Listen for socket events:
- 'screen-locked': show full-screen "Teacher is presenting" overlay
- 'screen-unlocked': remove overlay, show normal view
- 'teacher-viewing': show notification banner "Teacher is viewing your screen"
- 'focus-mode': disable navigation, only show current activity

Add visual indicators for current screen state
```

---

## Day 12-13: Push Activities to Students

### Activity Push Controller (Backend)

**Create function in** `backend/src/controllers/activityController.js`

**Tell Windsurf:**
```
pushActivity function:
- Accepts activityId, target ('all', 'struggling', 'advanced', 'specific'), studentIds
- If target='all': get all students in session
- If target='struggling': get students with <50% correct rate
- If target='advanced': get students with >80% correct rate
- If target='specific': use provided studentIds
- Update activities table with pushed_to and specific_student_ids
- Emit socket event 'activity-pushed' to target students with activity content
```

### Update Teacher Dashboard (Frontend)

**Update:** `frontend/src/pages/TeacherDashboard.jsx`

**Tell Windsurf:**
```
After generating content, add "Push" button with options:
- Push to All Students
- Push to Struggling Students (red/yellow)
- Push to Advanced Students (green)
- Push to Selected Students (checkbox selection)

On push, call activitiesAPI.push() and update UI
Show confirmation when pushed successfully
```

### Student Activity Display (Frontend)

**Update:** `frontend/src/pages/StudentView.jsx`

**Tell Windsurf:**
```
Listen for 'activity-pushed' socket event
Display activity based on type:
- If type='reading': show text with scroll
- If type='questions': show questions with input fields
- If type='quiz': show multiple choice questions

Student can submit responses
On submit, emit 'student-response' socket event and call API
```

---

## Day 14: Testing & Polish

### Test Full Flow

1. Teacher creates session
2. 3-5 students join (open multiple browser tabs)
3. Teacher generates reading passage
4. Teacher pushes to all students
5. All students see content instantly
6. Students submit responses
7. Teacher sees color-coded results in real-time
8. Teacher locks all screens → students see lock screen
9. Teacher unlocks → students can work again
10. Teacher views one student's screen → that student sees notification

### Add Error Handling

- What if WebSocket disconnects?
- What if AI generation fails?
- What if student submits invalid response?

**Tell Windsurf for each component:**
```
Add error handling for:
- Network errors (show retry button)
- WebSocket disconnection (show "Reconnecting..." message)
- API failures (show error toast)

Add loading states for all async operations
```

---

## ✅ Week 2 Complete When:

- ✅ Teacher sees live student list
- ✅ Students are color-coded by performance
- ✅ Teacher can lock/unlock screens
- ✅ Teacher can view student screens
- ✅ Teacher can push activities
- ✅ Students receive and display activities in real-time
- ✅ Student responses update teacher dashboard live

---

## Next: Week 3 - Adaptive AI & Subject Templates
