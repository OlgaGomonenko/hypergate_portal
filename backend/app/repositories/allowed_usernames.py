import time

from app.integrations.google_sheets import get_all_records

WORKSHEET = "allowed_usernames"

# Белый список живёт в Google Sheets, а не в переменной окружения — так можно
# добавить/убрать контрактора прямо в таблице, без пересборки и перезапуска
# бэкенда. Кешируем на минуту, чтобы не дёргать Sheets API на каждый
# авторизованный запрос — это реальный лимит, в него уже упирались раньше при
# интенсивном тестировании (429 Too Many Requests).
_CACHE_TTL_SECONDS = 60
_cache_usernames: set[str] = set()
_cache_fetched_at: float = 0.0


async def is_allowed(username: str | None) -> bool:
    global _cache_usernames, _cache_fetched_at

    if not username:
        return False

    now = time.time()
    if now - _cache_fetched_at > _CACHE_TTL_SECONDS:
        try:
            records = await get_all_records(WORKSHEET)
        except Exception:
            # Не смогли прочитать список (например, временный лимит Sheets API) —
            # используем то, что уже закешировано (может быть пусто на самом
            # первом запросе — тогда безопасный дефолт "запрещено", а не "всем можно").
            return username.lower() in _cache_usernames

        _cache_usernames = {
            str(row.get("tg_username", "")).strip().lstrip("@").lower()
            for row in records
            if row.get("tg_username")
        }
        _cache_fetched_at = now

    return username.lower() in _cache_usernames
