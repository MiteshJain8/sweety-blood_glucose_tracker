export function reportRanges(date) {
  const monthStart = `${date.slice(0, 7)}-01`;
  const previousEnd = new Date(`${monthStart}T00:00:00Z`);
  previousEnd.setUTCDate(0);
  const end = previousEnd.toISOString().slice(0, 10);
  return {
    daily: { start: date, end: date },
    monthToDate: { start: monthStart, end: date },
    monthly: { start: `${end.slice(0, 7)}-01`, end }
  };
}
