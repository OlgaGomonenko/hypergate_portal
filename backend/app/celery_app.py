"""
Celery-приложение для ежедневной рассылки налоговых напоминаний.

Локально Redis не поднят (нет Docker) — сам брокер здесь не запускается и не
тестируется живьём. Бизнес-логика (app/services/reminders.py) написана как
обычные async-функции и протестирована напрямую, без Celery — см.
scripts/_smoke_test_reminders.py. Этот файл нужен, чтобы на хостинге с
доступным Redis можно было поднять `celery -A app.celery_app worker` и
`celery -A app.celery_app beat` без дополнительного кода.
"""

from celery import Celery
from celery.schedules import crontab

from app.config import settings

_redis_url = settings.redis_url.get_secret_value()
celery_app = Celery("hypergate_portal", broker=_redis_url, backend=_redis_url)
celery_app.conf.timezone = "Europe/Moscow"
celery_app.conf.beat_schedule = {
    "daily-tax-reminders": {
        "task": "app.tasks.reminders.run_daily_reminders_task",
        "schedule": crontab(hour=9, minute=0),
    },
}

celery_app.autodiscover_tasks(["app.tasks"])
