import time

from fastapi import Header, HTTPException, status

from app.auth.telegram import InitData, InitDataValidationError, TelegramUser, validate_init_data
from app.config import settings
from app.repositories import allowed_usernames as allowed_usernames_repo


async def _check_whitelisted(username: str | None) -> None:
    """
    Белый список — это отдельная проверка ПРАВА доступа, а не подлинности:
    подпись InitData уже подтвердила, что это реальный Telegram-пользователь,
    но пускаем в приложение только тех, чей @username явно разрешён (список —
    вкладка allowed_usernames в Google Sheets, не переменная окружения, чтобы
    можно было управлять без пересборки бэкенда). Пустой username (у части
    аккаунтов Telegram его вообще нет) никогда не пройдёт.
    """
    if not await allowed_usernames_repo.is_allowed(username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ к порталу закрыт для этого аккаунта Telegram",
        )


async def get_current_init_data(authorization: str = Header(...)) -> InitData:
    """
    Ожидает заголовок:  Authorization: tma <init-data-строка-из-Telegram.WebApp.initData>

    Схема "tma" (Telegram Mini Apps) — рекомендация из актуальной документации
    Telegram для передачи initData на бэкенд. Сама initData прилетает с фронта
    как есть (window.Telegram.WebApp.initData), без парсинга на клиенте —
    парсить и проверять подпись обязаны только мы, на сервере.
    """
    scheme, _, token = authorization.partition(" ")

    if settings.allow_dev_auth_bypass and scheme.lower() == "dev":
        # Схема "dev": "Authorization: dev <tg_id>:<username>" — без проверки подписи.
        # Работает только когда ALLOW_DEV_AUTH_BYPASS=true явно выставлен в .env
        # (по умолчанию flag=False, см. app/config.py) — для локальной демонстрации
        # без реального Telegram-клиента.
        tg_id_str, _, username = token.partition(":")
        if not tg_id_str.isdigit():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="dev-режим: заголовок должен быть 'dev <tg_id>:<username>'",
            )
        return InitData(
            user=TelegramUser(id=int(tg_id_str), first_name="Demo", username=username or None),
            auth_date=int(time.time()),
        )

    if scheme.lower() != "tma" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ожидается заголовок Authorization: tma <initData>",
        )

    try:
        init_data = validate_init_data(
            init_data_raw=token,
            bot_token=settings.telegram_bot_token.get_secret_value(),
            max_age_seconds=settings.init_data_max_age_seconds,
        )
    except InitDataValidationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    await _check_whitelisted(init_data.user.username)
    return init_data
