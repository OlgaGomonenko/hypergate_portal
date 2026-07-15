from app.integrations.google_sheets import get_all_records

WORKSHEET = "step_tax_value"


async def get_step_text(tax_value_id: str) -> dict | None:
    """Подробный алгоритм регистрации для конкретного режима (шаг 2 онбординга)."""
    records = await get_all_records(WORKSHEET)
    for row in records:
        if row.get("tax_value_recommended") == tax_value_id:
            return row
    return None
