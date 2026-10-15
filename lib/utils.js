import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/* ---------- tiny fetch helper for client components ---------- */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

/* ----------------------------------------------------------------------------
 * Dates & time zones
 *
 * Timestamps are always stored in UTC. A "day" is a calendar date (YYYY-MM-DD),
 * and each day key maps to a canonical UTC-midnight "anchor" (see parseDayKey)
 * used purely for day-level arithmetic and comparison. Anchors are exactly 24h
 * apart, so addDays/daysBetween/startOfWeek stay DST-safe.
 *
 * The only time-zone-sensitive step is mapping a real instant (e.g. "now") to
 * the calendar day it falls on. Pass the user's IANA time zone to
 * dayKey/todayKey/startOfToday for that; omitting it falls back to UTC, which
 * preserves the historical behaviour. Exam dates are stored and read as plain
 * calendar dates (parseDayKey), so they never shift across zones.
 * -------------------------------------------------------------------------- */
export const DAY_MS = 86400000;
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Display order: Monday first, keys are JS getUTCDay() indices.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const pad = (n) => String(n).padStart(2, "0");

// True when `timeZone` is a valid IANA zone name the runtime recognises.
export function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Calendar day (YYYY-MM-DD) that `date` falls on. With a valid IANA `timeZone`
// the day is resolved in that zone; otherwise it falls back to UTC.
export function dayKey(date, timeZone) {
  const d = new Date(date);
  if (isValidTimeZone(timeZone)) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayKey(timeZone) {
  return dayKey(new Date(), timeZone);
}

// UTC-midnight anchor of the user's local "today" — the pivot that past/future
// comparisons, streaks and planning should use.
export function startOfToday(timeZone) {
  return parseDayKey(todayKey(timeZone));
}

export function parseDayKey(key) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(date, n) {
  const d = startOfDay(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  return addDays(d, -((d.getUTCDay() + 6) % 7)); // Monday
}

export function weekdayOfKey(key) {
  return parseDayKey(key).getUTCDay();
}

/* ---------- formatting ---------- */
export function formatMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function formatDate(key) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
      .format(parseDayKey(key));
  } catch {
    return key;
  }
}

export function formatShortDate(key) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      .format(parseDayKey(key));
  } catch {
    return key;
  }
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function getGreeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Parses pasted syllabus or outline text into clean topic items.
 * Supports:
 * - One topic per line
 * - Numbered lists ("1.", "1)", "1 -", "1:")
 * - Bullet points ("-", "*", "•", "+")
 * - Markdown headings ("#", "##", "###")
 * - Automatically trims and deduplicates entries case-insensitively.
 */
export function parseSyllabusText(rawText = "", options = {}) {
  if (!rawText || typeof rawText !== "string") return [];

  const defaultDifficulty = options.defaultDifficulty || "medium";
  const defaultMinutes = Number(options.defaultMinutes) || 60;
  const defaultImportance = Number(options.defaultImportance) || 5;

  const lines = rawText.split(/\r?\n/);
  const seenNames = new Set();
  const parsedTopics = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Remove markdown headings
    line = line.replace(/^#+\s*/, "");

    // Remove numbered list prefixes (e.g., "1.", "1)", "1 -", "1:", "1.1")
    line = line.replace(/^\d+(?:\.\d+)?\s*[-.:)]\s*/, "");

    // Remove bullet points (e.g., "-", "*", "•", "+")
    line = line.replace(/^[-*•+]\s*/, "");

    // Strip trailing punctuation like semicolons, commas, or periods
    line = line.replace(/[;,.]$/, "").trim();

    if (!line) continue;

    // Truncate to maximum 120 chars
    const cleanedName = line.slice(0, 120).trim();
    const lowerKey = cleanedName.toLowerCase();

    // Prevent duplicate topic names within the same import
    if (seenNames.has(lowerKey)) continue;
    seenNames.add(lowerKey);

    parsedTopics.push({
      name: cleanedName,
      difficulty: defaultDifficulty,
      estimatedMinutes: defaultMinutes,
      importance: defaultImportance,
    });
  }

  return parsedTopics;
}

export function initials(name = "") {
  return (
    String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "S"
  );
}

export function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/* ---------- shared UI maps ---------- */
export const DIFFICULTY_VARIANT = { easy: "success", medium: "default", hard: "destructive" };
export const PRIORITY_VARIANT = { low: "secondary", medium: "warning", high: "destructive" };
export const SUBJECT_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#64748b"];
