import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { CalendarPage } from './pages/CalendarPage'
import { AdminPage } from './pages/AdminPage'

export default function App() {
  const { user, profile, loading, signIn, signUp, signOut, resetPassword, updateDisplayName, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="text-theme-secondary">Načítám...</div>
      </div>
    )
  }

  return (
    <BrowserRouter basename="/gym-reservation-system">
      <Routes>
        <Route
          path="/"
          element={
            user && profile ? (
              <CalendarPage profile={profile} userId={user.id} onSignOut={signOut} onUpdateName={updateDisplayName} />
            ) : (
              <LoginPage onSignIn={signIn} onResetPassword={resetPassword} />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/" /> : <RegisterPage onSignUp={signUp} />
          }
        />
        <Route
          path="/admin"
          element={
            user && isAdmin ? <AdminPage /> : <Navigate to="/" />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
