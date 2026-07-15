import asyncio
import json

import gspread
from google.oauth2.service_account import Credentials

from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

_client: gspread.Client | None = None


def _get_client() -> gspread.Client:
    # Кешируем клиент на процесс — иначе каждый вызов заново читал бы JSON-ключ
    # с диска и переавторизовывался. google-auth сам обновляет токен по истечении,
    # так что переиспользовать клиент безопасно.
    global _client
    if _client is None:
        if settings.google_credentials_json is not None:
            # Хостинги без файловых секретов (напр. Replit) — ключ приходит
            # целиком в переменной окружения, а не файлом на диске.
            info = json.loads(settings.google_credentials_json.get_secret_value())
            creds = Credentials.from_service_account_info(info, scopes=SCOPES)
        else:
            creds = Credentials.from_service_account_file(settings.google_credentials_path, scopes=SCOPES)
        _client = gspread.authorize(creds)
    return _client


def _get_worksheet(name: str) -> gspread.Worksheet:
    return _get_client().open_by_key(settings.google_spreadsheet_id).worksheet(name)


def _find_row(ws: gspread.Worksheet, key_column: str, key_value) -> tuple[int, dict] | None:
    # Строки нумеруются с 2: строка 1 — заголовки (используются get_all_records()
    # как имена ключей словаря).
    for i, row in enumerate(ws.get_all_records(), start=2):
        if str(row.get(key_column)) == str(key_value):
            return i, row
    return None


def _row_values(row: dict, columns: list[str]) -> list[str]:
    return [str(row.get(col, "")) for col in columns]


# gspread — синхронная библиотека (обычные блокирующие HTTP-запросы). Вызов её
# напрямую в async-обработчике FastAPI заблокировал бы event loop на время сетевого
# запроса — соседние запросы других пользователей просто зависли бы. asyncio.to_thread
# уводит блокирующий вызов в отдельный поток, event loop продолжает работать.


async def get_all_records(worksheet_name: str) -> list[dict]:
    return await asyncio.to_thread(lambda: _get_worksheet(worksheet_name).get_all_records())


async def find_row_by_key(worksheet_name: str, key_column: str, key_value) -> dict | None:
    def _run():
        found = _find_row(_get_worksheet(worksheet_name), key_column, key_value)
        return found[1] if found else None

    return await asyncio.to_thread(_run)


async def find_row_by_predicate(worksheet_name: str, predicate) -> dict | None:
    """
    Как find_row_by_key, но для составных условий (например, "tg_id совпадает
    И tax_value_status == active") — с появлением истории режимов у одного
    tg_id может быть несколько строк, простого поиска по одной колонке мало.
    """

    def _run():
        for row in _get_worksheet(worksheet_name).get_all_records():
            if predicate(row):
                return row
        return None

    return await asyncio.to_thread(_run)


async def find_all_rows_by_predicate(worksheet_name: str, predicate) -> list[dict]:
    def _run():
        return [row for row in _get_worksheet(worksheet_name).get_all_records() if predicate(row)]

    return await asyncio.to_thread(_run)


async def upsert_row(worksheet_name: str, key_column: str, key_value, row: dict, columns: list[str]) -> None:
    """
    Обновляет существующую строку (по key_column) целиком или добавляет новую.

    ВНИМАНИЕ: перезаписывает ВСЕ колонки строки. Если разные вызовы могут менять
    РАЗНЫЕ поля одной и той же строки близко по времени (например, "открыт счёт?"
    и "активирован Kleos?" почти подряд) — не используйте это для точечных
    обновлений: gонка чтение-запись перетрёт соседнее поле обратно на старое
    значение. Для точечных изменений одного поля используйте update_cell ниже.
    """

    def _run():
        ws = _get_worksheet(worksheet_name)
        values = _row_values(row, columns)
        found = _find_row(ws, key_column, key_value)
        if found:
            row_num, _ = found
            last_col_letter = gspread.utils.rowcol_to_a1(1, len(columns)).rstrip("0123456789")
            ws.update(values=[values], range_name=f"A{row_num}:{last_col_letter}{row_num}")
        else:
            ws.append_row(values)

    await asyncio.to_thread(_run)


async def update_cell(worksheet_name: str, key_column: str, key_value, column: str, value) -> bool:
    """
    Обновляет ОДНУ ячейку в уже существующей строке, не читая и не трогая
    остальные колонки — в отличие от upsert_row, это безопасно при близких по
    времени изменениях разных полей одной строки (нет окна для гонки чтение-
    запись). Возвращает False, если строка с key_value ещё не существует —
    тогда вызывающий код должен создать её сам (upsert_row/append_row).
    """

    def _run():
        ws = _get_worksheet(worksheet_name)
        found = _find_row(ws, key_column, key_value)
        if not found:
            return False
        row_num, _ = found
        headers = ws.row_values(1)
        col_index = headers.index(column) + 1
        ws.update_cell(row_num, col_index, str(value))
        return True

    return await asyncio.to_thread(_run)


async def append_row(worksheet_name: str, row: dict, columns: list[str]) -> None:
    def _run():
        _get_worksheet(worksheet_name).append_row(_row_values(row, columns))

    await asyncio.to_thread(_run)
