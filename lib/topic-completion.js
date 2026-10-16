export function shouldCompleteTopic(
  completedSessions,
  estimatedMinutes
) {
  if (
    !Array.isArray(completedSessions) ||
    typeof estimatedMinutes !== "number" ||
    !Number.isFinite(estimatedMinutes) ||
    estimatedMinutes <= 0
  ) {
    return false;
  }

  const totalActualMinutes = completedSessions.reduce(
    (total, session) => {
      const minutes = session?.actualMinutes;

      if (
        typeof minutes !== "number" ||
        !Number.isFinite(minutes) ||
        minutes < 0
      ) {
        return total;
      }

      return total + minutes;
    },
    0
  );

  return totalActualMinutes >= estimatedMinutes;
}