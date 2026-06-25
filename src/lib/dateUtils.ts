export function getMexicoCityDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // en-CA gives YYYY-MM-DD format natively
  return formatter.format(new Date());
}
