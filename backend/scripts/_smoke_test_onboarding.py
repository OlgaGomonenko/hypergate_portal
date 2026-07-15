"""Одноразовый сквозной тест эндпоинтов онбординга через реальную таблицу. Не часть
приложения — запускается вручную и подчищает за собой тестовую строку по tg_id."""

import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

from fastapi.testclient import TestClient

from app.config import settings
from app.integrations.google_sheets import _find_row, _get_worksheet
from app.main import app

TEST_TG_ID = 123123123
BOT_TOKEN = settings.telegram_bot_token.get_secret_value()


def build_init_data(user: dict) -> str:
    data = {"user": json.dumps(user, separators=(",", ":")), "auth_date": str(int(time.time()))}
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    data["hash"] = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)


def cleanup():
    for name in ["users", "onboarding_progress"]:
        ws = _get_worksheet(name)
        found = _find_row(ws, "tg_id", TEST_TG_ID)
        if found:
            ws.delete_rows(found[0])
            print(f"[cleanup] {name}: тестовая строка удалена")


def main():
    client = TestClient(app)
    headers = {"Authorization": f"tma {build_init_data({'id': TEST_TG_ID, 'first_name': 'Test', 'username': 'smoke_test'})}"}

    try:
        r = client.get("/api/onboarding/tax-values")
        assert r.status_code == 200, r.text
        print("[1] tax-values:", r.json())

        r = client.get("/api/onboarding/me", headers=headers)
        assert r.status_code == 200 and r.json()["user"] is None, r.text
        print("[2] me (до онбординга): user is None — OK")

        r = client.post(
            "/api/onboarding/profile",
            headers=headers,
            json={"email": "smoke@example.com", "region": "MO", "income_monthly": "300000"},
        )
        assert r.status_code == 200, r.text
        print("[3] profile submit:", r.json())
        assert r.json()["tax_value_recommended"] == "usn_patent", "рекомендация для MO/300000 должна быть usn_patent"

        r = client.get("/api/onboarding/me", headers=headers)
        assert r.status_code == 200 and r.json()["user"]["email"] == "smoke@example.com", r.text
        print("[4] me (после профиля):", r.json())

        r = client.post("/api/onboarding/tax-regime", headers=headers, json={"tax_value_fact": "usn"})
        assert r.status_code == 200, r.text
        print("[5] tax-regime confirm:", r.json())

        r = client.get("/api/onboarding/me", headers=headers)
        body = r.json()
        assert body["user"]["tax_value_fact"] == "usn", "tax_value_fact должен сохраниться"
        assert body["user"]["email"] == "smoke@example.com", "email не должен был затереться при confirm_tax_regime"
        assert body["progress"]["tax_status"] == "active", "tax_status должен стать active"
        print("[6] me (финал, email уцелел + tax_status active):", body)

        bad_headers = {"Authorization": "tma broken"}
        r = client.get("/api/onboarding/me", headers=bad_headers)
        assert r.status_code == 401, r.text
        print("[7] невалидная подпись -> 401: OK")

        r = client.post("/api/onboarding/profile", headers=headers, json={"email": "x@x.com", "region": "Narnia", "income_monthly": "1"})
        assert r.status_code == 422, r.text
        print("[8] невалидный регион -> 422: OK")

        print("\nВСЁ ПРОШЛО УСПЕШНО")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
