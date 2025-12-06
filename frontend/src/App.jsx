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
import LibraryBrowser from './pages/LibraryBrowser'

function App() {
  const { user } = useAuthStore()

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main id="main-content">
          <Routes>
            {/* Teacher routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student join routes - No login required, only join code */}
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
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
