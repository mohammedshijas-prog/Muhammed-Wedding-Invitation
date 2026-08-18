"use client";

import { DATABASE_URL } from "./firebaseConfig";

const STORAGE_KEY = "pending-rsvps";
const WRITE_TIMEOUT_MS = 8000;

export type PendingRsvp = {
  id: string;
  name: string;
  attendance: "attending" | "declined";
  guests: number;
  createdAt: number;
};

const PUSH_CHARS =
  "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

let lastPushTime = 0;
const lastRandChars: number[] = [];

// Mirrors Firebase's own key format so records stay in chronological order
// alongside the ones written by the SDK, without needing a network round trip.
export function createRsvpId() {
  let now = Date.now();
  const isDuplicateTime = now === lastPushTime;
  lastPushTime = now;

  const timeChars = new Array<string>(8);

  for (let index = 7; index >= 0; index -= 1) {
    timeChars[index] = PUSH_CHARS.charAt(now % 64);
    now = Math.floor(now / 64);
  }

  if (isDuplicateTime) {
    let index = 11;

    for (; index >= 0 && lastRandChars[index] === 63; index -= 1) {
      lastRandChars[index] = 0;
    }

    lastRandChars[index] += 1;
  } else {
    for (let index = 0; index < 12; index += 1) {
      lastRandChars[index] = Math.floor(Math.random() * 64);
    }
  }

  return (
    timeChars.join("") +
    lastRandChars.map((value) => PUSH_CHARS.charAt(value)).join("")
  );
}

function readQueue(): PendingRsvp[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? (parsed as PendingRsvp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(records: PendingRsvp[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Private browsing can block storage; the in-flight request still runs.
  }
}

export function hasPendingRsvps() {
  return readQueue().length > 0;
}

async function deliver(record: PendingRsvp) {
  const { id, ...payload } = record;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), WRITE_TIMEOUT_MS);

  try {
    // REST avoids holding a realtime socket open, so guests are never turned
    // away by the project's simultaneous connection limit. Writing to a key we
    // generated ourselves keeps retries idempotent instead of duplicating.
    const response = await fetch(`${DATABASE_URL}/rsvps/${id}.json`, {
      method: "PUT",
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`RSVP write failed with status ${response.status}`);
    }
  } finally {
    window.clearTimeout(timer);
  }

  writeQueue(readQueue().filter((queued) => queued.id !== id));
}

export async function sendRsvp(record: PendingRsvp) {
  writeQueue([...readQueue().filter((queued) => queued.id !== record.id), record]);

  try {
    await deliver(record);

    return true;
  } catch {
    return false;
  }
}

export async function flushRsvpQueue() {
  for (const record of readQueue()) {
    try {
      await deliver(record);
    } catch {
      // Left in the queue for the next reconnect.
    }
  }
}
