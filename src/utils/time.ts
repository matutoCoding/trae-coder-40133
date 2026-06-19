export const DAY_START = '06:00';
export const DAY_END = '22:00';
export const SLOT_MINUTES = 30;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateDisplay(dateStr: string): string {
  const d = parseDate(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  let cur = timeToMinutes(DAY_START);
  const end = timeToMinutes(DAY_END);
  while (cur < end) {
    slots.push(minutesToTime(cur));
    cur += SLOT_MINUTES;
  }
  return slots;
}

export function minutesBetween(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}
