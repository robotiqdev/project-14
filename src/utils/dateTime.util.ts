export function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function calculateOverdueDays(dueDate: Date, asOf: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((asOf.getTime() - dueDate.getTime()) / msPerDay);
}
