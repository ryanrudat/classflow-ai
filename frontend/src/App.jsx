import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentView from './pages/StudentView'
import SlideEditor from './pages/SlideEditor'
import Presentation from './pages/Presentation'
import StudentMonitoringDashboard from './pages/StudentMonitoringDashboard'

function App() {
  const { user } = useAuthStore()

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join" element={<StudentView />} />
          <Route path="/join/:joinCode" element={<StudentView />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={user ? <TeacherDashboard /> : <Navigate to="/login" />}
          />

          {/* Slides routes */}
          <Route
            path="/slides/edit/:deckId"
            element={user ? <SlideEditor /> : <Navigate to="/login" />}
          />
          <Route
            path="/present/:deckId"
            element={user ? <Presentation /> : <Navigate to="/login" />}
          />
          <Route
            path="/slides/monitor/:deckId"
            element={user ? <StudentMonitoringDashboard /> : <Navigate to="/login" />}
          />

          {/* Default route */}
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
