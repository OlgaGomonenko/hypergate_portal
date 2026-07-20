"""
Одноразовый сквозной тест сервиса напоминаний (app/services/reminders.py) —
гоняет реальную бизнес-логику (генерация tax_events из tax_calendar, дедуп в
notifications_log, окна 7/3/1 день) против настоящей Google-таблицы, но БЕЗ
реальной отправки в Telegram: telegram_bot.send_message подменяется на
заглушку, которая просто запоминает вызовы — у тестового tg_id нет реального
Telegram-чата, настоящая отправка вернула бы ошибку от Bot API.

Проверку реальной доставки в Telegram делаем отдельно, вручную, на своём
tg_id — так же, как раньше проверяли онбординг в реальном Mini App.

Не часть приложения — запускается вручную и подчищает за собой все тестовые
строки (users, tax_calendar, tax_events, notifications_log).

Запуск: PYTHONPATH=. python scripts/_smoke_test_reminders.py
"""

import asyncio
from datetime import date, timedelta

from app.integrations import google_sheets, telegram_bot
from app.integrations.google_sheets import _get_worksheet
from app.repositories import tax_calendar as tax_calendar_repo
from app.repositories import tax_events as tax_events_repo
from app.repositories import users as users_repo
from app.services import reminders

TEST_TG_ID = 999999001
TEST_CODE_TD_ID = f"1_{TEST_TG_ID}"
TODAY = date(2026, 7, 20)
TEST_CALENDAR_ID = f"usn__smoke_test__{TODAY.isoformat()}"

sent_messages = []


async def fake_send_message(tg_id, text):
    sent_messages.append((tg_id, text))
    return True


def _delete_all(ws_name: str, key_column: str, key_value) -> int:
    ws = _get_worksheet(ws_name)
    rows = ws.get_all_records()
    to_delete = [i for i, row in enumerate(rows, start=2) if str(row.get(key_column)) == str(key_value)]
    for row_num in sorted(to_delete, reverse=True):
        ws.delete_rows(row_num)
    return len(to_delete)


def cleanup():
    n = _delete_all("users", "code_td_id", TEST_CODE_TD_ID)
    print(f"[cleanup] users: удалено строк {n}")
    n = _delete_all("tax_calendar", "id", TEST_CALENDAR_ID)
    print(f"[cleanup] tax_calendar: удалено строк {n}")
    n = _delete_all("tax_events", "tg_id", TEST_TG_ID)
    print(f"[cleanup] tax_events: удалено строк {n}")
    n = _delete_all("notifications_log", "tg_id", TEST_TG_ID)
    print(f"[cleanup] notifications_log: удалено строк {n}")


async def main():
    telegram_bot.send_message = fake_send_message

    await google_sheets.upsert_row(
        users_repo.WORKSHEET,
        "code_td_id",
        TEST_CODE_TD_ID,
        {
            "code_td_id": TEST_CODE_TD_ID,
            "tg_id": TEST_TG_ID,
            "tg_username": "smoke_reminders",
            "email": "smoke@example.com",
            "region": "MO",
            "income_monthly": 100000,
            "tax_value_recommended": "usn",
            "tax_value_fact": "usn",
            "date_active": "2026-01-10",
            "tax_value_status": users_repo.ACTIVE,
            "date_inactive": "",
        },
        users_repo.COLUMNS,
    )

    due_in_7 = (TODAY + timedelta(days=7)).isoformat()
    await google_sheets.upsert_row(
        tax_calendar_repo.WORKSHEET,
        "id",
        TEST_CALENDAR_ID,
        {
            "id": TEST_CALENDAR_ID,
            "tax_value_id": "usn",
            "event_type": "smoke_test",
            "due_date": due_in_7,
            "notification_text": "Тестовое напоминание смоук-теста.",
        },
        ["id", "tax_value_id", "event_type", "due_date", "notification_text"],
    )

    try:
        created = await reminders.sync_tax_events()
        print(f"[1] sync_tax_events создал {created} событий (>=1 ожидается)")
        assert created >= 1

        events = await tax_events_repo.list_for_code_td_id(TEST_CODE_TD_ID)
        test_event = next(e for e in events if e["calendar_id"] == TEST_CALENDAR_ID)
        print(f"[2] тестовый tax_events создан: {test_event}")
        assert test_event["due_date"] == due_in_7

        events_before = len(events)
        created_again = await reminders.sync_tax_events()
        events_after = await tax_events_repo.list_for_code_td_id(TEST_CODE_TD_ID)
        assert len(events_after) == events_before, "повторная синхронизация создала дубль"
        print(f"[3] повторная синхронизация: создано {created_again} (0 ожидается), дублей нет — OK")

        sent = await reminders.send_due_reminders(today=TODAY)
        print(f"[4] send_due_reminders отправил {sent} напоминаний")
        assert any("Тестовое напоминание" in text for _, text in sent_messages), sent_messages
        print(f"    текст нашего напоминания: {[t for _, t in sent_messages if 'Тестовое' in t]}")

        sent_messages.clear()
        sent_again = await reminders.send_due_reminders(today=TODAY)
        assert not any("Тестовое напоминание" in text for _, text in sent_messages)
        print("[5] повторный запуск в тот же день не дублирует отправку нашего события — OK")

        print("\nВСЁ ПРОШЛО УСПЕШНО")
    finally:
        cleanup()


if __name__ == "__main__":
    asyncio.run(main())
