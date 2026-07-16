from app.integrations.google_sheets import get_all_records, make_ttl_cache

WORKSHEET = "tax_values"

# Справочник режимов — меняется крайне редко, но читается на каждом экране
# онбординга/профиля. 5 минут кеша убирают лишний сетевой вызов почти всегда.
_cached = make_ttl_cache(ttl_seconds=300)


async def list_tax_values() -> list[dict]:
    """Справочник режимов налогообложения (usn, usn_patent, ausn, selfmanager)."""
    return await _cached(lambda: get_all_records(WORKSHEET))


async def get_tax_value_name(tax_value_id: str) -> str | None:
    values = await list_tax_values()
    for row in values:
        if row.get("tax_value_id") == tax_value_id:
            return row.get("tax_value_name")
    return None
