function parseTimeString(timeText) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeText);
  if (!match) {
    throw new Error(`Invalid scheduleTime \"${timeText}\". Expected HH:mm.`);
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2])
  };
}

function millisecondsUntilNextRun(timeText, now = new Date()) {
  const { hours, minutes } = parseTimeString(timeText);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

function scheduleDailyTask(timeText, task, nowProvider = () => new Date()) {
  let timer;

  const scheduleNext = () => {
    const delay = millisecondsUntilNextRun(timeText, nowProvider());
    timer = setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        console.error('[Service-TC] Daily task failed:', error);
      } finally {
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();

  return () => {
    if (timer) {
      clearTimeout(timer);
    }
  };
}

module.exports = {
  parseTimeString,
  millisecondsUntilNextRun,
  scheduleDailyTask
};
