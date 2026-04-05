export function generateTimeSlots(openingHour: number, closingHour: number, slotMinutes: number): string[] {
  const slots: string[] = []
  for (let h = openingHour; h < closingHour; h++) {
    for (let m = 0; m < 60; m += slotMinutes) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
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
