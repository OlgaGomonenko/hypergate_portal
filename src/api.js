const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ТОЛЬКО для локальной демонстрации без Telegram — требует, чтобы бэкенд тоже
// был поднят с ALLOW_DEV_AUTH_BYPASS=true (по умолчанию выключено). См. App.jsx —
// в этом режиме сверху всегда показан явный баннер, чтобы не спутать с настоящей
// защищённой версией.
export const IS_DEV_AUTH = import.meta.env.VITE_DEV_AUTH === "true";

function getDevIdentity() {
  // tg_id генерируется один раз и живёт в localStorage — так демо-профиль не
  // сбрасывается при каждом обновлении страницы, но легко сбросить через очистку
  // localStorage, если нужно начать онбординг заново.
  let tgId = localStorage.getItem("demo_tg_id");
  if (!tgId) {
    tgId = String(900000000 + Math.floor(Math.random() * 99999999));
    localStorage.setItem("demo_tg_id", tgId);
  }
  return { tgId, username: "demo_user" };
}

function getAuthHeader() {
  if (IS_DEV_AUTH) {
    const { tgId, username } = getDevIdentity();
    return `dev ${tgId}:${username}`;
  }
  // Вне Telegram (обычный браузер, без dev-режима) initData пустая — бэкенд
  // ответит 401, это ожидаемо: без Telegram нет способа доказать, кто ты.
  const initData = window.Telegram?.WebApp?.initData || "";
  return `tma ${initData}`;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    throw new Error(detail || `Ошибка запроса (${res.status})`);
  }
  return res.json();
}

const activation = (path) => (activated) =>
  apiFetch(path, { method: "POST", body: JSON.stringify({ activated }) });

export const api = {
  getTaxValues: () => apiFetch("/api/onboarding/tax-values"),
  getStepTaxValue: (taxValueId) => apiFetch(`/api/onboarding/step-tax-value/${taxValueId}`),
  getMe: () => apiFetch("/api/onboarding/me"),
  submitProfile: (data) =>
    apiFetch("/api/onboarding/profile", { method: "POST", body: JSON.stringify(data) }),
  confirmTaxRegime: (taxValueFact, dateActive) =>
    apiFetch("/api/onboarding/tax-regime", {
      method: "POST",
      body: JSON.stringify({ tax_value_fact: taxValueFact, date_active: dateActive }),
    }),
  setBankAccount: activation("/api/onboarding/bank-account"),
  setKleos: activation("/api/onboarding/kleos"),
  setElba: activation("/api/onboarding/elba"),
  changeRegime: (dateInactive) =>
    apiFetch("/api/onboarding/change-regime", {
      method: "POST",
      body: JSON.stringify({ date_inactive: dateInactive }),
    }),
  getRegimeHistory: () => apiFetch("/api/onboarding/regime-history"),
};
