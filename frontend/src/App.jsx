import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useStudentAuthStore } from './stores/studentAuthStore'
import { ToastProvider } from './components/Toast'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentView from './pages/StudentView'
import SlideEditor from './pages/SlideEditor'
import SlideEditorCanvas from './pages/SlideEditorCanvas'
import Presentation from './pages/Presentation'
import ProjectorView from './pages/ProjectorView'
import StudentMonitoringDashboard from './pages/StudentMonitoringDashboard'
import StudentAuth from './pages/StudentAuth'
import StudentDashboard from './pages/StudentDashboard'
import ReverseTutoring from './pages/ReverseTutoring'
import ReverseTutoringDashboard from './pages/ReverseTutoringDashboard'
import LibraryBrowser from './pages/LibraryBrowser'

function App() {
  const { user } = useAuthStore()
  const { student } = useStudentAuthStore()

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Teacher routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student routes */}
            <Route path="/student/auth" element={<StudentAuth />} />
            <Route
              path="/student/dashboard"
              element={student ? <StudentDashboard /> : <Navigate to="/student/auth" />}
            />

            {/* Public student join routes */}
            <Route path="/join" element={<StudentView />} />
            <Route path="/join/:joinCode" element={<StudentView />} />

            {/* Protected teacher routes */}
            <Route
              path="/dashboard"
              element={user ? <TeacherDashboard /> : <Navigate to="/login" />}
            />
            <Route
              path="/library"
              element={user ? <LibraryBrowser /> : <Navigate to="/login" />}
            />

            {/* Slides routes */}
            <Route
              path="/slides/edit/:deckId"
              element={user ? <SlideEditor /> : <Navigate to="/login" />}
            />
            <Route
              path="/slides/canvas/:deckId"
              element={user ? <SlideEditorCanvas /> : <Navigate to="/login" />}
            />
            <Route
              path="/present/:deckId"
              element={user ? <Presentation /> : <Navigate to="/login" />}
            />
            <Route
              path="/projector/:deckId"
              element={<ProjectorView />}
            />
            <Route
              path="/slides/monitor/:deckId"
              element={user ? <StudentMonitoringDashboard /> : <Navigate to="/login" />}
            />

            {/* Reverse Tutoring routes */}
            <Route
              path="/reverse-tutoring/:sessionId"
              element={<ReverseTutoring />}
            />
            <Route
              path="/reverse-tutoring/dashboard/:sessionId"
              element={user ? <ReverseTutoringDashboard /> : <Navigate to="/login" />}
            />

            {/* Default route */}
            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
