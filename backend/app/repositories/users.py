from app.integrations.google_sheets import (
    find_all_rows_by_predicate,
    find_row_by_predicate,
    update_cell,
    upsert_row,
)

# region: "Moskow" | "MO" | "Others" (значения фиксированы фронтом, не проверяются
# здесь — это generic-репозиторий; валидация допустимых значений будет в API-слое).
# tax_value_recommended/tax_value_fact: ссылаются на tax_value_id из вкладки
# tax_values (usn | usn_patent | ausn | selfmanager) — как внешний ключ, но без
# принудительной целостности (Sheets её не проверяет).
#
# code_td_id — настоящий первичный ключ строки: "{порядковый номер}_{tg_id}"
# (например "1_123456789", "2_123456789"). Нужен, потому что при смене режима
# у одного tg_id теперь может быть НЕСКОЛЬКО строк (история) — искать/обновлять
# по одному только tg_id больше нельзя, попадёшь в произвольную из них.
WORKSHEET = "users"
COLUMNS = [
    "code_td_id",
    "tg_id",
    "tg_username",
    "email",
    "region",
    "income_monthly",
    "tax_value_recommended",
    "tax_value_fact",
    "date_active",
    "tax_value_status",
    "date_inactive",
]

ACTIVE = "active"
NOT_ACTIVE = "noactive"


async def get_active_user(tg_id: int) -> dict | None:
    """Текущая (активная) запись пользователя — та, по которой сейчас идёт
    онбординг/начисляются напоминания. Историю см. в get_user_history."""
    return await find_row_by_predicate(
        WORKSHEET, lambda r: str(r.get("tg_id")) == str(tg_id) and r.get("tax_value_status") == ACTIVE
    )


async def get_user_history(tg_id: int) -> list[dict]:
    """Все записи пользователя (активная + закрытые), по порядку code_td_id."""
    rows = await find_all_rows_by_predicate(WORKSHEET, lambda r: str(r.get("tg_id")) == str(tg_id))

    def _sequence(row: dict) -> int:
        try:
            return int(str(row.get("code_td_id", "0_0")).split("_")[0])
        except ValueError:
            return 0

    return sorted(rows, key=_sequence)


async def upsert_active_user(
    tg_id: int,
    tg_username: str | None = None,
    email: str | None = None,
    region: str | None = None,
    income_monthly: str | None = None,
    tax_value_recommended: str | None = None,
    tax_value_fact: str | None = None,
    date_active: str | None = None,
) -> None:
    """
    Точечно обновляет только переданные поля АКТИВНОЙ записи пользователя —
    каждое отдельной ячейкой (см. подробности гонки чтение-запись в
    onboarding_progress.upsert_progress). Если активной записи ещё нет вообще
    (самый первый заход в онбординг) — создаёт первую, code_td_id = "1_<tg_id>".
    """
    active = await get_active_user(tg_id)

    if active is None:
        code_td_id = f"1_{tg_id}"
        await upsert_row(
            WORKSHEET,
            "code_td_id",
            code_td_id,
            {
                "code_td_id": code_td_id,
                "tg_id": tg_id,
                "tg_username": tg_username or "",
                "email": email or "",
                "region": region or "",
                "income_monthly": income_monthly or "",
                "tax_value_recommended": tax_value_recommended or "",
                "tax_value_fact": tax_value_fact or "",
                "date_active": date_active or "",
                "tax_value_status": ACTIVE,
                "date_inactive": "",
            },
            COLUMNS,
        )
        return

    code_td_id = active["code_td_id"]
    updates = {
        "tg_username": tg_username,
        "email": email,
        "region": region,
        "income_monthly": income_monthly,
        "tax_value_recommended": tax_value_recommended,
        "tax_value_fact": tax_value_fact,
        "date_active": date_active,
    }
    for column, value in updates.items():
        if value is not None:
            await update_cell(WORKSHEET, "code_td_id", code_td_id, column, value)


async def start_new_regime(tg_id: int, tg_username: str | None, date_inactive: str) -> str:
    """
    Смена налогового режима: закрывает текущую активную запись (статус
    noactive + дата закрытия) и создаёт новую, полностью чистую — email,
    регион, доход, режим не переносятся, пользователь вводит их заново
    (весь онбординг идёт с начала). Возвращает code_td_id новой записи.
    """
    history = await get_user_history(tg_id)
    active = next((r for r in history if r.get("tax_value_status") == ACTIVE), None)
    if active is not None:
        await update_cell(WORKSHEET, "code_td_id", active["code_td_id"], "tax_value_status", NOT_ACTIVE)
        await update_cell(WORKSHEET, "code_td_id", active["code_td_id"], "date_inactive", date_inactive)

    next_seq = len(history) + 1
    code_td_id = f"{next_seq}_{tg_id}"
    await upsert_row(
        WORKSHEET,
        "code_td_id",
        code_td_id,
        {
            "code_td_id": code_td_id,
            "tg_id": tg_id,
            "tg_username": tg_username or "",
            "email": "",
            "region": "",
            "income_monthly": "",
            "tax_value_recommended": "",
            "tax_value_fact": "",
            "date_active": "",
            "tax_value_status": ACTIVE,
            "date_inactive": "",
        },
        COLUMNS,
    )
    return code_td_id
