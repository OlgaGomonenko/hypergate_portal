import { useEffect, useState } from "react";
import { api, IS_DEV_AUTH } from "./api";

const PURPLE = "#534AB7";
const PURPLE_LIGHT = "#EEEDFE";
const TEAL = "#1D9E75";
const TEAL_LIGHT = "#E1F5EE";
const AMBER = "#854F0B";
const AMBER_LIGHT = "#FAEEDA";
const RED = "#A32D2D";
const RED_LIGHT = "#FCEBEB";

const categories = [
  { id: "all", label: "Все" },
  { id: "start", label: "С чего начать" },
  { id: "taxes", label: "Налоги" },
  { id: "tools", label: "Инструменты" },
];

const deadlines = [
  { date: "28 июл", label: "Аванс УСН Q2", daysLeft: 7, urgent: true },
  { date: "1 июл", label: "Взнос 1%", daysLeft: -3, overdue: true },
  { date: "28 окт", label: "Аванс УСН Q3", daysLeft: 91 },
  { date: "28 дек", label: "Фикс. взносы", daysLeft: 154 },
];

function Badge({ children, color = PURPLE, bg = PURPLE_LIGHT }) {
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 16,
      padding: "14px 16px", cursor: onClick ? "pointer" : "default", ...style
    }}>{children}</div>
  );
}

function DeadlineCard({ item }) {
  const color = item.overdue ? RED : item.urgent ? AMBER : TEAL;
  const bg = item.overdue ? RED_LIGHT : item.urgent ? AMBER_LIGHT : TEAL_LIGHT;
  const label = item.overdue ? "просрочен" : `${item.daysLeft} дн.`;
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 1 }}>{item.date}</div>
      </div>
      <Badge color={color} bg={bg}>{label}</Badge>
    </Card>
  );
}

function ContentBlock({ block }) {
  if (block.type === "text") return <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{block.text}</p>;
  if (block.type === "warning") return (
    <div style={{ background: AMBER_LIGHT, border: `0.5px solid #FAC775`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10 }}>
      <i className="ti ti-alert-triangle" style={{ color: AMBER, fontSize: 16, flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 13, color: "#633806", lineHeight: 1.5, margin: 0 }}>{block.text}</p>
    </div>
  );
  if (block.type === "tip") return (
    <div style={{ background: TEAL_LIGHT, border: `0.5px solid #9FE1CB`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10 }}>
      <i className="ti ti-bulb" style={{ color: TEAL, fontSize: 16, flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 13, color: "#085041", lineHeight: 1.5, margin: 0 }}>{block.text}</p>
    </div>
  );
  if (block.type === "steps") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {block.items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: PURPLE_LIGHT, color: PURPLE, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginTop: 2, lineHeight: 1.5 }}>{item.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
  if (block.type === "danger-list") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {block.items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, background: RED_LIGHT, borderRadius: 10, padding: "10px 12px" }}>
          <i className="ti ti-x" style={{ color: RED, fontSize: 14, flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: "#791F1F", lineHeight: 1.5, margin: 0 }}>{item}</p>
        </div>
      ))}
    </div>
  );
  if (block.type === "events") return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {block.items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < block.items.length - 1 ? "0.5px solid rgba(0,0,0,0.08)" : "none" }}>
          <div style={{ fontSize: 12, color: PURPLE, fontWeight: 500, minWidth: 80 }}>{item.date}</div>
          <div style={{ flex: 1, fontSize: 13 }}>{item.label}</div>
          <Badge>{item.regime}</Badge>
        </div>
      ))}
    </div>
  );
  if (block.type === "table") return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "0.5px solid rgba(0,0,0,0.08)" }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 300 }}>
        <thead><tr style={{ background: PURPLE_LIGHT }}>
          {block.headers.map((h, i) => <th key={i} style={{ padding: "8px 10px", textAlign: "left", color: PURPLE, fontWeight: 500 }}>{h}</th>)}
        </tr></thead>
        <tbody>{block.rows.map((row, i) => (
          <tr key={i} style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)", background: i % 2 ? "rgba(0,0,0,0.02)" : "transparent" }}>
            {row.map((cell, j) => <td key={j} style={{ padding: "8px 10px", color: j === 0 ? "rgba(0,0,0,0.5)" : "#000", fontWeight: j === 0 ? 500 : 400 }}>{cell}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
  if (block.type === "image") return (
    <figure style={{ margin: 0 }}>
      <img src={api.imageUrl(block.src)} alt={block.alt} style={{ width: "100%", borderRadius: 12, display: "block" }} />
      {block.alt && <figcaption style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", marginTop: 6, textAlign: "center" }}>{block.alt}</figcaption>}
    </figure>
  );
  return null;
}

function ArticleView({ articleId, onBack }) {
  const [article, setArticle] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setArticle(null);
    setError(null);
    api.getArticle(articleId)
      .then(data => { if (!cancelled) setArticle(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [articleId]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
        </button>
        {article && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{article.title}</div>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>{article.categoryLabel}</div>
          </div>
        )}
      </div>
      {error && <div style={{ textAlign: "center", padding: "32px 0", color: RED, fontSize: 14 }}>{error}</div>}
      {!error && !article && <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(0,0,0,0.35)", fontSize: 14 }}>Загрузка...</div>}
      {article && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {article.content.map((block, i) => <ContentBlock key={i} block={block} />)}
        </div>
      )}
    </div>
  );
}

function HomeScreen({ onNavigate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ background: PURPLE_LIGHT, border: `0.5px solid #AFA9EC` }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#26215C" }}>Добро пожаловать</div>
        <div style={{ fontSize: 13, color: PURPLE, marginTop: 4 }}>Портал контрактора · ИП / УСН</div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#3C3489", lineHeight: 1.6 }}>
          Здесь — всё о налогах, регистрации и дедлайнах. Без звонков бухгалтеру.
        </div>
      </Card>

      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.35)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Ближайшие дедлайны</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {deadlines.slice(0, 2).map((d, i) => <DeadlineCard key={i} item={d} />)}
        </div>
        <button onClick={() => onNavigate("calendar")} style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.1)", background: "transparent", fontSize: 13, color: PURPLE, cursor: "pointer", fontWeight: 500 }}>
          Все дедлайны →
        </button>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.35)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Разделы</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { icon: "ti-list-check", label: "Онбординг", sub: "Регистрация ИП", tab: "onboarding" },
            { icon: "ti-calendar-event", label: "Календарь", sub: "Налоги и взносы", tab: "calendar" },
            { icon: "ti-book", label: "База знаний", sub: "FAQ и гайды", tab: "knowledge" },
            { icon: "ti-user", label: "Профиль", sub: "Режим, Элина, задачи", tab: "profile" },
          ].map(item => (
            <Card key={item.tab} onClick={() => onNavigate(item.tab)}>
              <i className={`ti ${item.icon}`} style={{ fontSize: 22, color: PURPLE, display: "block", marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>{item.sub}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function KnowledgeScreen() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [openArticleId, setOpenArticleId] = useState(null);
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getArticles()
      .then(data => setArticles(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (openArticleId) return <ArticleView articleId={openArticleId} onBack={() => setOpenArticleId(null)} />;

  const filtered = articles.filter(a =>
    (activeCategory === "all" || a.category === activeCategory) &&
    (search === "" || a.title.toLowerCase().includes(search.toLowerCase()) || a.short.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ position: "relative" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "rgba(0,0,0,0.35)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по базе знаний..." style={{ width: "100%", padding: "10px 12px 10px 36px", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 12, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: activeCategory === cat.id ? PURPLE : "rgba(0,0,0,0.07)", color: activeCategory === cat.id ? "#fff" : "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>{cat.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(0,0,0,0.35)", fontSize: 14 }}>Загрузка...</div>}
        {!loading && error && <div style={{ textAlign: "center", padding: "32px 0", color: RED, fontSize: 14 }}>{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(0,0,0,0.35)", fontSize: 14 }}>Ничего не найдено</div>
        )}
        {!loading && !error && filtered.map(a => (
          <Card key={a.id} onClick={() => setOpenArticleId(a.id)} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: PURPLE_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 18, color: PURPLE }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", marginTop: 2 }}>{a.short}</div>
              <div style={{ marginTop: 6 }}><Badge>{a.categoryLabel}</Badge></div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 16, color: "rgba(0,0,0,0.25)", marginTop: 2 }} />
          </Card>
        ))}
      </div>
    </div>
  );
}

function CalendarScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { n: 2, label: "ок", color: TEAL, bg: TEAL_LIGHT },
          { n: 1, label: "срочно", color: AMBER, bg: AMBER_LIGHT },
          { n: 1, label: "просрочен", color: RED, bg: RED_LIGHT },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: s.color }}>{s.n}</div>
            <div style={{ fontSize: 11, color: s.color, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {deadlines.map((d, i) => <DeadlineCard key={i} item={d} />)}
      </div>
      <Card style={{ background: PURPLE_LIGHT, border: `0.5px solid #AFA9EC` }}>
        <div style={{ fontSize: 13, color: "#26215C", fontWeight: 500, marginBottom: 4 }}>
          <i className="ti ti-bell" style={{ marginRight: 6 }} /> Напоминания в Telegram
        </div>
        <div style={{ fontSize: 12, color: "#534AB7", lineHeight: 1.5 }}>
          Бот пришлёт пуш за 7 и 1 день до каждого дедлайна.
        </div>
      </Card>
    </div>
  );
}

const REGION_OPTIONS = [
  { value: "Moskow", label: "Москва" },
  { value: "MO", label: "Московская обл." },
  { value: "Others", label: "Другие" },
];

const inputStyle = { padding: "9px 12px", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box" };

function taxValueName(id, taxValues) {
  return taxValues.find(v => v.tax_value_id === id)?.tax_value_name || id;
}

// Бэкенд отдаёт дату в ISO (YYYY-MM-DD — удобно для сортировки/сравнения),
// на фронте показываем в привычном для пользователя формате дд.мм.гггг.
function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

function ErrorNote({ error }) {
  if (!error) return null;
  return <div style={{ fontSize: 12, color: RED, background: RED_LIGHT, padding: "8px 10px", borderRadius: 8, marginBottom: 10 }}>{error}</div>;
}

function StatusToggle({ activated, onToggle, submitting, label }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button
        onClick={() => onToggle(true)}
        disabled={submitting}
        style={{ flex: 1, padding: "9px 0", background: activated === true ? TEAL : "rgba(0,0,0,0.06)", color: activated === true ? "#fff" : "#000", border: "none", borderRadius: 10, fontSize: 13, fontWeight: activated === true ? 500 : 400, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
      >
        {label.yes}
      </button>
      <button
        onClick={() => onToggle(false)}
        disabled={submitting}
        style={{ flex: 1, padding: "9px 0", background: activated === false ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.06)", color: activated === false ? "#fff" : "#000", border: "none", borderRadius: 10, fontSize: 13, fontWeight: activated === false ? 500 : 400, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
      >
        {label.no}
      </button>
    </div>
  );
}

// Шаг 1 — подбор режима: контрактор вводит почту/регион/доход, получает
// рекомендацию (или огромное предупреждение про лимит НДС) заметной плашкой.
function Step1TaxRecommendation({ me, taxValues, onChanged }) {
  const [email, setEmail] = useState(me?.user?.email || "");
  const [region, setRegion] = useState(me?.user?.region || "Moskow");
  const [income, setIncome] = useState(me?.user?.income_monthly ? String(me.user.income_monthly) : "");
  // Рекомендация приходит либо из ответа POST /profile (только что посчитали),
  // либо уже лежит в профиле с прошлого захода — второе не даёт заново увидеть
  // предупреждение по НДС (оно не сохраняется), но саму рекомендацию покажет.
  const [recommendation, setRecommendation] = useState(
    me?.user?.tax_value_recommended ? { tax_value_id: me.user.tax_value_recommended, warning: null } : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitProfile({ email, region, income_monthly: income });
      // Бэкенд отдаёт { tax_value_recommended, warning } — приводим к внутренней
      // форме { tax_value_id, warning }, которую использует остальной компонент.
      setRecommendation({ tax_value_id: res.tax_value_recommended, warning: res.warning });
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <ErrorNote error={error} />
      <input type="email" placeholder="Рабочая почта" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
      <select value={region} onChange={e => setRegion(e.target.value)} style={inputStyle}>
        {REGION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <input type="number" placeholder="Прогнозируемый доход в месяц, ₽" value={income} onChange={e => setIncome(e.target.value)} style={inputStyle} />
      <button
        onClick={submit}
        disabled={submitting || !email || !income}
        style={{ padding: "9px 0", background: PURPLE, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: submitting || !email || !income ? 0.5 : 1 }}
      >
        {submitting ? "Считаем..." : recommendation ? "Пересчитать" : "Подобрать режим"}
      </button>

      {recommendation?.warning && (
        <div style={{ background: RED_LIGHT, border: "0.5px solid #F0B4B4", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10 }}>
          <i className="ti ti-alert-triangle" style={{ color: RED, fontSize: 22, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#791F1F", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{recommendation.warning}</p>
        </div>
      )}
      {recommendation?.tax_value_id && !recommendation.warning && (
        <div style={{ background: PURPLE_LIGHT, border: "0.5px solid #AFA9EC", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: PURPLE, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 500 }}>Рекомендуемый режим</div>
          <div style={{ fontSize: 18, color: "#26215C", fontWeight: 600, marginTop: 4 }}>{taxValueName(recommendation.tax_value_id, taxValues)}</div>
        </div>
      )}
    </div>
  );
}

// Шаг 2 — подробный алгоритм регистрации под рекомендованный на шаге 1 режим
// (контент из вкладки step_tax_value, не хардкод — правится без деплоя фронта).
function Step2RegistrationGuide({ me }) {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const taxValueId = me?.user?.tax_value_recommended;

  useEffect(() => {
    if (!taxValueId) return;
    setLoading(true);
    setError(null);
    api.getStepTaxValue(taxValueId)
      .then(setGuide)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [taxValueId]);

  if (!taxValueId) {
    return <div style={{ marginTop: 12, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>Сначала пройдите шаг 1 — подбор режима.</div>;
  }
  return (
    <div style={{ marginTop: 12 }}>
      <ErrorNote error={error} />
      {loading ? (
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>Загрузка...</div>
      ) : guide ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: PURPLE }}>{guide.tax_value_name}</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(0,0,0,0.75)", margin: 0 }}>{guide.tax_step_txt}</p>
        </>
      ) : null}
    </div>
  );
}

// Шаг 3 — фактически выбранный режим (может не совпасть с рекомендацией шага 1).
function Step3TaxRegimeFact({ me, taxValues, onChanged }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [dateActive, setDateActive] = useState("");
  const recommendedId = me?.user?.tax_value_recommended;
  const isDone = Boolean(me?.user?.tax_value_fact);
  const today = new Date().toISOString().slice(0, 10);

  const confirm = async (taxValueId) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.confirmTaxRegime(taxValueId, dateActive);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div style={{ marginTop: 12, fontSize: 12, color: TEAL }}>
        Режим подтверждён: <b>{taxValueName(me.user.tax_value_fact, taxValues)}</b> (с {formatDate(me.user.date_active)})
      </div>
    );
  }
  if (!recommendedId) {
    return <div style={{ marginTop: 12, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>Сначала пройдите шаг 1 — подбор режима.</div>;
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <ErrorNote error={error} />
      <div>
        {/* Дата вводится вручную, а не берётся как "сегодня" — от неё считаются
            сроки уведомлений (например, 30 дней на переход на УСН), а заполнять
            это в портале необязательно ровно в день самой регистрации в ФНС. */}
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginBottom: 6 }}>Дата регистрации ИП/самозанятости</div>
        <input type="date" value={dateActive} max={today} onChange={e => setDateActive(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)" }}>Какой режим фактически оформили?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {taxValues.map(v => (
          <button
            key={v.tax_value_id}
            onClick={() => confirm(v.tax_value_id)}
            disabled={submitting || !dateActive}
            style={{ flex: "1 0 45%", padding: "9px 0", background: v.tax_value_id === recommendedId ? PURPLE : "rgba(0,0,0,0.06)", color: v.tax_value_id === recommendedId ? "#fff" : "#000", border: "none", borderRadius: 10, fontSize: 12, cursor: "pointer", opacity: submitting || !dateActive ? 0.5 : 1 }}
          >
            {v.tax_value_name}
          </button>
        ))}
      </div>
    </div>
  );
}

// Шаги 4-6 — простые toggle-статусы (открыт счёт? / активирован Kleos? / Эльба?),
// у всех одна форма: рекомендация текстом + StatusToggle, пишут в onboarding_progress.
function Step4BankAccount({ progress, onChanged }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const status = progress?.bank_account_status;

  const toggle = async (activated) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.setBankAccount(activated);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <ErrorNote error={error} />
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "rgba(0,0,0,0.75)" }}>
        Рекомендуем открыть счёт в <b>Контур.Банке</b> — бесплатное открытие и обслуживание для ИП, банк сам подаёт документы в ФНС.
      </p>
      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginTop: 8 }}>Счёт уже открыт?</div>
      <StatusToggle
        activated={status === "active" ? true : status === "no_active" ? false : null}
        onToggle={toggle}
        submitting={submitting}
        label={{ yes: "Да, открыт", no: "Ещё нет" }}
      />
    </div>
  );
}

function Step5Kleos({ progress, onChanged }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const status = progress?.kleos_status;

  const toggle = async (activated) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.setKleos(activated);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <ErrorNote error={error} />
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "rgba(0,0,0,0.75)" }}>
        Завершите активацию в личном кабинете Kleos.
      </p>
      <StatusToggle
        activated={status === "active" ? true : status === "no_active" ? false : null}
        onToggle={toggle}
        submitting={submitting}
        label={{ yes: "Активировано", no: "Ещё нет" }}
      />
    </div>
  );
}

function Step6Elba({ progress, onChanged }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const status = progress?.elba_status;

  const toggle = async (activated) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.setElba(activated);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <ErrorNote error={error} />
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "rgba(0,0,0,0.75)" }}>
        Рекомендуем зарегистрироваться на платформе <b>Контур.Эльба</b> — новым ИП первый год бесплатно.{" "}
        <a href="https://www.b-kontur.ru/elba" target="_blank" rel="noreferrer" style={{ color: PURPLE }}>Перейти на сайт →</a>
      </p>
      <StatusToggle
        activated={status === "active" ? true : status === "no_active" ? false : null}
        onToggle={toggle}
        submitting={submitting}
        label={{ yes: "Зарегистрировался", no: "Ещё нет" }}
      />
    </div>
  );
}

function OnboardingScreen() {
  const [me, setMe] = useState(null);
  const [taxValues, setTaxValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = async () => {
    try {
      const [meRes, taxValuesRes] = await Promise.all([api.getMe(), api.getTaxValues()]);
      setMe(meRes);
      setTaxValues(taxValuesRes);
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(0,0,0,0.4)", fontSize: 14 }}>Загрузка...</div>;
  }

  const progress = me?.progress;
  // Самозанятым (НПД) не нужен ни отдельный расчётный счёт, ни Эльба — это
  // инструменты для ИП. Смотрим сначала на подтверждённый факт-режим, а пока
  // его нет — на рекомендацию (иначе шаги мелькали бы то показываясь, то нет,
  // между шагом 1 и подтверждением на шаге 3).
  const effectiveRegime = me?.user?.tax_value_fact || me?.user?.tax_value_recommended;
  const isSelfEmployed = effectiveRegime === "selfmanager";

  const allSteps = [
    {
      key: "recommend", label: "Подбор налогового режима", desc: "Введите доход и регион",
      done: Boolean(me?.user?.tax_value_recommended),
      render: () => <Step1TaxRecommendation me={me} taxValues={taxValues} onChanged={load} />,
    },
    {
      key: "guide", label: "Регистрация самозанятости / ИП", desc: "Алгоритм по вашему режиму",
      done: Boolean(me?.user?.tax_value_recommended),
      render: () => <Step2RegistrationGuide me={me} />,
    },
    {
      key: "fact", label: "Налоговый режим", desc: "Подтвердите фактический режим",
      done: Boolean(me?.user?.tax_value_fact),
      render: () => <Step3TaxRegimeFact me={me} taxValues={taxValues} onChanged={load} />,
    },
    {
      key: "bank", label: "Открытие расчётного счёта", desc: "Рекомендуем Контур.Банк",
      done: progress?.bank_account_status === "active",
      render: () => <Step4BankAccount progress={progress} onChanged={load} />,
      skip: isSelfEmployed,
    },
    {
      key: "kleos", label: "Активация Kleos", desc: "Личный кабинет Kleos",
      done: progress?.kleos_status === "active",
      render: () => <Step5Kleos progress={progress} onChanged={load} />,
    },
    {
      key: "elba", label: "Активация Эльбы", desc: "Контур.Эльба",
      done: progress?.elba_status === "active",
      render: () => <Step6Elba progress={progress} onChanged={load} />,
      skip: isSelfEmployed,
    },
  ];

  // Убираем неприменимые шаги и нумеруем заново по порядку (1,2,3... без дыр) —
  // иначе у самозанятых после шага 3 сразу шёл бы "шаг 5" без объяснений.
  const steps = allSteps.filter(s => !s.skip).map((s, i) => ({ ...s, number: i + 1 }));

  // "Текущий" шаг — первый не завершённый по порядку.
  const firstNotDone = steps.findIndex(s => !s.done);
  steps.forEach((s, i) => { s.active = i === firstNotDone; });

  const done = steps.filter(s => s.done).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {loadError && (
        <div style={{ background: RED_LIGHT, borderRadius: 12, padding: "12px 14px", fontSize: 12, color: RED }}>
          Не удалось связаться с сервером: {loadError}
        </div>
      )}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Прогресс</div>
          <div style={{ fontSize: 13, color: PURPLE, fontWeight: 500 }}>{done}/{steps.length}</div>
        </div>
        <div style={{ height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(done / steps.length) * 100}%`, background: PURPLE, borderRadius: 3 }} />
        </div>
      </Card>
      {steps.map(step => (
        <Card key={step.key} style={step.active ? { border: `1.5px solid ${PURPLE}` } : {}}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, background: step.done ? TEAL_LIGHT : step.active ? PURPLE_LIGHT : "rgba(0,0,0,0.06)", color: step.done ? TEAL : step.active ? PURPLE : "rgba(0,0,0,0.3)" }}>
              {step.done ? <i className="ti ti-check" style={{ fontSize: 14 }} /> : step.number}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: step.done ? "rgba(0,0,0,0.4)" : "#000" }}>{step.label}</div>
              <div style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", marginTop: 1 }}>{step.desc}</div>
            </div>
            {step.active && <div style={{ fontSize: 11, background: PURPLE, color: "#fff", padding: "3px 8px", borderRadius: 20 }}>сейчас</div>}
            {step.done && <i className="ti ti-circle-check" style={{ color: TEAL, fontSize: 18 }} />}
          </div>
          {step.render()}
        </Card>
      ))}
    </div>
  );
}

// Элина теперь отдельный Telegram-бот (не встроенный чат в мини-аппе) —
// вкладка "Профиль" просто открывает его. Реальный @username бота (не выдумка —
// проверил через Bot API getMe с токеном из проекта hr-bot Elina).
const ELINA_BOT_URL = "https://t.me/hyp_hr_bot";

// Черновой список задач — модель данных и бэкенд для задач обсудим отдельно,
// это только заготовка структуры экрана. Статусы пока не сохраняются.
const PLACEHOLDER_TASKS = [
  { id: 1, title: "Отчитаться за командировку", desc: "Загрузите чеки и краткий отчёт" },
  { id: 2, title: "Предоставить документы на выплату", desc: "Акт и счёт за прошедший месяц" },
];

function BackHeader({ title, subtitle, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <button onClick={onBack} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
      </button>
      <div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function ElinaSubScreen({ onBack }) {
  const openElina = () => {
    // openTelegramLink — штатный способ открыть другого бота из Mini App, не
    // покидая Telegram полностью; вне Telegram (dev-режим) просто новая вкладка.
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(ELINA_BOT_URL);
    } else {
      window.open(ELINA_BOT_URL, "_blank");
    }
  };

  return (
    <div>
      <BackHeader title="Элина" subtitle="HR-ассистент" onBack={onBack} />
      <Card style={{ textAlign: "center", padding: "24px 16px" }}>
        <i className="ti ti-robot" style={{ fontSize: 32, color: PURPLE, display: "block", marginBottom: 10 }} />
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Элина — HR-ассистент</div>
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginBottom: 16 }}>
          Вопросы по налогам, оформлению и работе — отдельным чат-ботом в Telegram.
        </div>
        <button onClick={openElina} style={{ padding: "10px 20px", background: PURPLE, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          Открыть бота Элину
        </button>
      </Card>
    </div>
  );
}

function TaskCard({ task, done, onToggle }) {
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={onToggle}
        style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, border: done ? "none" : "1.5px solid rgba(0,0,0,0.2)", background: done ? TEAL : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        {done && <i className="ti ti-check" style={{ fontSize: 14, color: "#fff" }} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: done ? "rgba(0,0,0,0.4)" : "#000", textDecoration: done ? "line-through" : "none" }}>
          {task.title}
        </div>
        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>{task.desc}</div>
      </div>
    </Card>
  );
}

function TasksSubScreen({ onBack }) {
  // Черновой список задач — модель данных и бэкенд для задач обсудим отдельно,
  // это только заготовка структуры экрана. Статусы пока не сохраняются.
  const [doneTasks, setDoneTasks] = useState({});
  const toggleTask = (id) => setDoneTasks(prev => ({ ...prev, [id]: !prev[id] }));

  const active = PLACEHOLDER_TASKS.filter(t => !doneTasks[t.id]);
  const completed = PLACEHOLDER_TASKS.filter(t => doneTasks[t.id]);

  return (
    <div>
      <BackHeader title="Задачи" onBack={onBack} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.35)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Активные</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {active.length === 0
              ? <div style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>Активных задач нет</div>
              : active.map(task => <TaskCard key={task.id} task={task} done={false} onToggle={() => toggleTask(task.id)} />)}
          </div>
        </div>
        {completed.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.35)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Выполненные</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completed.map(task => <TaskCard key={task.id} task={task} done onToggle={() => toggleTask(task.id)} />)}
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", textAlign: "center" }}>
          Черновик — реальные задачи и сохранение статусов подключим отдельно
        </div>
      </div>
    </div>
  );
}

function RegimeHistorySubScreen({ onBack, taxValues, onRegimeChanged, onNavigateToOnboarding }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [changing, setChanging] = useState(false);
  const [dateInactive, setDateInactive] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const load = () => {
    setLoading(true);
    setError(null);
    api.getRegimeHistory()
      .then(setHistory)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleChangeRegime = async () => {
    setChanging(true);
    setError(null);
    try {
      await api.changeRegime(dateInactive);
      await onRegimeChanged(); // обновить данные в ProfileScreen — активная запись сменилась
      onNavigateToOnboarding(); // сразу перевести на вкладку Онбординг — там уже чистый шаг 1
    } catch (e) {
      setError(e.message);
      setChanging(false);
    }
  };

  const active = history?.find(r => r.tax_value_status === "active");
  // Менять можно только уже подтверждённый режим — иначе "смена" была бы сменой
  // того, чего фактически ещё нет.
  const canChange = Boolean(active?.tax_value_fact);

  return (
    <div>
      <BackHeader title="Смена налогового режима" onBack={onBack} />
      <ErrorNote error={error} />
      {loading ? (
        <div style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>Загрузка...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>История пока пуста — режим ещё не подтверждён.</div>
            ) : (
              [...history].reverse().map(row => (
                <Card key={row.code_td_id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {row.tax_value_fact ? taxValueName(row.tax_value_fact, taxValues) : "Режим не подтверждён"}
                    </div>
                    {row.tax_value_status === "active" && <Badge>текущий</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginTop: 4 }}>
                    Дата открытия: {row.date_active ? formatDate(row.date_active) : "—"}
                    {row.date_inactive && ` · Дата закрытия: ${formatDate(row.date_inactive)}`}
                  </div>
                </Card>
              ))
            )}
          </div>

          {canChange && (
            <Card>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginBottom: 6 }}>
                Дата закрытия текущего режима
              </div>
              {/* Вручную, а не "сегодня" — с этой даты фактически начинает
                  действовать новый режим, от неё же считаются его уведомления. */}
              <input
                type="date"
                value={dateInactive}
                min={active?.date_active || undefined}
                max={today}
                onChange={e => setDateInactive(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <button
                onClick={handleChangeRegime}
                disabled={changing || !dateInactive}
                style={{ width: "100%", padding: "10px 0", background: PURPLE, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: changing || !dateInactive ? 0.5 : 1 }}
              >
                {changing ? "Меняем..." : "Сменить режим"}
              </button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileScreen({ onNavigateToOnboarding }) {
  const [me, setMe] = useState(null);
  const [taxValues, setTaxValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [screen, setScreen] = useState(null); // null (меню) | "elina" | "tasks" | "regime"

  const load = () => {
    Promise.all([api.getMe(), api.getTaxValues()])
      .then(([meRes, taxValuesRes]) => {
        setMe(meRes);
        setTaxValues(taxValuesRes);
      })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(0,0,0,0.4)", fontSize: 14 }}>Загрузка...</div>;
  }

  if (screen === "elina") return <ElinaSubScreen onBack={() => setScreen(null)} />;
  if (screen === "tasks") return <TasksSubScreen onBack={() => setScreen(null)} />;
  if (screen === "regime") {
    return (
      <RegimeHistorySubScreen
        onBack={() => setScreen(null)}
        taxValues={taxValues}
        onRegimeChanged={load}
        onNavigateToOnboarding={onNavigateToOnboarding}
      />
    );
  }

  const regimeName = me?.user?.tax_value_fact ? taxValueName(me.user.tax_value_fact, taxValues) : "не подтверждён";
  const menuItems = [
    { id: "regime", icon: "ti-replace", label: "Смена налогового режима", sub: "История режимов, сменить режим" },
    { id: "elina", icon: "ti-robot", label: "Элина", sub: "HR-ассистент в отдельном боте" },
    { id: "tasks", icon: "ti-list-check", label: "Задачи", sub: "Командировки, документы на выплату" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {loadError && (
        <div style={{ background: RED_LIGHT, borderRadius: 12, padding: "12px 14px", fontSize: 12, color: RED }}>
          Не удалось связаться с сервером: {loadError}
        </div>
      )}

      <Card style={{ background: PURPLE_LIGHT, border: "0.5px solid #AFA9EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {/* photo_url приходит из initDataUnsafe — это НЕподписанная, чисто
                клиентская копия initData (в отличие от initData, которую проверяет
                бэкенд). Годится для аватарки: тут не принимается решений о доступе,
                просто картинка, и она не хранится — читаем прямо из Telegram SDK. */}
            {window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url ? (
              <img
                src={window.Telegram.WebApp.initDataUnsafe.user.photo_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <i className="ti ti-user" style={{ fontSize: 20, color: "#fff" }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#26215C" }}>@{me?.user?.tg_username || "—"}</div>
            <div style={{ fontSize: 12, color: PURPLE, marginTop: 2 }}>Режим: {regimeName}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {menuItems.map(item => (
          <Card key={item.id} onClick={() => setScreen(item.id)} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <i className={`ti ${item.icon}`} style={{ fontSize: 20, color: PURPLE, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>{item.sub}</div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 18, color: "rgba(0,0,0,0.25)" }} />
          </Card>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id: "home", icon: "ti-home", label: "Главная" },
  { id: "onboarding", icon: "ti-list-check", label: "Онбординг" },
  { id: "knowledge", icon: "ti-book", label: "База" },
  { id: "calendar", icon: "ti-calendar", label: "Календарь" },
  { id: "profile", icon: "ti-user", label: "Профиль" },
];

const titles = { home: "Портал контрактора", onboarding: "Онбординг", knowledge: "База знаний", calendar: "Календарь", profile: "Профиль" };

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      // ready(): убирает нативный лоадер Telegram над WebView. expand(): сразу
      // разворачивает мини-апп на всю высоту, а не на половину экрана.
      tg.ready();
      tg.expand();
    }
  }, []);

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f5f5f5", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.x/dist/tabler-icons.min.css" />

      {IS_DEV_AUTH && (
        <div style={{ background: RED, color: "#fff", textAlign: "center", fontSize: 11, fontWeight: 600, padding: "4px 0", letterSpacing: 0.3 }}>
          DEMO-РЕЖИМ · авторизация Telegram отключена, это не прод-логика
        </div>
      )}

      <div style={{ padding: "14px 16px 10px", borderBottom: "0.5px solid rgba(0,0,0,0.08)", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{titles[activeTab]}</div>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {activeTab === "home" && <HomeScreen onNavigate={setActiveTab} />}
        {activeTab === "onboarding" && <OnboardingScreen />}
        {activeTab === "knowledge" && <KnowledgeScreen />}
        {activeTab === "calendar" && <CalendarScreen />}
        {activeTab === "profile" && <ProfileScreen onNavigateToOnboarding={() => setActiveTab("onboarding")} />}
      </div>

      <div style={{ display: "flex", borderTop: "0.5px solid rgba(0,0,0,0.08)", background: "#fff" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "8px 0 6px", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", color: activeTab === tab.id ? PURPLE : "rgba(0,0,0,0.3)" }}>
            <i className={`ti ${tab.icon}`} style={{ fontSize: 22 }} />
            <span style={{ fontSize: 10, fontWeight: activeTab === tab.id ? 500 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}