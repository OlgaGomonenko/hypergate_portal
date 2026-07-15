from app.integrations.google_sheets import find_row_by_key, update_cell, upsert_row

# Одна строка на РЕЖИМ (code_td_id), не одна строка на пользователя (tg_id) —
# при смене налогового режима онбординг идёт заново, значит и статусы активации
# (счёт/Kleos/Эльба) должны начаться с чистого листа для новой записи, а не
# унаследовать состояние от предыдущего режима того же tg_id.
WORKSHEET = "onboarding_progress"
COLUMNS = ["code_td_id", "tg_id", "tax_status", "kleos_status", "notice_type", "elba_status", "bank_account_status"]

ACTIVE = "active"
NOT_ACTIVE = "no_active"

_DEFAULTS = {
    "tax_status": NOT_ACTIVE,
    "kleos_status": NOT_ACTIVE,
    "notice_type": "",
    "elba_status": NOT_ACTIVE,
    "bank_account_status": NOT_ACTIVE,
}


async def get_progress(code_td_id: str) -> dict | None:
    return await find_row_by_key(WORKSHEET, "code_td_id", code_td_id)


async def upsert_progress(
    code_td_id: str,
    tg_id: int,
    tax_status: str | None = None,
    kleos_status: str | None = None,
    notice_type: str | None = None,
    elba_status: str | None = None,
    bank_account_status: str | None = None,
) -> None:
    """
    Точечно обновляет только переданные поля — каждое отдельной ячейкой
    (update_cell), без чтения+перезаписи всей строки. Это важно: разные шаги
    онбординга (открыт счёт? / активирован Kleos? / Эльба?) может дёргать
    пользователь один за другим почти без паузы — если бы каждый вызов читал
    всю строку, мёржил и перезаписывал целиком, более поздний вызов мог
    прочитать состояние ДО того, как предыдущий долетел, и затереть его
    обратно на дефолт. Точечная запись в одну ячейку не имеет такого окна гонки.
    """
    updates = {
        "tax_status": tax_status,
        "kleos_status": kleos_status,
        "notice_type": notice_type,
        "elba_status": elba_status,
        "bank_account_status": bank_account_status,
    }
    updates = {column: value for column, value in updates.items() if value is not None}
    if not updates:
        return

    for column, value in updates.items():
        updated = await update_cell(WORKSHEET, "code_td_id", code_td_id, column, value)
        if not updated:
            # Строки для этого code_td_id ещё нет вообще — создаём сразу целиком
            # (единственный писатель в этот момент, гонки тут не возникает).
            await upsert_row(
                WORKSHEET,
                "code_td_id",
                code_td_id,
                {
                    "code_td_id": code_td_id,
                    "tg_id": tg_id,
                    **{col: updates.get(col, default) for col, default in _DEFAULTS.items()},
                },
                COLUMNS,
            )
            return
