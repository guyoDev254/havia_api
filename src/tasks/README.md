# Scheduled Tasks

This module contains scheduled tasks that run automatically in the background.

## Deadline Checker Task

The `DeadlineCheckerTask` automatically checks for upcoming deadlines and sends notifications to students.

### Schedule

1. **Hourly Check**: Runs every hour to check for assignments and calendar events due within the next 24 hours
   - Cron: `@Cron(CronExpression.EVERY_HOUR)` (every hour at minute 0)

2. **Daily Morning Check**: Runs every day at 8:00 AM for same-day deadlines
   - Cron: `0 8 * * *` (every day at 8:00 AM)

### What It Does

- Checks assignments due within 24 hours that are not yet submitted
- Checks calendar events (exams, deadlines) with reminders set
- Sends push notifications to students about upcoming deadlines
- Logs all notification activities

### Manual Triggering

You can manually trigger the deadline check by calling:
```
POST /students/check-deadlines
```

This is useful for testing or if you need to run it outside the scheduled times.

### Configuration

To modify the schedule, edit `deadline-checker.task.ts`:

- Change `CronExpression.EVERY_HOUR` to a different frequency
- Modify `'0 8 * * *'` for the daily check time
- Use cron syntax: `minute hour day month day-of-week`

Examples:
- `'0 */6 * * *'` - Every 6 hours
- `'0 9,17 * * *'` - At 9 AM and 5 PM daily
- `'0 8 * * 1-5'` - At 8 AM on weekdays only

### Logs

The task logs all activities:
- When checks run
- How many notifications were sent
- Any errors encountered

Check application logs to monitor task execution.

