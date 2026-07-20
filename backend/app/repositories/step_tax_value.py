from app.integrations.google_sheets import get_all_records, make_ttl_cache

WORKSHEET = "step_tax_value"

# Контент почти не меняется, но читается на каждом заходе на шаг 2 онбординга.
_cached = make_ttl_cache(ttl_seconds=300)


async def get_step_text(tax_value_id: str) -> dict | None:
    """Подробный алгоритм регистрации для конкретного режима (шаг 2 онбординга)."""
    records = await _cached(lambda: get_all_records(WORKSHEET))
    for row in records:
        if row.get("tax_value_recommended") == tax_value_id:
            return row
    return None
