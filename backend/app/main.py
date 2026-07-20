import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.knowledge import router as knowledge_router
from app.api.onboarding import router as onboarding_router
from app.api.routes import router
from app.config import settings

app = FastAPI(title="Hypergate Contractor Portal API")

if settings.allow_dev_auth_bypass:
    logging.warning(
        "!!! ALLOW_DEV_AUTH_BYPASS=true !!! Проверка подписи Telegram InitData ОТКЛЮЧЕНА "
        "(схема 'Authorization: dev <tg_id>:<username>' принимается без проверки). "
        "Только для локальной демонстрации — на проде эта переменная должна отсутствовать."
    )

# Явный allow-list доменов вместо allow_origins=["*"]: с allow_credentials=True
# браузер (и спецификация CORS) в принципе запрещают комбинировать "*" с credentials,
# а нам credentials не нужны (авторизация идёт через заголовок Authorization, не cookie).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(onboarding_router)
app.include_router(knowledge_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    # Некоторые платформы (напр. Replit Deployments) шлют healthcheck на "/",
    # а не на "/health" — без этого маршрута они получали бы 404/500 и считали
    # деплой нездоровым, даже когда сам сервер работает нормально.
    return {"status": "ok"}
