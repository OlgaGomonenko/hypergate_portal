import { useState } from "react";

const PURPLE = "#534AB7";
const PURPLE_LIGHT = "#EEEDFE";
const TEAL = "#1D9E75";
const TEAL_LIGHT = "#E1F5EE";
const AMBER = "#854F0B";
const AMBER_LIGHT = "#FAEEDA";
const RED = "#A32D2D";
const RED_LIGHT = "#FCEBEB";

const articles = [
  {
    id: "tax-regime", category: "start", categoryLabel: "С чего начать",
    title: "Какой режим выбрать", icon: "ti-scale", short: "УСН, патент или самозанятость",
    content: [
      { type: "warning", text: "Самозанятый + один заказчик > 35 тыс/мес дольше 3 месяцев — индикатор риска с 2026 г. Для нашей схемы ИП безопаснее." },
      { type: "table", headers: ["", "Самозанятый", "ИП УСН 6%", "Патент"], rows: [
        ["Лимит", "2,4 млн/год", "до 450 млн", "20 млн в 2026"],
        ["Ставка", "6% от ИП", "6%", "фиксировано"],
        ["Взносы", "не платит", "57 390 руб.", "57 390 руб."],
        ["Отчётность", "только чеки", "раз в год", "только КУДиР"],
      ]},
      { type: "tip", text: "Совмещайте УСН + патент: УСН как страховка если выпадете из лимита патента, патент — для основной деятельности." }
    ]
  },
  {
    id: "registration", category: "start", categoryLabel: "С чего начать",
    title: "Регистрация ИП", icon: "ti-id-badge", short: "Онлайн, бесплатно, 1–3 дня",
    content: [
      { type: "text", text: "Регистрация полностью бесплатна и делается онлайн — в налоговую ехать не нужно." },
      { type: "steps", items: [
        { label: "Через банк (рекомендуем)", text: "Тинькофф, Точка, Сбер, Альфа — сразу открывают счёт. Срок: 1–3 дня." },
        { label: "Через nalog.gov.ru", text: "Нужна подтверждённая запись Госуслуг. Госпошлина 0 руб. при подаче онлайн." },
      ]},
      { type: "warning", text: "Уведомление о переходе на УСН подавайте ОДНОВРЕМЕННО с регистрацией или в течение 30 дней. Пропустите — попадёте на ОСНО с НДС." }
    ]
  },
  {
    id: "contributions", category: "taxes", categoryLabel: "Налоги и взносы",
    title: "Страховые взносы", icon: "ti-coin", short: "57 390 руб. в 2026 году",
    content: [
      { type: "warning", text: "Самый частый источник штрафов — забыли про взносы. Платить нужно даже при нулевом доходе." },
      { type: "steps", items: [
        { label: "Фиксированный взнос", text: "57 390 руб./год. Срок: до 28 декабря 2026 г." },
        { label: "Доп. взнос 1%", text: "Если доход > 300 тыс./год — 1% с суммы превышения. Срок: до 1 июля следующего года." },
      ]},
      { type: "tip", text: "На УСН взносы уменьшают налог — при типичных доходах команды платёж по УСН выходит почти в 0." }
    ]
  },
  {
    id: "calendar", category: "taxes", categoryLabel: "Налоги и взносы",
    title: "Налоговый календарь", icon: "ti-calendar-event", short: "Все дедлайны в одном месте",
    content: [
      { type: "events", items: [
        { date: "25 апреля", label: "Декларация УСН за прошлый год", regime: "УСН" },
        { date: "28 апреля", label: "Авансовый платёж УСН за 1 квартал", regime: "УСН" },
        { date: "1 июля", label: "Доплата взносов 1% с дохода > 300 тыс.", regime: "Все ИП" },
        { date: "28 июля", label: "Авансовый платёж УСН за 2 квартал", regime: "УСН" },
        { date: "28 октября", label: "Авансовый платёж УСН за 3 квартал", regime: "УСН" },
        { date: "28 декабря", label: "Фиксированные взносы 57 390 руб.", regime: "Все ИП" },
      ]},
      { type: "tip", text: "Все платежи идут на ЕНС (Единый налоговый счёт) — не нужно расщеплять по разным КБК." }
    ]
  },
  {
    id: "elba", category: "tools", categoryLabel: "Инструменты",
    title: "Эльба бесплатно", icon: "ti-rocket", short: "5 лайфхаков по сервису",
    content: [
      { type: "steps", items: [
        { label: "Год бесплатно для новых ИП", text: "Тариф «Премиум» на год при регистрации. ИП должно быть моложе 3 месяцев." },
        { label: "Бесплатно через банк-партнёр", text: "Тинькофф, Точка, Альфа дают Эльбу бесплатно в первый год. Проверьте «Подарки» в ЛК банка." },
        { label: "Интеграция с банком", text: "Подключите выписку по API — операции загружаются автоматически." },
        { label: "Автоматические декларации", text: "Эльба формирует декларацию УСН, КУДиР и платёжки по взносам." },
        { label: "На патенте — минимальный тариф", text: "Отчётности почти нет. Если умеете работать с nalog.gov.ru — оставайтесь на бесплатном." },
      ]}
    ]
  },
  {
    id: "risks", category: "taxes", categoryLabel: "Налоги и взносы",
    title: "Чего точно не делать", icon: "ti-alert-triangle", short: "Типичные ошибки команды",
    content: [
      { type: "danger-list", items: [
        "Пропустить уведомление об УСН в первые 30 дней — иначе ОСНО и НДС с первого дня.",
        "Превысить лимит патента (20 млн в 2026) — слетите с ПСН задним числом.",
        "Работать по графику как наёмный сотрудник — признак трудовых отношений для налоговой.",
        "Игнорировать письма из ФНС в личном кабинете.",
        "Закрывать ИП «по-тихому» — нужна форма Р26001 и финальная декларация.",
      ]}
    ]
  }
];

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
  return null;
}

function ArticleView({ article, onBack }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{article.title}</div>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>{article.categoryLabel}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {article.content.map((block, i) => <ContentBlock key={i} block={block} />)}
      </div>
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
            { icon: "ti-robot", label: "Элина", sub: "Задать вопрос", tab: "elina" },
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
  const [openArticle, setOpenArticle] = useState(null);
  const [search, setSearch] = useState("");

  if (openArticle) return <ArticleView article={openArticle} onBack={() => setOpenArticle(null)} />;

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
        {filtered.length === 0
          ? <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(0,0,0,0.35)", fontSize: 14 }}>Ничего не найдено</div>
          : filtered.map(a => (
            <Card key={a.id} onClick={() => setOpenArticle(a)} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
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
          ))
        }
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

function OnboardingScreen() {
  const [selectedRegime, setSelectedRegime] = useState(null);
  const steps = [
    { id: 1, label: "Выбор режима", desc: "УСН или патент?", done: true },
    { id: 2, label: "Регистрация ИП", desc: "Через банк или ФНС", done: true },
    { id: 3, label: "Налоговый режим", desc: "Подать уведомление", active: true },
    { id: 4, label: "Открытие счёта", desc: "Тинькофф, Точка, Сбер" },
    { id: 5, label: "Активация Эльбы", desc: "Бесплатный первый год" },
    { id: 6, label: "КУДиР", desc: "Настроить учёт доходов" },
    { id: 7, label: "Первый договор", desc: "Образцы документов" },
    { id: 8, label: "Готово", desc: "Профиль заполнен" },
  ];
  const done = steps.filter(s => s.done).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        <Card key={step.id} style={step.active ? { border: `1.5px solid ${PURPLE}` } : {}}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, background: step.done ? TEAL_LIGHT : step.active ? PURPLE_LIGHT : "rgba(0,0,0,0.06)", color: step.done ? TEAL : step.active ? PURPLE : "rgba(0,0,0,0.3)" }}>
              {step.done ? <i className="ti ti-check" style={{ fontSize: 14 }} /> : step.id}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: step.done ? "rgba(0,0,0,0.4)" : "#000" }}>{step.label}</div>
              <div style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", marginTop: 1 }}>{step.desc}</div>
            </div>
            {step.active && <div style={{ fontSize: 11, background: PURPLE, color: "#fff", padding: "3px 8px", borderRadius: 20 }}>сейчас</div>}
            {step.done && <i className="ti ti-circle-check" style={{ color: TEAL, fontSize: 18 }} />}
          </div>
          {step.active && (
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              {["УСН 6%", "Патент"].map(r => (
                <button key={r} onClick={() => setSelectedRegime(r)} style={{ flex: 1, padding: "9px 0", background: selectedRegime === r ? PURPLE : "rgba(0,0,0,0.06)", color: selectedRegime === r ? "#fff" : "#000", border: "none", borderRadius: 10, fontSize: 13, fontWeight: selectedRegime === r ? 500 : 400, cursor: "pointer" }}>{r}</button>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function ElinaScreen() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Привет! Я Элина — HR-ассистент. Помогу разобраться с налогами, оформлением и любыми вопросами по работе как ИП. Задай вопрос или выбери тему:" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = ["Как платить взносы?", "Что такое ЕНС?", "УСН или патент?", "Как закрыть ИП?"];

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "Ты Элина — HR-ассистент для контракторов-ИП российской IT-компании. Отвечай кратко, по-русски, дружелюбно. Специализируешься на налогах ИП: УСН, патент, страховые взносы, отчётность, Эльба. Актуальные данные 2026: фиксированный взнос 57 390 руб., лимит УСН до 450 млн, лимит патента 20 млн. По сложным вопросам рекомендуй обратиться к бухгалтеру.",
          messages: history
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", text: data.content?.[0]?.text || "Что-то пошло не так." }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "Нет соединения. Попробуй снова." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: PURPLE_LIGHT, borderRadius: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="ti ti-robot" style={{ fontSize: 18, color: "#fff" }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#26215C" }}>Элина</div>
          <div style={{ fontSize: 12, color: PURPLE }}>HR-ассистент · на базе ИИ</div>
        </div>
        <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: TEAL }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 16, fontSize: 13, lineHeight: 1.6, alignSelf: msg.role === "user" ? "flex-end" : "flex-start", background: msg.role === "user" ? PURPLE : "rgba(0,0,0,0.06)", color: msg.role === "user" ? "#fff" : "#000", borderBottomRightRadius: msg.role === "user" ? 4 : 16, borderBottomLeftRadius: msg.role === "bot" ? 4 : 16 }}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: 16, borderBottomLeftRadius: 4, background: "rgba(0,0,0,0.06)", fontSize: 13, color: "rgba(0,0,0,0.4)" }}>
            Элина печатает...
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{ padding: "7px 12px", borderRadius: 20, border: `0.5px solid rgba(83,74,183,0.3)`, background: PURPLE_LIGHT, color: PURPLE, fontSize: 12, cursor: "pointer" }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage(input)} placeholder="Написать Элине..." style={{ flex: 1, padding: "10px 14px", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 12, fontSize: 14, outline: "none" }} />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: input.trim() && !loading ? PURPLE : "rgba(0,0,0,0.08)", color: input.trim() && !loading ? "#fff" : "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <i className="ti ti-send" style={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: "home", icon: "ti-home", label: "Главная" },
  { id: "onboarding", icon: "ti-list-check", label: "Онбординг" },
  { id: "knowledge", icon: "ti-book", label: "База" },
  { id: "calendar", icon: "ti-calendar", label: "Календарь" },
  { id: "elina", icon: "ti-robot", label: "Элина" },
];

const titles = { home: "Портал контрактора", onboarding: "Онбординг", knowledge: "База знаний", calendar: "Календарь", elina: "Элина" };

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f5f5f5", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.x/dist/tabler-icons.min.css" />

      <div style={{ padding: "14px 16px 10px", borderBottom: "0.5px solid rgba(0,0,0,0.08)", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{titles[activeTab]}</div>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {activeTab === "home" && <HomeScreen onNavigate={setActiveTab} />}
        {activeTab === "onboarding" && <OnboardingScreen />}
        {activeTab === "knowledge" && <KnowledgeScreen />}
        {activeTab === "calendar" && <CalendarScreen />}
        {activeTab === "elina" && <ElinaScreen />}
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