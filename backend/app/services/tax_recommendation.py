from dataclasses import dataclass
from decimal import Decimal

REGION_MOSKOW = "Moskow"
REGION_MO = "MO"
REGION_OTHERS = "Others"

# Границы читаем как непересекающиеся, без промежутка: "менее X" -> income < X,
# "свыше X" -> income >= X. Так у каждого дохода всегда есть ровно один исход
# среди покрытых правил — если формулировку уточнят (например, дадут отдельное
# правило для income == 85000), поменять сравнения именно здесь.
SELF_EMPLOYED_THRESHOLD = Decimal("85000")
# Выше этого дохода в месяц контрактор выходит из лимита освобождения от НДС на
# УСН — независимо от региона, это не region-specific правило, поэтому проверяется
# раньше и перекрывает остальные ветки (в т.ч. Others, для которого явного
# верхнего порога в правилах не было — так уместнее, чем оставить Others без
# предупреждения вообще).
VAT_LIMIT_THRESHOLD = Decimal("1000000")
VAT_LIMIT_WARNING = (
    "При доходе от 1 000 000 руб./мес. вы выходите из лимита освобождения от НДС на УСН. "
    "С этого дохода придётся платить НДС — нужно отдельно рассмотреть альтернативные "
    "варианты оформления, автоматическая рекомендация режима здесь не даётся."
)


@dataclass
class TaxRecommendation:
    tax_value_id: str | None
    warning: str | None = None


def recommend_tax_regime(income_monthly: Decimal, region: str) -> TaxRecommendation:
    """
    Черновая логика подбора режима (tax_value_id из вкладки tax_values) — по ТЗ
    заказчика ожидаются дополнения и правки диапазонов, это первый черновик.

    Правила (как описаны сейчас):
      - доход < 85 000, любой регион      -> selfmanager
      - доход >= 1 000 000, любой регион  -> без рекомендации + огромное предупреждение (см. VAT_LIMIT_WARNING)
      - доход >= 85 000, регион Others    -> usn_patent
      - Moskow,  85 000 <= доход < 1 000 000 -> usn
      - MO,      85 000 <= доход < 1 000 000 -> usn_patent

    НЕ покрыто явным правилом (возвращает tax_value_id=None без предупреждения):
      - неизвестный/пустой регион — не Moskow/MO/Others
      - режим ausn — в этих правилах вообще не встречается, только заведён
        в справочнике tax_values для использования позже
    """
    if income_monthly < SELF_EMPLOYED_THRESHOLD:
        return TaxRecommendation("selfmanager")

    if income_monthly >= VAT_LIMIT_THRESHOLD:
        return TaxRecommendation(None, warning=VAT_LIMIT_WARNING)

    if region == REGION_OTHERS:
        return TaxRecommendation("usn_patent")

    if region == REGION_MOSKOW:
        return TaxRecommendation("usn")

    if region == REGION_MO:
        return TaxRecommendation("usn_patent")

    return TaxRecommendation(None)
