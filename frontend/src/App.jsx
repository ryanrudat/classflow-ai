import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Pages (to be created in Week 1)
import Login from './pages/Login'
import Register from './pages/Register'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentView from './pages/StudentView'

function App() {
  const { user } = useAuthStore()

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join/:joinCode" element={<StudentView />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={user ? <TeacherDashboard /> : <Navigate to="/login" />}
          />

          {/* Default route */}
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
