import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useSettings } from './hooks/useSettings'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { CalendarPage } from './pages/CalendarPage'
import { AdminPage } from './pages/AdminPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'

export default function App() {
  const { user, profile, loading, signIn, signUp, signOut, resetPassword, updatePassword, updateDisplayName, isAdmin, isRecovery } = useAuth()
  const { settings, loading: settingsLoading, updateSettings } = useSettings()

  if (loading || settingsLoading) {
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
              <CalendarPage profile={profile} userId={user.id} onSignOut={signOut} onUpdateName={updateDisplayName} settings={settings} />
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
            user && isAdmin ? <AdminPage settings={settings} onUpdateSettings={updateSettings} /> : <Navigate to="/" />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
