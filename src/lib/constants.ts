export function generateTimeSlots(openingHour: number, openingMinute: number, closingHour: number, closingMinute: number, slotMinutes: number): string[] {
  const slots: string[] = []
  const startTotal = openingHour * 60 + openingMinute
  const endTotal = closingHour * 60 + closingMinute
  for (let t = startTotal; t < endTotal; t += slotMinutes) {
    const h = Math.floor(t / 60)
    const m = t % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}

export function getDurationOptions(minDuration: number, maxDuration: number, slotMinutes: number): number[] {
  const options: number[] = []
  for (let d = minDuration; d <= maxDuration; d += slotMinutes) {
    options.push(d)
  }
  return options
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = h * 60 + m + minutes
  const newH = Math.floor(totalMinutes / 60)
  const newM = totalMinutes % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
