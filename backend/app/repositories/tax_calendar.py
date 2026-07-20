from app.integrations.google_sheets import get_all_records, make_ttl_cache

WORKSHEET = "tax_calendar"

# Справочник дедлайнов — CFO правит прямо в таблице (даты, тексты напоминаний,
# новые события/режимы), без редеплоя. Меняется редко, но читается на каждой
# синхронизации tax_events — 5 минут кеша убирают лишний вызов Sheets API.
_cached = make_ttl_cache(ttl_seconds=300)


async def list_tax_calendar() -> list[dict]:
    return await _cached(lambda: get_all_records(WORKSHEET))


async def list_for_regime(tax_value_id: str) -> list[dict]:
    events = await list_tax_calendar()
    return [row for row in events if row.get("tax_value_id") == tax_value_id]
