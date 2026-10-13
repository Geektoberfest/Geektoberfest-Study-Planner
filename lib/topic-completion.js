export function shouldCompleteTopic(
  completedSessions,
  estimatedMinutes
) {
  const totalActualMinutes = completedSessions.reduce(
    (total, session) => total + (session.actualMinutes || 0),
    0
  );

  return totalActualMinutes >= estimatedMinutes;
}