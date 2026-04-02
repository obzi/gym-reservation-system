export const OPENING_HOUR = 7
export const CLOSING_HOUR = 22
export const SLOT_MINUTES = 15
export const MIN_DURATION_MINUTES = 15
export const MAX_DURATION_MINUTES = 120
export const MAX_ADVANCE_DAYS = 3
export const MAX_OVERLAP = 3

export function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = OPENING_HOUR; h < CLOSING_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

export const TIME_SLOTS = generateTimeSlots()

export function getDurationOptions(): number[] {
  const options: number[] = []
  for (let d = MIN_DURATION_MINUTES; d <= MAX_DURATION_MINUTES; d += SLOT_MINUTES) {
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
