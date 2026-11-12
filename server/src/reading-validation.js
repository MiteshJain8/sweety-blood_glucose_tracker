export const slots = { morning: 'Morning (fasting)', after_breakfast: 'After breakfast', after_lunch: 'After lunch', after_dinner: 'After dinner' };
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function dateError(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number(date.slice(0, 4))) return 'Enter a valid date.';
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return 'Enter a valid date.';
  if (date > today()) return 'Date cannot be in the future.';
}
export function readingError(body) {
  if (body.value === undefined || body.value === null || body.value === '') return 'Please enter a glucose value.';
  if (!Number.isInteger(body.value) || body.value < 40 || body.value > 600) return 'Value must be between 40 and 600 mg/dl.';
  if (!Object.hasOwn(slots, body.slot)) return 'Choose a valid time slot.';
  return dateError(body.date);
}
