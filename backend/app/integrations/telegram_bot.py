import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


async def send_message(tg_id: int, text: str) -> bool:
    """
    Отправляет сообщение пользователю через Bot API. Возвращает False (не
    бросает исключение) на неудаче — единичный сбой отправки (например,
    пользователь заблокировал бота) не должен обрывать всю рассылку остальным.

    Интерактивных кнопок ("Заплатил"/"Напомнить завтра") здесь пока нет: они
    требуют вебхука на callback_query, который ещё не реализован — см.
    app/services/reminders.py.
    """
    token = settings.telegram_bot_token.get_secret_value()
    url = f"{TELEGRAM_API_BASE}/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json={"chat_id": tg_id, "text": text})
        if response.status_code != 200:
            logger.warning("Telegram sendMessage failed for tg_id=%s: %s", tg_id, response.text)
            return False
        return True
    except httpx.HTTPError as exc:
        logger.warning("Telegram sendMessage error for tg_id=%s: %s", tg_id, exc)
        return False
