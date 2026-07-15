import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from pydantic import BaseModel


class TelegramUser(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    language_code: str | None = None
    is_premium: bool = False
    photo_url: str | None = None


class InitData(BaseModel):
    user: TelegramUser
    auth_date: int
    query_id: str | None = None
    chat_instance: str | None = None
    chat_type: str | None = None


class InitDataValidationError(Exception):
    pass


def validate_init_data(init_data_raw: str, bot_token: str, max_age_seconds: int) -> InitData:
    """
    Проверяет initData, присланный Telegram Mini App, по алгоритму из
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

    1. Разбираем query-string на пары key=value (значения уже decoded).
    2. Убираем поле "hash" — оно не участвует в проверяемой строке.
    3. Сортируем оставшиеся пары по ключу и склеиваем в "key=value\n...".
    4. secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)
    5. computed_hash = HMAC_SHA256(key=secret_key, msg=data_check_string)
    6. Сравниваем computed_hash с присланным hash constant-time функцией
       (hmac.compare_digest), чтобы не давать зацепку для timing-атаки.
    """
    pairs = parse_qsl(init_data_raw, keep_blank_values=True)
    data = dict(pairs)

    received_hash = data.pop("hash", None)
    if not received_hash:
        raise InitDataValidationError("Отсутствует поле hash")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise InitDataValidationError("Подпись initData не совпадает")

    auth_date = int(data.get("auth_date", 0))
    if time.time() - auth_date > max_age_seconds:
        raise InitDataValidationError("initData устарела (возможна replay-атака)")

    user_raw = data.get("user")
    if not user_raw:
        raise InitDataValidationError("Отсутствует поле user")

    try:
        user_dict = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise InitDataValidationError("Поле user повреждено") from exc

    return InitData(
        user=TelegramUser(**user_dict),
        auth_date=auth_date,
        query_id=data.get("query_id"),
        chat_instance=data.get("chat_instance"),
        chat_type=data.get("chat_type"),
    )
