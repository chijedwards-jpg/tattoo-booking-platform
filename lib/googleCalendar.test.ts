import { googleCalendarEmbedUrl } from './googleCalendar';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('PASS:', msg);
}

// --- Embed URL construction ---

const url = googleCalendarEmbedUrl('mara@gmail.com', 'America/Denver');
assert(
  url.startsWith('https://calendar.google.com/calendar/embed?'),
  'embed URL points at calendar.google.com'
);
assert(url.includes('src=mara%40gmail.com'), 'embed URL encodes the calendar ID');
assert(url.includes('ctz=America%2FDenver'), 'embed URL encodes the time zone');
assert(
  googleCalendarEmbedUrl('mara@gmail.com').includes('ctz=') === false,
  'omits ctz when no time zone is given'
);

console.log('\nAll Google Calendar tests passed.');
