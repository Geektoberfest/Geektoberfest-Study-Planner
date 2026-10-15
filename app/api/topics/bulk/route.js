import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";
import Topic from "@/models/Topic";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { bulkTopicsSchema } from "@/lib/validation";

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const parsed = bulkTopicsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { subjectId, topics } = parsed.data;

    const subject = await Subject.findOne({ _id: subjectId, userId: user._id });
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 400 });

    // Fetch existing topics to prevent duplicates against the database
    const existingTopics = await Topic.find({ subjectId: subject._id, userId: user._id })
      .select("name")
      .lean();
    const existingNames = new Set(existingTopics.map((t) => t.name.toLowerCase()));

    const toInsert = [];
    const skippedDuplicates = [];

    for (const t of topics) {
      const lower = t.name.toLowerCase();
      if (existingNames.has(lower)) {
        skippedDuplicates.push(t.name);
        continue;
      }
      existingNames.add(lower);
      toInsert.push({
        userId: user._id,
        subjectId: subject._id,
        name: t.name,
        difficulty: t.difficulty,
        estimatedMinutes: t.estimatedMinutes,
        importance: t.importance,
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json(
        { error: "All provided topics already exist in this subject." },
        { status: 400 }
      );
    }

    const created = await Topic.insertMany(toInsert);

    return NextResponse.json({
      ok: true,
      count: created.length,
      skippedCount: skippedDuplicates.length,
      topics: created.map((topic) => ({
        id: String(topic._id),
        subjectId: String(topic.subjectId),
        name: topic.name,
        difficulty: topic.difficulty,
        estimatedMinutes: topic.estimatedMinutes,
        importance: topic.importance,
        completed: topic.completed,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
