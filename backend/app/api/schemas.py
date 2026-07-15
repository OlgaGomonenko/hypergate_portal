from datetime import date
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator


class Region(str, Enum):
    MOSKOW = "Moskow"
    MO = "MO"
    OTHERS = "Others"


class TaxValueId(str, Enum):
    USN = "usn"
    USN_PATENT = "usn_patent"
    AUSN = "ausn"
    SELFMANAGER = "selfmanager"


class OnboardingProfileRequest(BaseModel):
    email: EmailStr
    region: Region
    income_monthly: Decimal = Field(gt=0)


class TaxRegimeChoiceRequest(BaseModel):
    tax_value_fact: TaxValueId
    # Дата регистрации ИП/самозанятости — вводит сам пользователь, а не "сегодня":
    # от неё считаются сроки уведомлений (например, 30 дней на переход на УСН),
    # и заполнять это в портале могут не в день самой регистрации.
    date_active: date

    @field_validator("date_active")
    @classmethod
    def not_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Дата регистрации не может быть в будущем")
        return value


class ActivationRequest(BaseModel):
    """Общее тело для простых toggle-шагов: открыт счёт? / активирован Kleos? / Эльба?"""

    activated: bool


class ChangeRegimeRequest(BaseModel):
    # Дата закрытия предыдущего режима — тоже вводится вручную, а не "сегодня":
    # от неё зависит, с какого момента фактически действует новый режим
    # (и, соответственно, с какой даты считать его уведомления).
    date_inactive: date

    @field_validator("date_inactive")
    @classmethod
    def not_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Дата закрытия режима не может быть в будущем")
        return value
