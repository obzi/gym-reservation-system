import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Reservation } from '../types'

export function useReservations(startDate: string, endDate: string) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*, profile:profiles(display_name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('start_time')

    if (data) {
      const mapped = data.map((r) => ({
        ...r,
        profile: r.profile ? { display_name: (r.profile as { display_name: string }).display_name } : undefined,
      }))
      setReservations(mapped as unknown as Reservation[])
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    fetchReservations()

    const channel = supabase
      .channel('reservations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchReservations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchReservations])

  const createReservation = async (date: string, startTime: string, endTime: string) => {
    const { data, error } = await supabase.rpc('create_reservation', {
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
    })
    if (error) return { error }
    if (data && typeof data === 'object' && 'error' in data) {
      return { error: { message: (data as { error: string }).error } }
    }
    await fetchReservations()
    return { error: null }
  }

  const cancelReservation = async (id: string) => {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)
    if (!error) await fetchReservations()
    return { error }
  }

  const adminCancelReservation = async (id: string) => {
    const { error } = await supabase.rpc('admin_cancel_reservation', {
      p_reservation_id: id,
    })
    if (!error) await fetchReservations()
    return { error }
  }

  return { reservations, loading, createReservation, cancelReservation, adminCancelReservation, refetch: fetchReservations }
}
