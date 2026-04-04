import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { CalendarPage } from './pages/CalendarPage'
import { AdminPage } from './pages/AdminPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'

export default function App() {
  const { user, profile, loading, signIn, signUp, signOut, resetPassword, updatePassword, updateDisplayName, isAdmin, isRecovery } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="text-theme-secondary">Načítám...</div>
      </div>
    )
  }

  if (isRecovery && user) {
    return (
      <BrowserRouter basename="/gym-reservation-system">
        <ResetPasswordPage onUpdatePassword={updatePassword} />
      </BrowserRouter>
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
