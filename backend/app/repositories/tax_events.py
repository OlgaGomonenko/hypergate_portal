from app.integrations.google_sheets import append_row, find_all_rows_by_predicate, find_row_by_key, get_all_records

# Конкретный дедлайн для конкретного пользователя — по одной строке на
# (пользователь, событие из tax_calendar). id = "{calendar_id}__{code_td_id}",
# поэтому повторный запуск синхронизации (см. app/services/reminders.py)
# идемпотентен: строка создаётся один раз, дальше просто пропускается.
WORKSHEET = "tax_events"
COLUMNS = ["id", "code_td_id", "tg_id", "calendar_id", "type", "due_date", "status"]

UPCOMING = "upcoming"
OVERDUE = "overdue"
DONE = "done"


def event_id(calendar_id: str, code_td_id: str) -> str:
    return f"{calendar_id}__{code_td_id}"


async def ensure_event(code_td_id: str, tg_id: int, calendar_row: dict) -> bool:
    """Создаёт инстанс дедлайна для пользователя, если его ещё нет. Возвращает
    True, если строка была создана (для подсчёта в логах синхронизации)."""
    eid = event_id(calendar_row["id"], code_td_id)
    existing = await find_row_by_key(WORKSHEET, "id", eid)
    if existing is not None:
        return False
    await append_row(
        WORKSHEET,
        {
            "id": eid,
            "code_td_id": code_td_id,
            "tg_id": tg_id,
            "calendar_id": calendar_row["id"],
            "type": calendar_row["event_type"],
            "due_date": calendar_row["due_date"],
            "status": UPCOMING,
        },
        COLUMNS,
    )
    return True


async def list_all_events() -> list[dict]:
    return await get_all_records(WORKSHEET)


async def list_for_code_td_id(code_td_id: str) -> list[dict]:
    return await find_all_rows_by_predicate(WORKSHEET, lambda r: r.get("code_td_id") == code_td_id)
