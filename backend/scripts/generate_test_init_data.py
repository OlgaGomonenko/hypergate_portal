"""
Генерирует валидно подписанную initData для локального тестирования auth,
не открывая Telegram. Использует тот же TELEGRAM_BOT_TOKEN, что и бэкенд —
подпись должна совпасть с тем, что проверяет app/auth/telegram.py.

Запуск из backend/:  python scripts/generate_test_init_data.py
"""
import hashlib
import hmac
import json
import time
from urllib.parse import quote

from dotenv import load_dotenv
import os

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise SystemExit("TELEGRAM_BOT_TOKEN не найден — заполни .env (см. .env.example)")

fake_user = {
    "id": 123456789,
    "first_name": "Тест",
    "last_name": "Контрактор",
    "username": "test_contractor",
    "language_code": "ru",
}

data = {
    "user": json.dumps(fake_user, ensure_ascii=False, separators=(",", ":")),
    "auth_date": str(int(time.time())),
    "query_id": "AAHtest",
}

data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))
secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
data["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

init_data = "&".join(f"{key}={quote(value, safe='')}" for key, value in data.items())

print("initData:\n", init_data)
print("\nCurl-пример:\n")
print(f'curl -H "Authorization: tma {init_data}" http://127.0.0.1:8000/api/me')
