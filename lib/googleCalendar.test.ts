import { parseGoogleCalendarId, googleCalendarEmbedUrl } from './googleCalendar';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('PASS:', msg);
}

// --- The three things Google actually shows an artist in its settings ---

assert(
  parseGoogleCalendarId('mara@gmail.com') === 'mara@gmail.com',
  'accepts a bare calendar ID'
);

assert(
  parseGoogleCalendarId(
    'https://calendar.google.com/calendar/embed?src=mara%40gmail.com&ctz=America%2FDenver'
  ) === 'mara@gmail.com',
  'extracts the ID from a public/embed URL'
);

assert(
  parseGoogleCalendarId(
    '<iframe src="https://calendar.google.com/calendar/embed?src=abc123%40group.calendar.google.com&ctz=America%2FDenver" style="border:0" width="800" height="600"></iframe>'
  ) === 'abc123@group.calendar.google.com',
  'extracts the ID from a full iframe embed snippet'
);

// Google's "share" links carry the ID base64'd in a cid param.
const cid = Buffer.from('mara@gmail.com', 'utf8').toString('base64');
assert(
  parseGoogleCalendarId(`https://calendar.google.com/calendar/u/0?cid=${cid}`) === 'mara@gmail.com',
  'extracts the ID from a cid= share link'
);

assert(
  parseGoogleCalendarId('  mara@gmail.com  ') === 'mara@gmail.com',
  'trims surrounding whitespace'
);

assert(
  parseGoogleCalendarId('en.usa#holiday@group.v.calendar.google.com') ===
    'en.usa#holiday@group.v.calendar.google.com',
  "accepts Google's '#' style shared-calendar IDs"
);

// --- Rejections. These matter: the result is interpolated into an iframe
// --- URL, so anything not recognized must come back null rather than
// --- being passed through.

assert(parseGoogleCalendarId('') === null, 'rejects empty input');
assert(parseGoogleCalendarId('   ') === null, 'rejects whitespace-only input');
assert(parseGoogleCalendarId('not a calendar') === null, 'rejects free text');
assert(parseGoogleCalendarId('https://example.com/evil') === null, 'rejects an unrelated URL');
assert(
  parseGoogleCalendarId('javascript:alert(1)') === null,
  'rejects a javascript: URL'
);
assert(
  parseGoogleCalendarId('"><script>alert(1)</script>') === null,
  'rejects an HTML/script injection attempt'
);
assert(
  parseGoogleCalendarId('?src=javascript:alert(1)') === null,
  'rejects a javascript: payload smuggled through src='
);
assert(
  parseGoogleCalendarId('?src=' + encodeURIComponent('a@b.com" onload="alert(1)')) === null,
  'rejects an attribute-breakout attempt inside src='
);
assert(parseGoogleCalendarId('mara@localhost') === null, 'rejects an ID with no TLD');

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
