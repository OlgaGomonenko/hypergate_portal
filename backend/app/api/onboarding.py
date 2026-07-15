from fastapi import APIRouter, Depends, HTTPException, status

from app.api.schemas import (
    ActivationRequest,
    ChangeRegimeRequest,
    OnboardingProfileRequest,
    TaxRegimeChoiceRequest,
)
from app.auth.dependencies import get_current_init_data
from app.auth.telegram import InitData
from app.repositories import onboarding_progress as onboarding_progress_repo
from app.repositories import step_tax_value as step_tax_value_repo
from app.repositories import tax_values as tax_values_repo
from app.repositories import users as users_repo
from app.services.tax_recommendation import recommend_tax_regime

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


def _activation_status(activated: bool) -> str:
    return onboarding_progress_repo.ACTIVE if activated else onboarding_progress_repo.NOT_ACTIVE


async def _require_active_user(tg_id: int) -> dict:
    """Шаги 4-6 (счёт/Kleos/Эльба) пишут в onboarding_progress по code_td_id —
    он берётся только из активной записи users, так что без неё им некуда писать."""
    user = await users_repo.get_active_user(tg_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Сначала заполните профиль: POST /api/onboarding/profile",
        )
    return user


@router.get("/tax-values")
async def get_tax_values():
    """Справочник режимов (id + человекочитаемое имя) — не требует авторизации,
    это не персональные данные, просто статичный список опций для формы."""
    return await tax_values_repo.list_tax_values()


@router.get("/step-tax-value/{tax_value_id}")
async def get_step_tax_value(tax_value_id: str):
    """Подробный алгоритм регистрации для конкретного режима (шаг 2 онбординга) —
    статичный справочный контент, авторизация не нужна."""
    row = await step_tax_value_repo.get_step_text(tax_value_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Нет описания для этого режима")
    return row


@router.get("/me")
async def get_my_onboarding(init_data: InitData = Depends(get_current_init_data)):
    """Текущий профиль (активная запись — см. code_td_id) и статусы активации.
    tg_id берём из проверенной InitData, не из query/пути запроса, иначе один
    пользователь мог бы читать чужой профиль."""
    tg_id = init_data.user.id
    user = await users_repo.get_active_user(tg_id)
    progress = await onboarding_progress_repo.get_progress(user["code_td_id"]) if user else None
    return {"user": user, "progress": progress}


@router.get("/regime-history")
async def get_regime_history(init_data: InitData = Depends(get_current_init_data)):
    """История всех налоговых режимов пользователя (для раздела профиля
    «Смена налогового режима») — активная запись и все закрытые, по порядку."""
    return await users_repo.get_user_history(init_data.user.id)


@router.post("/profile")
async def submit_profile(
    body: OnboardingProfileRequest,
    init_data: InitData = Depends(get_current_init_data),
):
    """
    Первый шаг онбординга: контрактор указывает email/регион/доход. Мы сразу
    считаем рекомендацию режима (services.tax_recommendation) и сохраняем её
    в АКТИВНУЮ запись пользователя — tax_value_fact подтвердит отдельным шагом
    (POST /tax-regime), рекомендация может отличаться от того, что он выберет.
    Если активной записи ещё нет вообще — создаётся первая (code_td_id=1_<tg_id>).
    """
    recommendation = recommend_tax_regime(body.income_monthly, body.region.value)

    await users_repo.upsert_active_user(
        tg_id=init_data.user.id,
        tg_username=init_data.user.username,
        email=body.email,
        region=body.region.value,
        income_monthly=str(body.income_monthly),
        tax_value_recommended=recommendation.tax_value_id or "",
    )

    return {
        "tax_value_recommended": recommendation.tax_value_id,
        "warning": recommendation.warning,
    }


@router.post("/tax-regime")
async def confirm_tax_regime(
    body: TaxRegimeChoiceRequest,
    init_data: InitData = Depends(get_current_init_data),
):
    """Второй шаг: пользователь подтверждает фактический режим (может не совпадать
    с рекомендацией) и указывает дату регистрации вручную — от неё считаются сроки
    уведомлений, а заполнять это в портале необязательно ровно в день регистрации."""
    tg_id = init_data.user.id
    user = await _require_active_user(tg_id)

    date_active = body.date_active.isoformat()
    await users_repo.upsert_active_user(tg_id=tg_id, tax_value_fact=body.tax_value_fact.value, date_active=date_active)
    await onboarding_progress_repo.upsert_progress(user["code_td_id"], tg_id, tax_status=onboarding_progress_repo.ACTIVE)

    return {"tax_value_fact": body.tax_value_fact.value, "date_active": date_active}


@router.post("/bank-account")
async def set_bank_account_status(
    body: ActivationRequest,
    init_data: InitData = Depends(get_current_init_data),
):
    """Шаг «Открытие расчётного счёта» — просто отмечает, открыт счёт или нет
    (рекомендация — Контур.Банк, но мы не проверяем это, только фиксируем ответ)."""
    tg_id = init_data.user.id
    user = await _require_active_user(tg_id)
    await onboarding_progress_repo.upsert_progress(
        user["code_td_id"], tg_id, bank_account_status=_activation_status(body.activated)
    )
    return {"bank_account_status": _activation_status(body.activated)}


@router.post("/kleos")
async def set_kleos_status(
    body: ActivationRequest,
    init_data: InitData = Depends(get_current_init_data),
):
    tg_id = init_data.user.id
    user = await _require_active_user(tg_id)
    await onboarding_progress_repo.upsert_progress(
        user["code_td_id"], tg_id, kleos_status=_activation_status(body.activated)
    )
    return {"kleos_status": _activation_status(body.activated)}


@router.post("/elba")
async def set_elba_status(
    body: ActivationRequest,
    init_data: InitData = Depends(get_current_init_data),
):
    tg_id = init_data.user.id
    user = await _require_active_user(tg_id)
    await onboarding_progress_repo.upsert_progress(
        user["code_td_id"], tg_id, elba_status=_activation_status(body.activated)
    )
    return {"elba_status": _activation_status(body.activated)}


@router.post("/change-regime")
async def change_regime(
    body: ChangeRegimeRequest,
    init_data: InitData = Depends(get_current_init_data),
):
    """
    Смена налогового режима (раздел профиля «Смена налогового режима»):
    закрывает текущую активную запись (tax_value_status=noactive, дата закрытия
    — вводит пользователь вручную, от неё зависит, с какого момента фактически
    действует новый режим) и создаёт новую, полностью чистую — email/регион/
    доход/режим не переносятся, пользователь проходит онбординг заново с шага 1.
    """
    tg_id = init_data.user.id
    current = await _require_active_user(tg_id)  # нельзя "сменить" то, чего не было

    date_inactive = body.date_inactive.isoformat()
    if current.get("date_active") and date_inactive < current["date_active"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Дата закрытия не может быть раньше даты открытия текущего режима",
        )

    code_td_id = await users_repo.start_new_regime(tg_id, init_data.user.username, date_inactive=date_inactive)
    return {"code_td_id": code_td_id}
