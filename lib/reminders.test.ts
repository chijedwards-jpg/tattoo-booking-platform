import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDaysUntil, reminderDecision, newClientToken } from "./reminders";

const TZ = "America/Denver";
const longAgo = new Date("2026-10-01T00:00:00Z");

test("calendarDaysUntil counts days in the artist's time zone", () => {
  // 9am Denver on Nov 10 (16:00Z) vs. an appointment at 10am Denver Nov 11.
  const now = new Date("2026-11-10T16:00:00Z");
  assert.equal(calendarDaysUntil(new Date("2026-11-11T17:00:00Z"), now, TZ), 1);
  // 11pm Denver Nov 10 is already Nov 11 in UTC, but still the same day locally.
  assert.equal(calendarDaysUntil(new Date("2026-11-11T05:00:00Z"), now, TZ), 0);
});

test("sends the 2-day reminder two days out, then the 1-day reminder", () => {
  const start = new Date("2026-11-12T17:00:00Z");
  const base = { startTime: start, createdAt: longAgo, timeZone: TZ, reminderDaysBefore: [2, 1] };

  const twoOut = reminderDecision({ ...base, now: new Date("2026-11-10T16:00:00Z"), remindersSentDays: [] });
  assert.deepEqual(twoOut, { send: true, markSent: [2] });

  const sameDayAgain = reminderDecision({ ...base, now: new Date("2026-11-10T20:00:00Z"), remindersSentDays: [2] });
  assert.deepEqual(sameDayAgain, { send: false, markSent: [] });

  const oneOut = reminderDecision({ ...base, now: new Date("2026-11-11T16:00:00Z"), remindersSentDays: [2] });
  assert.deepEqual(oneOut, { send: true, markSent: [1] });
});

test("too early for any reminder", () => {
  const d = reminderDecision({
    startTime: new Date("2026-11-20T17:00:00Z"),
    createdAt: longAgo,
    now: new Date("2026-11-10T16:00:00Z"),
    timeZone: TZ,
    reminderDaysBefore: [2, 1],
    remindersSentDays: [],
  });
  assert.deepEqual(d, { send: false, markSent: [] });
});

test("several due at once send one email and mark them all", () => {
  const d = reminderDecision({
    startTime: new Date("2026-11-11T17:00:00Z"),
    createdAt: longAgo,
    now: new Date("2026-11-10T16:00:00Z"),
    timeZone: TZ,
    reminderDaysBefore: [7, 3, 2, 1],
    remindersSentDays: [],
  });
  assert.deepEqual(d, { send: true, markSent: [7, 3, 2, 1] });
});

test("just booked: marks reminders sent without emailing", () => {
  const now = new Date("2026-11-10T16:00:00Z");
  const d = reminderDecision({
    startTime: new Date("2026-11-11T17:00:00Z"),
    createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    now,
    timeZone: TZ,
    reminderDaysBefore: [2, 1],
    remindersSentDays: [],
  });
  assert.deepEqual(d, { send: false, markSent: [2, 1] });
});

test("no reminders for past appointments or when turned off", () => {
  const now = new Date("2026-11-10T16:00:00Z");
  const past = reminderDecision({
    startTime: new Date("2026-11-10T15:00:00Z"),
    createdAt: longAgo, now, timeZone: TZ, reminderDaysBefore: [1], remindersSentDays: [],
  });
  assert.equal(past.send, false);
  const off = reminderDecision({
    startTime: new Date("2026-11-11T17:00:00Z"),
    createdAt: longAgo, now, timeZone: TZ, reminderDaysBefore: [], remindersSentDays: [],
  });
  assert.equal(off.send, false);
});

test("client tokens are long and unique", () => {
  const a = newClientToken();
  assert.ok(a.length >= 32);
  assert.notEqual(a, newClientToken());
});
