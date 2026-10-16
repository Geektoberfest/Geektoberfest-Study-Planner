import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import StudySession from "@/models/StudySession";
import Topic from "@/models/Topic";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { completeSessionSchema } from "@/lib/validation";
import { shouldCompleteTopic } from "@/lib/topic-completion";

const ID_RE = /^[0-9a-fA-F]{24}$/;

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorized();
    }

    await dbConnect();

    const { id } = await params;

    if (!ID_RE.test(id)) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 400 }
      );
    }

    const session = await StudySession.findOne({
      _id: id,
      userId: user._id,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { error: "Session is already completed" },
        { status: 400 }
      );
    }

    if (session.status === "skipped") {
      return NextResponse.json(
        { error: "Session was skipped" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = completeSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    let actualMinutes = parsed.data.actualMinutes;

    if (actualMinutes == null) {
      actualMinutes = session.startedAt
        ? Math.max(
            1,
            Math.round(
              (Date.now() - session.startedAt.getTime()) / 60000
            )
          )
        : session.plannedMinutes;
    }

    actualMinutes = Math.min(1440, Math.max(0, actualMinutes));

    session.status = "completed";
    session.completedAt = new Date();
    session.actualMinutes = actualMinutes;

    await session.save();

    // Calculate topic completion using actual study minutes.
    if (session.topicId) {
      const topic = await Topic.findOne({
        _id: session.topicId,
        userId: user._id,
      });

      // Preserve an existing completion status.
      if (topic && !topic.completed) {
        const completedSessions = await StudySession.find({
          userId: user._id,
          topicId: topic._id,
          status: "completed",
        })
          .select("actualMinutes")
          .lean();

        if (
          shouldCompleteTopic(
            completedSessions,
            topic.estimatedMinutes
          )
        ) {
          topic.completed = true;
          await topic.save();
        }
      }
    }

    return NextResponse.json({
      ok: true,
      actualMinutes: session.actualMinutes,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}