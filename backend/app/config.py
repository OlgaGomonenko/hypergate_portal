from typing import Annotated

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    telegram_bot_token: SecretStr
    # NoDecode: без этого pydantic-settings пытается распарсить значение как JSON
    # (т.к. поле — list) раньше, чем сработает наш валидатор split_origins ниже.
    allowed_origins: Annotated[list[str], NoDecode] = []
    init_data_max_age_seconds: int = 86400
    env: str = "development"

    # ТОЛЬКО для локальной демонстрации без настоящего Telegram: позволяет вместо
    # проверки подписи InitData принять заголовок "Authorization: dev <tg_id>:<username>".
    # По умолчанию False — намеренно НЕ завязано на env == "development": если это
    # проверять через env, забытый/неверно выставленный ENV на проде оставил бы дыру
    # в авторизации молча. Так дыра открывается только явным отдельным флагом.
    allow_dev_auth_bypass: bool = False

    # ID таблицы из её URL: https://docs.google.com/spreadsheets/d/<ЭТА_ЧАСТЬ>/edit
    google_spreadsheet_id: str
    # Путь к JSON-ключу сервисного аккаунта Google (см. app/integrations/google_sheets.py).
    # Сам файл в репозиторий не кладём — .gitignore, только путь в .env.
    google_credentials_path: str = "credentials.json"
    # Альтернатива google_credentials_path — содержимое JSON-ключа целиком одной
    # строкой (для хостингов без файловой системы под секреты, напр. Replit:
    # там секрет — это просто переменная окружения, а не загруженный файл).
    # Если задано — имеет приоритет над google_credentials_path.
    google_credentials_json: SecretStr | None = None
    # Белый список (кто может пользоваться порталом) теперь живёт во вкладке
    # allowed_usernames самой Google-таблицы, а не здесь — см.
    # app/repositories/allowed_usernames.py. Так его можно менять прямо в
    # таблице, без пересборки и перезапуска бэкенда.

    # Брокер для Celery (ежедневная рассылка налоговых напоминаний, см.
    # app/celery_app.py). Локально Redis не поднят — бизнес-логику тестируем
    # напрямую (app/services/reminders.py), без живого воркера/брокера;
    # значение нужно только там, где Celery-воркер реально запускается.
    # SecretStr — как и google_credentials_json: на проде в URL часто зашит
    # пароль (redis://user:pass@host:port), не хотим случайно засветить его в логах.
    redis_url: SecretStr = SecretStr("redis://localhost:6379/0")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
