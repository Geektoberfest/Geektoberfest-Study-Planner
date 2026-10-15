import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name is too long"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(120)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00.000Z`).getTime()), "Invalid date");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

// An IANA time-zone name the runtime recognises (e.g. "Asia/Kolkata", "UTC").
const timeZoneString = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Invalid time zone");

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required").max(80, "Subject name is too long"),
  examDate: dateString,
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

export const subjectUpdateSchema = subjectSchema.partial();

export const topicSchema = z.object({
  subjectId: objectId,
  name: z.string().trim().min(1, "Topic name is required").max(120, "Topic name is too long"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  estimatedMinutes: z.coerce
    .number()
    .int("Estimated minutes must be a whole number")
    .min(5, "Minimum 5 minutes")
    .max(600, "Maximum 600 minutes"),
  importance: z.coerce
    .number()
    .int("Importance must be 1-10")
    .min(1, "Importance must be 1-10")
    .max(10, "Importance must be 1-10")
    .default(5),
});

export const topicUpdateSchema = z.object({
  name: z.string().trim().min(1, "Topic name is required").max(120).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  estimatedMinutes: z.coerce.number().int().min(5).max(600).optional(),
  importance: z.coerce.number().int().min(1).max(10).optional(),
  completed: z.boolean().optional(),
});

export const bulkTopicItemSchema = z.object({
  name: z.string().trim().min(1, "Topic name is required").max(120, "Topic name is too long"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  estimatedMinutes: z.coerce
    .number()
    .int("Estimated minutes must be a whole number")
    .min(5, "Minimum 5 minutes")
    .max(600, "Maximum 600 minutes")
    .default(60),
  importance: z.coerce
    .number()
    .int("Importance must be 1-10")
    .min(1, "Importance must be 1-10")
    .max(10, "Importance must be 1-10")
    .default(5),
});

export const bulkTopicsSchema = z.object({
  subjectId: objectId,
  topics: z
    .array(bulkTopicItemSchema)
    .min(1, "At least one topic is required")
    .max(100, "Maximum 100 topics per bulk import"),
});

export const weekAvailabilitySchema = z.object({
  "0": z.coerce.number().int().min(0).max(1440).optional(),
  "1": z.coerce.number().int().min(0).max(1440).optional(),
  "2": z.coerce.number().int().min(0).max(1440).optional(),
  "3": z.coerce.number().int().min(0).max(1440).optional(),
  "4": z.coerce.number().int().min(0).max(1440).optional(),
  "5": z.coerce.number().int().min(0).max(1440).optional(),
  "6": z.coerce.number().int().min(0).max(1440).optional(),
});

export const settingsUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60).optional(),
    preferredStudyTime: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
    dailyStudyMinutes: z.coerce.number().int().min(0).max(1440).optional(),
    weeklyAvailability: weekAvailabilitySchema.optional(),
    timeZone: timeZoneString.optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(72).optional(),
  })
  .refine((d) => !d.newPassword || Boolean(d.currentPassword), {
    message: "Enter your current password to set a new one",
    path: ["currentPassword"],
  });

export const completeSessionSchema = z.object({
  actualMinutes: z.coerce.number().min(0, "Must be 0 or more").max(1440, "Maximum 1440 minutes").optional(),
});

export const syllabusRequestSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(120, "Subject name is too long"),
});

export const sessionsQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  subjectId: objectId.optional(),
});

export const HISTORY_MAX_DAYS = 366;
export const HISTORY_DEFAULT_DAYS = 30;

const DAY_MS = 86400000;
const keyOf = (d) => d.toISOString().slice(0, 10);
const shiftKey = (key, n) => keyOf(new Date(new Date(`${key}T00:00:00.000Z`).getTime() + n * DAY_MS));

export const historyQuerySchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    subjectId: objectId.optional(),
    topicId: objectId.optional(),
    status: z.enum(["planned", "in_progress", "completed", "skipped"]).optional(),
    page: z.coerce.number().int("Page must be a whole number").min(1, "Page must be at least 1").default(1),
    limit: z.coerce
      .number()
      .int("Limit must be a whole number")
      .min(1, "Limit must be at least 1")
      .max(100, "Limit can be at most 100")
      .default(20),
  })
  .transform((q) => {
    // Fill in a default window (last 30 days, UTC) when one or both ends are missing.
    const to = q.to || keyOf(new Date());
    const from = q.from || shiftKey(to, -(HISTORY_DEFAULT_DAYS - 1));
    return { ...q, from, to };
  })
  .superRefine((q, ctx) => {
    if (q.from > q.to) {
      ctx.addIssue({ code: "custom", path: ["from"], message: "Start date must be on or before the end date" });
      return;
    }
    const span = Math.round((new Date(q.to) - new Date(q.from)) / DAY_MS) + 1;
    if (span > HISTORY_MAX_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `Date range can be at most ${HISTORY_MAX_DAYS} days`,
      });
    }
  });
