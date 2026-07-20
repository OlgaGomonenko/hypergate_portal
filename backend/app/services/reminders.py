import logging
from datetime import date, datetime

from app.integrations import telegram_bot
from app.repositories import notifications_log as notifications_log_repo
from app.repositories import tax_calendar as tax_calendar_repo
from app.repositories import tax_events as tax_events_repo
from app.repositories import users as users_repo

logger = logging.getLogger(__name__)

REMINDER_OFFSETS = (7, 3, 1)


async def sync_tax_events() -> int:
    """
    Для каждого активного пользователя с подтверждённым режимом (tax_value_fact
    заполняется на шаге 3 онбординга) создаёт недостающие инстансы дедлайнов в
    tax_events из tax_calendar. Идемпотентно (см. tax_events_repo.ensure_event) —
    безопасно гонять хоть каждый день, повторные вызовы не плодят дубли.
    """
    users = await users_repo.list_active_users()
    created = 0
    for user in users:
        tax_value_fact = user.get("tax_value_fact")
        if not tax_value_fact:
            continue
        calendar_rows = await tax_calendar_repo.list_for_regime(tax_value_fact)
        for calendar_row in calendar_rows:
            was_created = await tax_events_repo.ensure_event(user["code_td_id"], user["tg_id"], calendar_row)
            if was_created:
                created += 1
    return created


def _days_left(due_date_str: str, today: date) -> int | None:
    try:
        due = datetime.strptime(due_date_str, "%Y-%m-%d").date()
    except ValueError:
        return None
    return (due - today).days


async def send_due_reminders(today: date | None = None) -> int:
    """
    Проходит по всем инстансам дедлайнов и шлёт напоминание тем, у кого до
    due_date осталось ровно 7, 3 или 1 день — если такое напоминание для этого
    события ещё не отправлялось (дедуп в notifications_log, ключ учитывает и
    событие, и то, за сколько дней — иначе один дедлайн не дал бы отправить
    все три напоминания).
    """
    today = today or date.today()
    calendar_by_id = {row["id"]: row for row in await tax_calendar_repo.list_tax_calendar()}
    events = await tax_events_repo.list_all_events()

    sent = 0
    for event in events:
        days_left = _days_left(event.get("due_date", ""), today)
        if days_left not in REMINDER_OFFSETS:
            continue

        calendar_row = calendar_by_id.get(event.get("calendar_id"))
        if calendar_row is None:
            # Событие убрали из справочника, а инстанс в tax_events остался — пропускаем.
            continue

        event_key = f"{event['id']}:{days_left}"
        tg_id = int(event["tg_id"])
        if await notifications_log_repo.was_sent(tg_id, event_key):
            continue

        text = f"⏰ Через {days_left} дн. ({event['due_date']}): {calendar_row['notification_text']}"
        ok = await telegram_bot.send_message(tg_id, text)
        if ok:
            await notifications_log_repo.log_sent(tg_id, event_key, today.isoformat())
            sent += 1
        else:
            logger.warning("Не удалось отправить напоминание tg_id=%s event=%s", tg_id, event["id"])
    return sent


async def run_daily_reminders() -> dict:
    """
    Точка входа для ежедневного планировщика (Celery beat, см.
    app/tasks/reminders.py) — и для прямого вызова из скрипта/теста без живого
    Celery/Redis (локально их поднять негде, поэтому бизнес-логику тестируем
    так, напрямую).
    """
    created = await sync_tax_events()
    sent = await send_due_reminders()
    return {"events_created": created, "reminders_sent": sent}
