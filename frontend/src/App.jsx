import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { ToastProvider } from './components/Toast'
import Navigation from './components/Navigation'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentView from './pages/StudentView'
import ReverseTutoring from './pages/ReverseTutoring'
import ReverseTutoringDashboard from './pages/ReverseTutoringDashboard'
import SpeakingActivity from './pages/SpeakingActivity'
import SpeakingDashboard from './pages/SpeakingDashboard'

function App() {
  const { user } = useAuthStore()

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main id="main-content">
          <Routes>
            {/* Teacher auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student join - no login, only a join code */}
            <Route path="/join" element={<StudentView />} />
            <Route path="/join/:joinCode" element={<StudentView />} />

            {/* Teacher dashboard */}
            <Route
              path="/dashboard"
              element={user ? <TeacherDashboard /> : <Navigate to="/login" />}
            />

            {/* Speaking activity (pack-driven) */}
            <Route path="/speak/:sessionId" element={<SpeakingActivity />} />
            <Route
              path="/speaking/dashboard/:sessionId"
              element={user ? <SpeakingDashboard /> : <Navigate to="/login" />}
            />

            {/* Legacy reverse tutoring (reachable by URL only) */}
            <Route
              path="/reverse-tutoring/:sessionId"
              element={<ReverseTutoring />}
            />
            <Route
              path="/reverse-tutoring/dashboard/:sessionId"
              element={user ? <ReverseTutoringDashboard /> : <Navigate to="/login" />}
            />

            {/* Default */}
            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
