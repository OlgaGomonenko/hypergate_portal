import asyncio

from app.celery_app import celery_app
from app.services.reminders import run_daily_reminders


@celery_app.task(name="app.tasks.reminders.run_daily_reminders_task")
def run_daily_reminders_task() -> dict:
    return asyncio.run(run_daily_reminders())
