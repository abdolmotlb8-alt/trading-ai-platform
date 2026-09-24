"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const SYMBOLS = [
  ["EURUSD", "EUR / USD"],
  ["GBPUSD", "GBP / USD"],
  ["USDJPY", "USD / JPY"],
  ["AUDUSD", "AUD / USD"],
  ["USDCAD", "USD / CAD"],
  ["USDCHF", "USD / CHF"],
  ["NZDUSD", "NZD / USD"],
];

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Analysis = {
  symbol: string;
  price: number;

  direction:
    | "BUY"
    | "SELL"
    | "NO_TRADE";

  score: number;
  confirmations: number;

  session: string;

  sessions: {
    name: string;
    fa: string;
    open: boolean;
  }[];

  entry?: number;
  stopLoss?: number;

  tp1?: number;
  tp2?: number;
  tp3?: number;

  lotSize?: number;
  actualRisk?: number;
  rr?: number;

  mtf: string;

  support: number;
  resistance: number;
  atr: number;

  reasons: string[];

  confirmationsList: {
    name: string;
    ok: boolean;
    value: string;
  }[];

  candles: Candle[];

  timeframe: string;

  newsBlocked: boolean;
  newsReason: string;
};

type Perf = {
  signals: number;
  wins: number;
  losses: number;
  partial: number;
  winRate: number;
  pnlUsd: number;
};

type Response = {
  ok: boolean;

  analysis: Analysis;

  performance: {
    daily: Perf;
    weekly: Perf;
    monthly: Perf;
  };

  history: any[];

  error?: string;
};

const money = (
  value: number | undefined
) =>
  typeof value === "number"
    ? `$${value.toFixed(2)}`
    : "—";

const price = (
  symbol: string,
  value: number | undefined
) =>
  typeof value === "number"
    ? value.toFixed(
        symbol.includes("JPY")
          ? 3
          : 5
      )
    : "—";

export default function AIAnalysisPage() {
  const [symbol, setSymbol] =
    useState("EURUSD");

  const [data, setData] =
    useState<Response | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastUpdate, setLastUpdate] =
    useState<Date | null>(null);

  const load = useCallback(
    async (manual = false) => {
      if (manual) {
        setLoading(true);
      }

      try {
        const response =
          await fetch(
            `/api/ai-analysis?symbol=${encodeURIComponent(
              symbol
            )}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result?.error ||
              "تحلیل دریافت نشد."
          );
        }

        setData(result);
        setError("");
        setLastUpdate(
          new Date()
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "خطای ارتباط با موتور تحلیل"
        );
      } finally {
        setLoading(false);
      }
    },
    [symbol]
  );

  useEffect(() => {
    load(true);

    const interval =
      setInterval(
        () => load(false),
        20000
      );

    return () =>
      clearInterval(interval);
  }, [load]);

  const chartPoints =
    useMemo(() => {
      const candles =
        data?.analysis.candles ??
        [];

      if (candles.length < 2) {
        return "";
      }

      const min = Math.min(
        ...candles.map(
          (item) => item.low
        )
      );

      const max = Math.max(
        ...candles.map(
          (item) => item.high
        )
      );

      const width = 760;
      const height = 250;
      const padding = 12;

      const span =
        Math.max(
          max - min,
          0.0000001
        );

      return candles
        .map((item, index) => {
          const x =
            padding +
            (index /
              (candles.length -
                1)) *
              (width -
                padding * 2);

          const y =
            height -
            padding -
            ((item.close - min) /
              span) *
              (height -
                padding * 2);

          return `${x},${y}`;
        })
        .join(" ");
    }, [data]);

  const analysis =
    data?.analysis;

  const direction =
    analysis?.direction;

  const hasSignal =
    direction !==
    undefined &&
    direction !==
      "NO_TRADE";

  return (
    <main
      dir="rtl"
      className="aiPage"
    >
      <style>{css}</style>

      <div className="aiShell">

        {/* TOP */}

        <header className="topbar glass">
          <div className="brandBlock">
            <div className="brandMark">
              AI
            </div>

            <div>
              <div className="eyebrow">
                AI MARKET
                INTELLIGENCE
              </div>

              <h1>
                تحلیل هوشمند بازار
              </h1>

              <p>
                اسکلپینگ فارکس با
                تحلیل چندلایه و
                مدیریت ریسک
              </p>
            </div>
          </div>

          <div className="topActions">
            <span className="liveDot">
              <i />
              موتور تحلیل{" "}
              {loading
                ? "در حال بررسی"
                : "فعال"}
            </span>

            <button
              onClick={() =>
                load(true)
              }
              className="iconBtn"
              title="به‌روزرسانی"
            >
              ↻
            </button>
          </div>
        </header>

        {/* DISCLAIMER */}

        <section className="disclaimer glass goldEdge">
          <span className="warn">
            ⚠️
          </span>

          <div>
            <strong>
              این بخش «تحلیل هوش مصنوعی»
              است و سیگنال مستقیم نیست.
            </strong>

            <p>
              خروجی بر اساس داده واقعی
              بازار، چند تایم‌فریم،
              ساختار، نقدینگی، پولبک،
              کندل، مومنتوم، سشن و
              فیلتر خبر ساخته می‌شود.
              هیچ الگوریتمی سود یا
              موفقیت را تضمین نمی‌کند.
            </p>
          </div>
        </section>

        {/* CONTROLS */}

        <section className="controlRow">

          <div className="symbolBox glass">
            <span>
              نماد تحلیل
            </span>

            <select
              value={symbol}
              onChange={(event) =>
                setSymbol(
                  event.target.value
                )
              }
            >
              {SYMBOLS.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <small>
              فقط جفت‌ارزهای فارکس
            </small>
          </div>

          <div className="riskBox glass">

            <div>
              <span>
                ریسک هدف
              </span>
              <b>
                $4
              </b>
            </div>

            <div>
              <span>
                TP1
              </span>
              <b>
                +$5
              </b>
            </div>

            <div>
              <span>
                TP2
              </span>
              <b>
                +$8
              </b>
            </div>

            <div>
              <span>
                TP3
              </span>
              <b>
                +$12
              </b>
            </div>

          </div>

          <div className="refreshBox glass">
            <span>
              آخرین بررسی
            </span>

            <b>
              {lastUpdate
                ? lastUpdate.toLocaleTimeString(
                    "fa-IR"
                  )
                : "—"}
            </b>

            <small>
              بررسی خودکار هر ۲۰ ثانیه
            </small>
          </div>

        </section>

        {/* ERROR */}

        {error && (
          <section className="error glass">
            🔴 {error}
          </section>
        )}

        {/* DECISION + SESSIONS */}

        <section className="heroGrid">

          <div className="decision glass">

            <div
              className={`decisionIcon ${
                hasSignal
                  ? direction ===
                    "BUY"
                    ? "buy"
                    : "sell"
                  : "neutral"
              }`}
            >
              {hasSignal
                ? direction ===
                  "BUY"
                  ? "📈"
                  : "📉"
                : "⌛"}
            </div>

            <div className="decisionText">

              <div className="symbolTitle">
                {analysis?.symbol ??
                  symbol}{" "}
                · 1 MIN SCALP
              </div>

              <h2
                className={
                  hasSignal
                    ? direction ===
                      "BUY"
                      ? "buyText"
                      : "sellText"
                    : "neutralText"
                }
              >
                {hasSignal
                  ? direction ===
                    "BUY"
                    ? "BUY CONFIRMED"
                    : "SELL CONFIRMED"
                  : "NO TRADE"}
              </h2>

              <p>
                {hasSignal
                  ? "شرایط ورود توسط فیلترهای اصلی تأیید شده است."
                  : "تا زمانی که مجموعه تأییدیه‌ها کامل نشود، ورود جدید صادر نمی‌شود."}
              </p>

            </div>

            <div className="decisionScore">
              <span>
                AI SCORE
              </span>

              <strong>
                {analysis?.score ??
                  0}

                <small>
                  /100
                </small>
              </strong>
            </div>

          </div>

          <div className="sessionPanel glass">

            <div className="panelHead">

              <div>
                <div className="sectionLabel">
                  FOREX SESSIONS
                </div>

                <h3>
                  وضعیت سشن‌ها
                </h3>
              </div>

              <span className="sessionNow">
                {analysis?.session ??
                  "—"}
              </span>

            </div>

            <div className="sessions">

              {(
                analysis?.sessions ??
                [
                  {
                    name:
                      "Sydney",
                    fa: "سیدنی",
                    open: false,
                  },
                  {
                    name:
                      "Tokyo",
                    fa: "توکیو",
                    open: false,
                  },
                  {
                    name:
                      "London",
                    fa: "لندن",
                    open: false,
                  },
                  {
                    name:
                      "New York",
                    fa: "نیویورک",
                    open: false,
                  },
                ]
              ).map((session) => (
                <div
                  className={
                    session.open
                      ? "session active"
                      : "session"
                  }
                  key={
                    session.name
                  }
                >
                  <i>
                    {session.open
                      ? "●"
                      : "○"}
                  </i>

                  <span>
                    {session.fa}
                  </span>

                  <b>
                    {session.open
                      ? "OPEN"
                      : "CLOSED"}
                  </b>
                </div>
              ))}

            </div>

          </div>

        </section>

        {/* CHART */}

        <section className="chartCard glass">

          <div className="panelHead">

            <div>
              <div className="sectionLabel">
                LIVE MARKET
                STRUCTURE
              </div>

              <h2>
                {analysis?.symbol ??
                  symbol}{" "}
                / تحلیل 1 دقیقه
              </h2>
            </div>

            <div className="priceNow">
              {price(
                symbol,
                analysis?.price
              )}
            </div>

          </div>

          <div className="chartWrap">

            <svg
              viewBox="0 0 760 250"
              preserveAspectRatio="none"
              className="chart"
            >
              <defs>
                <linearGradient
                  id="goldLine"
                  x1="0"
                  x2="1"
                >
                  <stop offset="0%" />
                  <stop offset="100%" />
                </linearGradient>
              </defs>

              {[1, 2, 3, 4].map(
                (item) => (
                  <line
                    key={item}
                    x1="0"
                    x2="760"
                    y1={
                      item * 50
                    }
                    y2={
                      item * 50
                    }
                    className="gridLine"
                  />
                )
              )}

              {chartPoints && (
                <polyline
                  points={
                    chartPoints
                  }
                  fill="none"
                  stroke="url(#goldLine)"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </svg>

            <div className="chartTags">
              <span>
                1m
              </span>
              <span>
                5m
              </span>
              <span>
                15m
              </span>
              <span>
                1h
              </span>
              <span>
                4h
              </span>
            </div>

          </div>

          <div className="levels">

            <span>
              Support

              <b>
                {price(
                  symbol,
                  analysis?.support
                )}
              </b>
            </span>

            <span>
              ATR

              <b>
                {price(
                  symbol,
                  analysis?.atr
                )}
              </b>
            </span>

            <span>
              Resistance

              <b>
                {price(
                  symbol,
                  analysis?.resistance
                )}
              </b>
            </span>

          </div>

        </section>

        {/* TRADE PLAN + CONFIRMATIONS */}

        <section className="signalGrid">

          <div className="tradeCard glass goldEdge">

            <div className="panelHead">

              <div>
                <div className="sectionLabel">
                  AI SCALP PLAN
                </div>

                <h2>
                  طرح مدیریت سرمایه
                </h2>
              </div>

              <span
                className={
                  hasSignal
                    ? direction ===
                      "BUY"
                      ? "badge buy"
                      : "badge sell"
                    : "badge"
                }
              >
                {hasSignal
                  ? direction ===
                    "BUY"
                    ? "🟢 صعودی"
                    : "🔻 نزولی"
                  : "بدون ورود"}
              </span>

            </div>

            <div className="levelsGrid">

              <Level
                title="Entry / ورود"
                value={price(
                  symbol,
                  analysis?.entry
                )}
                cls="entry"
              />

              <Level
                title="Stop Loss / -$4"
                value={price(
                  symbol,
                  analysis?.stopLoss
                )}
                cls="sl"
              />

              <Level
                title="TP1 / +$5"
                value={price(
                  symbol,
                  analysis?.tp1
                )}
                cls="tp"
              />

              <Level
                title="TP2 / +$8"
                value={price(
                  symbol,
                  analysis?.tp2
                )}
                cls="tp"
              />

              <Level
                title="TP3 / +$12"
                value={price(
                  symbol,
                  analysis?.tp3
                )}
                cls="tp strong"
              />

              <Level
                title="Lot model"
                value={
                  analysis?.lotSize
                    ? analysis.lotSize.toFixed(
                        2
                      )
                    : "—"
                }
                cls="lot"
              />

            </div>

            <div className="riskNote">
              ریسک هدف:{" "}
              <b>
                $4
              </b>{" "}
              · سود کامل:{" "}
              <b>
                $12
              </b>{" "}
              · ریسک واقعی مدل:{" "}
              <b>
                {money(
                  analysis?.actualRisk
                )}
              </b>{" "}
              · نسبت هدف به ریسک:{" "}
              <b>
                {analysis?.rr
                  ? analysis.rr.toFixed(
                      2
                    )
                  : "—"}
              </b>
            </div>

          </div>

          <div className="confirmCard glass">

            <div className="panelHead">

              <div>
                <div className="sectionLabel">
                  MULTI-LAYER
                  CONFIRMATION
                </div>

                <h2>
                  تاییدیه‌های موتور AI
                </h2>
              </div>

              <b className="confirmCount">
                {analysis?.confirmations ??
                  0}
                /10
              </b>

            </div>

            <div className="confirmList">

              {(
                analysis?.confirmationsList ??
                []
              ).map((item) => (
                <div
                  className={
                    item.ok
                      ? "confirm ok"
                      : "confirm"
                  }
                  key={
                    item.name
                  }
                >
                  <span>
                    {item.ok
                      ? "✓"
                      : "—"}
                  </span>

                  <div>
                    <b>
                      {item.name}
                    </b>

                    <small>
                      {item.value}
                    </small>
                  </div>
                </div>
              ))}

            </div>

          </div>

        </section>

        {/* ANALYZER STACK */}

        <section className="analyzers glass">

          <div className="panelHead">

            <div>
              <div className="sectionLabel">
                AI ANALYZER STACK
              </div>

              <h2>
                موتورهای تحلیل همزمان
              </h2>
            </div>

            <span className="muted">
              هر ماژول مستقل بررسی می‌کند
            </span>

          </div>

          <div className="analyzerGrid">

            {[
              [
                "01",
                "Trend Engine",
                "روند 4H / 1H / 15M",
              ],
              [
                "02",
                "Momentum Engine",
                "RSI + MACD",
              ],
              [
                "03",
                "Structure Engine",
                "Swing + Breakout",
              ],
              [
                "04",
                "Liquidity Engine",
                "Sweep + Reaction",
              ],
              [
                "05",
                "Pullback Engine",
                "EMA Pullback",
              ],
              [
                "06",
                "Candle Engine",
                "Engulfing / Hammer",
              ],
              [
                "07",
                "Session Engine",
                "Tokyo / London / NY",
              ],
              [
                "08",
                "Risk Engine",
                "$4 / $5 / $8 / $12",
              ],
            ].map((item) => (
              <div
                className="analyzer"
                key={item[0]}
              >
                <i>
                  {item[0]}
                </i>

                <div>
                  <b>
                    {item[1]}
                  </b>

                  <small>
                    {item[2]}
                  </small>
                </div>

                <span>
                  ✓
                </span>
              </div>
            ))}

          </div>

        </section>

        {/* PERFORMANCE */}

        <section className="performance glass">

          <div className="panelHead">

            <div>
              <div className="sectionLabel">
                AI PERFORMANCE
                JOURNAL
              </div>

              <h2>
                کارنامه تحلیل هوش مصنوعی
              </h2>
            </div>

            <span className="muted">
              فقط خروجی‌های AI
            </span>

          </div>

          <div className="perfGrid">

            <Perf
              title="روزانه"
              data={
                data?.performance
                  .daily
              }
            />

            <Perf
              title="هفتگی"
              data={
                data?.performance
                  .weekly
              }
            />

            <Perf
              title="ماهانه"
              data={
                data?.performance
                  .monthly
              }
            />

          </div>

          <div className="history">

            <div className="historyTitle">
              آخرین نتایج ثبت‌شده
            </div>

            {(
              data?.history ??
              []
            ).length === 0 ? (
              <div className="empty">
                هنوز نتیجه بسته‌شده‌ای
                برای تحلیل AI ثبت نشده
                است.
              </div>
            ) : (
              data?.history.map(
                (item: any) => (
                  <div
                    className="historyRow"
                    key={item.id}
                  >
                    <span>
                      {new Date(
                        item.startedAt
                      ).toLocaleString(
                        "fa-IR"
                      )}
                    </span>

                    <b>
                      {
                        item.metadata
                          ?.symbol
                      }
                    </b>

                    <span>
                      {
                        item.metadata
                          ?.direction
                      }
                    </span>

                    <em>
                      {item.status}
                    </em>
                  </div>
                )
              )
            )}

          </div>

        </section>

        <footer>
          داده بازار از Twelve Data
          دریافت می‌شود. این صفحه
          اجرای معامله انجام نمی‌دهد.
          تحلیل AI صرفاً اطلاعات
          تحلیلی است و تضمین سود نیست.
        </footer>

      </div>
    </main>
  );
}

function Level({
  title,
  value,
  cls,
}: {
  title: string;
  value: string;
  cls: string;
}) {
  return (
    <div
      className={`level ${cls}`}
    >
      <small>
        {title}
      </small>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function Perf({
  title,
  data,
}: {
  title: string;
  data?: Perf;
}) {
  return (
    <div className="perf">

      <div>
        <b>
          {title}
        </b>

        <span>
          {data?.winRate ?? 0}%
          Win Rate
        </span>
      </div>

      <strong>
        {money(
          data?.pnlUsd
        )}
      </strong>

      <div className="miniStats">

        <span>
          Signals
          <b>
            {data?.signals ?? 0}
          </b>
        </span>

        <span>
          Wins
          <b>
            {data?.wins ?? 0}
          </b>
        </span>

        <span>
          Losses
          <b>
            {data?.losses ?? 0}
          </b>
        </span>

        <span>
          Partial
          <b>
            {data?.partial ?? 0}
          </b>
        </span>

      </div>

      <div className="bar">
        <i
          style={{
            width: `${Math.min(
              100,
              data?.winRate ?? 0
            )}%`,
          }}
        />
      </div>

    </div>
  );
}

const css = `
*{
  box-sizing:border-box;
}

.aiPage{
  min-height:100vh;
  background:#050607;
  color:#f4efe3;
  font-family:Tahoma,Arial,sans-serif;
  padding:18px;

  background-image:
    radial-gradient(
      circle at 20% 0%,
      rgba(184,145,48,.12),
      transparent 30%
    ),
    radial-gradient(
      circle at 100% 40%,
      rgba(92,61,18,.12),
      transparent 30%
    );
}

button,
select{
  font:inherit;
}

.aiShell{
  max-width:1250px;
  margin:auto;
}

.glass{
  background:
    linear-gradient(
      145deg,
      rgba(23,23,22,.92),
      rgba(10,10,10,.82)
    );

  border:1px solid
    rgba(214,174,69,.16);

  box-shadow:
    0 18px 60px
    rgba(0,0,0,.32);

  backdrop-filter:blur(18px);

  border-radius:24px;
}

.topbar{
  padding:18px 22px;

  display:flex;
  justify-content:space-between;
  align-items:center;

  gap:15px;
}

.brandBlock{
  display:flex;
  align-items:center;
  gap:14px;
}

.brandMark{
  width:52px;
  height:52px;

  border-radius:16px;

  display:grid;
  place-items:center;

  font-weight:900;
  font-size:18px;

  color:#15110a;

  background:
    linear-gradient(
      135deg,
      #a97920,
      #f4d67c
    );

  box-shadow:
    0 8px 25px
    rgba(215,170,57,.2);
}

.eyebrow,
.sectionLabel{
  font-size:9px;
  letter-spacing:2px;
  color:#d6af4e;
  font-weight:800;
}

.topbar h1{
  margin:5px 0;
  font-size:22px;
}

.topbar p{
  margin:0;
  color:#8d887c;
  font-size:11px;
}

.topActions{
  display:flex;
  align-items:center;
  gap:10px;
}

.liveDot{
  font-size:10px;
  color:#a9a394;
}

.liveDot i{
  display:inline-block;
  width:7px;
  height:7px;
  border-radius:50%;
  background:#51c58a;
  margin-left:6px;
  box-shadow:
    0 0 12px
    #51c58a;
}

.iconBtn{
  width:38px;
  height:38px;

  border-radius:12px;

  background:#151513;
  color:#e8cb78;

  border:1px solid
    rgba(214,174,69,.18);

  cursor:pointer;
}

.disclaimer{
  margin-top:14px;
  padding:15px 18px;

  display:flex;
  gap:13px;
  align-items:flex-start;
}

.goldEdge{
  border-color:
    rgba(214,174,69,.28);
}

.warn{
  font-size:20px;
}

.disclaimer strong{
  font-size:12px;
  color:#f0cf72;
}

.disclaimer p{
  margin:6px 0 0;
  color:#938e82;
  font-size:10px;
  line-height:1.9;
}

.controlRow{
  display:grid;
  grid-template-columns:
    1fr 2fr 1fr;

  gap:12px;
  margin-top:14px;
}

.symbolBox,
.riskBox,
.refreshBox{
  padding:14px 16px;
}

.symbolBox>span,
.refreshBox>span{
  display:block;
  color:#777269;
  font-size:9px;
}

.symbolBox select{
  width:100%;
  margin:7px 0;

  background:#11110f;
  color:#f3e7c5;

  border:1px solid
    rgba(214,174,69,.2);

  border-radius:11px;

  padding:10px;

  outline:0;
}

.symbolBox small,
.refreshBox small{
  display:block;
  color:#615d55;
  font-size:8px;
}

.riskBox{
  display:grid;
  grid-template-columns:
    repeat(4,1fr);

  gap:8px;
}

.riskBox div{
  padding:8px;

  border-radius:12px;

  background:#0f0f0d;

  border:1px solid
    rgba(255,255,255,.04);
}

.riskBox span{
  display:block;
  color:#6e695f;
  font-size:8px;
}

.riskBox b{
  display:block;
  margin-top:5px;
  color:#d9b658;
  font-size:14px;
}

.refreshBox b{
  display:block;
  margin:8px 0;
  color:#eee5d1;
  font-size:15px;
}

.error{
  margin-top:12px;
  padding:13px;
  color:#ff9696;
  font-size:11px;
  border-color:
    rgba(239,68,68,.3);
}

.heroGrid{
  display:grid;

  grid-template-columns:
    1.45fr .85fr;

  gap:14px;
  margin-top:14px;
}

.decision{
  padding:20px;

  display:grid;

  grid-template-columns:
    70px 1fr auto;

  gap:15px;

  align-items:center;
}

.decisionIcon{
  width:62px;
  height:62px;

  border-radius:19px;

  display:grid;
  place-items:center;

  font-size:27px;

  background:#171714;
}

.decisionIcon.buy{
  background:
    rgba(34,197,94,.1);

  border:
    1px solid
    rgba(34,197,94,.2);
}

.decisionIcon.sell{
  background:
    rgba(239,68,68,.1);

  border:
    1px solid
    rgba(239,68,68,.2);
}

.symbolTitle{
  color:#807b71;
  font-size:9px;
  letter-spacing:1px;
}

.decision h2{
  font-size:29px;
  margin:6px 0;
}

.decision p{
  margin:0;
  color:#817c71;
  font-size:10px;
}

.buyText{
  color:#66d49a;
}

.sellText{
  color:#f07171;
}

.neutralText{
  color:#e4bf52;
}

.decisionScore{
  text-align:center;

  padding:9px 14px;

  border-right:
    1px solid
    rgba(255,255,255,.07);
}

.decisionScore span{
  display:block;
  color:#6d675d;
  font-size:8px;
}

.decisionScore strong{
  display:block;
  color:#e1be59;
  font-size:31px;
  margin-top:4px;
}

.decisionScore small{
  font-size:10px;
  color:#777269;
}

.sessionPanel{
  padding:18px;
}

.panelHead{
  display:flex;
  justify-content:space-between;
  align-items:center;

  gap:12px;
}

.panelHead h2,
.panelHead h3{
  margin:5px 0 0;
  font-size:15px;
}

.sessionNow{
  color:#d6af4e;
  font-size:9px;
}

.sessions{
  display:grid;

  grid-template-columns:
    repeat(2,1fr);

  gap:8px;
  margin-top:14px;
}

.session{
  padding:10px;

  border-radius:12px;

  background:#10100e;

  border:1px solid
    rgba(255,255,255,.04);

  display:grid;

  grid-template-columns:
    15px 1fr auto;

  align-items:center;

  gap:5px;
}

.session i{
  color:#4d4a43;
  font-size:9px;
}

.session span{
  font-size:10px;
  color:#a29c91;
}

.session b{
  font-size:7px;
  color:#57534b;
}

.session.active{
  border-color:
    rgba(214,174,69,.28);

  background:
    rgba(214,174,69,.06);
}

.session.active i{
  color:#66d49a;
}

.session.active b{
  color:#d6af4e;
}

.chartCard{
  margin-top:14px;
  padding:18px;
}

.priceNow{
  color:#e3c366;
  font-size:20px;
  font-weight:800;
}

.chartWrap{
  margin-top:13px;

  border-radius:17px;
  overflow:hidden;

  background:#080908;

  border:1px solid
    rgba(255,255,255,.05);

  position:relative;
}

.chart{
  width:100%;
  height:280px;
  display:block;
}

.gridLine{
  stroke:
    rgba(255,255,255,.055);

  stroke-width:1;
}

.chartTags{
  position:absolute;

  right:10px;
  top:10px;

  display:flex;
  gap:5px;
}

.chartTags span{
  padding:6px 8px;

  border-radius:8px;

  background:#141411;
  color:#827b6d;

  font-size:8px;
}

.levels{
  display:grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:8px;

  margin-top:10px;
}

.levels span{
  padding:10px;

  border-radius:11px;

  background:#10100e;

  color:#6f6a60;

  font-size:9px;
}

.levels b{
  float:left;
  color:#cdb36a;
}

.signalGrid{
  display:grid;

  grid-template-columns:
    1.2fr .8fr;

  gap:14px;

  margin-top:14px;
}

.tradeCard,
.confirmCard,
.analyzers,
.performance{
  padding:19px;
}

.badge{
  padding:7px 10px;

  border-radius:999px;

  background:#171713;

  color:#777166;

  font-size:8px;
}

.badge.buy{
  color:#71dca3;

  background:
    rgba(34,197,94,.09);
}

.badge.sell{
  color:#f77d7d;

  background:
    rgba(239,68,68,.09);
}

.levelsGrid{
  display:grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:8px;

  margin-top:14px;
}

.level{
  padding:12px;

  border-radius:14px;

  background:#0e0e0c;

  border:1px solid
    rgba(255,255,255,.05);
}

.level small{
  display:block;
  color:#6e695f;
  font-size:8px;
}

.level strong{
  display:block;
  margin-top:6px;
  font-size:15px;
  color:#cfc7b6;
}

.level.entry{
  border-color:
    rgba(91,178,255,.2);
}

.level.entry strong{
  color:#76bbff;
}

.level.sl{
  border-color:
    rgba(239,68,68,.22);
}

.level.sl strong{
  color:#f77e7e;
}

.level.tp{
  border-color:
    rgba(34,197,94,.14);
}

.level.tp strong{
  color:#73dba1;
}

.level.tp.strong{
  box-shadow:
    inset 0 0 20px
    rgba(34,197,94,.04);
}

.level.lot strong{
  color:#e1bd59;
}

.riskNote{
  margin-top:12px;

  padding:10px 12px;

  border-radius:11px;

  background:
    rgba(214,174,69,.05);

  color:#80796d;

  font-size:9px;
}

.riskNote b{
  color:#d6b75e;
}

.confirmCount{
  color:#d7b85d;
  font-size:13px;
}

.confirmList{
  display:grid;
  gap:7px;

  margin-top:13px;

  max-height:350px;
  overflow:auto;
}

.confirm{
  display:flex;

  align-items:center;

  gap:8px;

  padding:8px 9px;

  border-radius:11px;

  background:#0e0e0c;
}

.confirm>span{
  width:21px;
  height:21px;

  border-radius:7px;

  display:grid;
  place-items:center;

  background:#171713;

  color:#59544a;

  font-size:10px;
}

.confirm.ok{
  border:
    1px solid
    rgba(34,197,94,.08);
}

.confirm.ok>span{
  background:
    rgba(34,197,94,.1);

  color:#69d69d;
}

.confirm b{
  display:block;

  font-size:9px;
  color:#bcb5a7;
}

.confirm small{
  display:block;

  color:#676158;

  font-size:8px;

  margin-top:2px;
}

.analyzers{
  margin-top:14px;
}

.muted{
  color:#716c62;
  font-size:9px;
}

.analyzerGrid{
  display:grid;

  grid-template-columns:
    repeat(4,1fr);

  gap:8px;

  margin-top:13px;
}

.analyzer{
  padding:11px;

  border-radius:13px;

  background:#0e0e0c;

  border:1px solid
    rgba(255,255,255,.045);

  display:flex;

  align-items:center;

  gap:8px;
}

.analyzer i{
  font-style:normal;

  color:#9c7a2a;

  font-size:8px;
}

.analyzer b{
  display:block;

  font-size:9px;

  color:#c4bcad;
}

.analyzer small{
  display:block;

  color:#656057;

  font-size:7px;

  margin-top:3px;
}

.analyzer span{
  margin-right:auto;

  color:#6dd59c;

  font-size:10px;
}

.performance{
  margin-top:14px;
}

.perfGrid{
  display:grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:9px;

  margin-top:13px;
}

.perf{
  padding:13px;

  border-radius:15px;

  background:#0d0d0b;
}

.perf>div:first-child{
  display:flex;

  justify-content:space-between;

  align-items:center;
}

.perf>div:first-child b{
  font-size:10px;
}

.perf>div:first-child span{
  font-size:8px;

  color:#d2b25d;
}

.perf>strong{
  display:block;

  color:#e1bd59;

  font-size:22px;

  margin:8px 0;
}

.miniStats{
  display:grid !important;

  grid-template-columns:
    repeat(4,1fr);

  gap:4px;
}

.miniStats span{
  font-size:7px;
  color:#5e5a51;
}

.miniStats b{
  display:block;

  color:#aaa194;

  font-size:9px;

  margin-top:3px;
}

.bar{
  height:4px;

  background:#1a1915;

  border-radius:9px;

  margin-top:11px;

  overflow:hidden;
}

.bar i{
  display:block;

  height:100%;

  background:
    linear-gradient(
      90deg,
      #7f5c15,
      #e0bf61
    );

  border-radius:9px;
}

.history{
  margin-top:15px;
}

.historyTitle{
  color:#8a8479;
  font-size:9px;
  margin-bottom:8px;
}

.historyRow{
  display:grid;

  grid-template-columns:
    1.3fr .7fr .5fr .6fr;

  gap:7px;

  padding:10px;

  border-bottom:
    1px solid
    rgba(255,255,255,.045);

  font-size:8px;

  color:#716c62;
}

.historyRow b{
  color:#bfb7a8;
}

.historyRow em{
  font-style:normal;
  color:#d0ad55;
}

.empty{
  text-align:center;

  padding:25px;

  color:#625e56;

  font-size:9px;
}

footer{
  text-align:center;

  padding:18px;

  color:#57534b;

  font-size:8px;

  line-height:2;
}

@media(max-width:950px){

  .controlRow{
    grid-template-columns:
      1fr 1.5fr;
  }

  .refreshBox{
    display:none;
  }

  .heroGrid,
  .signalGrid{
    grid-template-columns:1fr;
  }

  .analyzerGrid{
    grid-template-columns:
      repeat(2,1fr);
  }
}

@media(max-width:650px){

  .aiPage{
    padding:9px;
  }

  .topbar{
    padding:14px;
    border-radius:18px;
  }

  .brandMark{
    width:44px;
    height:44px;
  }

  .topbar h1{
    font-size:18px;
  }

  .topActions .liveDot{
    display:none;
  }

  .disclaimer{
    border-radius:17px;
  }

  .controlRow{
    grid-template-columns:1fr;
  }

  .riskBox{
    grid-template-columns:
      repeat(4,1fr);
  }

  .decision{
    grid-template-columns:
      55px 1fr;
  }

  .decisionIcon{
    width:52px;
    height:52px;
  }

  .decisionScore{
    grid-column:1/-1;

    border-right:0;

    border-top:
      1px solid
      rgba(255,255,255,.06);

    padding-top:10px;
  }

  .decision h2{
    font-size:24px;
  }

  .chart{
    height:220px;
  }

  .levelsGrid{
    grid-template-columns:
      repeat(2,1fr);
  }

  .analyzerGrid{
    grid-template-columns:1fr;
  }

  .perfGrid{
    grid-template-columns:1fr;
  }

  .historyRow{
    grid-template-columns:
      1.2fr .7fr .6fr .6fr;
  }

  .sessionPanel,
  .tradeCard,
  .confirmCard,
  .analyzers,
  .performance,
  .chartCard{
    padding:14px;
  }
}
`;
