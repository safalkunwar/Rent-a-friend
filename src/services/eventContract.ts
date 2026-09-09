import { MAX_EVENT_PARTICIPANTS } from './eventParticipationCore';

export function eventFields(fields: Record<string, unknown>) {
  const text = (key: string, maximum: number) => {
    const value = typeof fields[key] === 'string' ? (fields[key] as string).trim() : '';
    if (!value || value.length > maximum) throw new Error(`Enter a valid ${key} (up to ${maximum} characters).`);
    return value;
  };
  const title = text('title', 120), description = text('description', 3000), location = text('location', 250);
  const date = text('date', 10), time = text('time', 5), category = text('category', 60);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Enter a valid event date and time.');
  // Product is Nepal-local; never depend on the creator device timezone.
  const start = Date.parse(`${date}T${time}:00+05:45`);
  if (!Number.isFinite(start) || start <= Date.now()) throw new Error('Choose a future event date/time (Nepal time).');
  const spots = typeof fields.spots === 'string' && /^\d+$/.test(fields.spots) ? Number(fields.spots) : fields.spots;
  if (typeof spots !== 'number' || !Number.isInteger(spots) || spots < 1 || spots > MAX_EVENT_PARTICIPANTS) throw new Error(`Maximum participants must be a whole number from 1 to ${MAX_EVENT_PARTICIPANTS}.`);
  return { title, description, location, date, time, category, spots, startAtMillis: start };
}
