from app.integrations.google_sheets import append_row, find_row_by_predicate

# Лог отправленных напоминаний — защита от повторной отправки. event_key —
# "{tax_events.id}:{за сколько дней}" (7/3/1), т.к. одно и то же событие
# порождает НЕСКОЛЬКО напоминаний в разное время, и дедуп должен различать их.
WORKSHEET = "notifications_log"
COLUMNS = ["tg_id", "event_id", "sent_at", "channel"]


async def was_sent(tg_id: int, event_key: str) -> bool:
    row = await find_row_by_predicate(
        WORKSHEET, lambda r: str(r.get("tg_id")) == str(tg_id) and r.get("event_id") == event_key
    )
    return row is not None


async def log_sent(tg_id: int, event_key: str, sent_at: str, channel: str = "telegram") -> None:
    await append_row(
        WORKSHEET,
        {"tg_id": tg_id, "event_id": event_key, "sent_at": sent_at, "channel": channel},
        COLUMNS,
    )
