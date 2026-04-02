export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  display_name: string
  role: UserRole
  active: boolean
}

export interface Reservation {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  created_at: string
  profile?: Profile
}

export interface InviteToken {
  id: string
  token: string
  expires_at: string
  created_by: string
  created_at: string
}

export interface TimeSlot {
  time: string // HH:MM
  reservations: Reservation[]
}
