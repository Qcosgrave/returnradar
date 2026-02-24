import { useState, useEffect } from "react";

const mockPurchases = [
  {
    id: 1,
    merchant_name: "Apple",
    merchant_domain: "apple.com",
    order_id: "W123456789",
    order_date: "2025-02-10",
    total_amount: 1299.0,
    currency: "USD",
    return_window_days: 14,
    return_deadline: "2025-02-24",
    policy_source: "email",
    confidence: 0.95,
    status: "active",
    items: "MacBook Air M3",
  },
  {
    id: 2,
    merchant_name: "Nike",
    merchant_domain: "nike.com",
    order_id: "NIK-88821",
    order_date: "2025-02-01",
    total_amount: 149.99,
    currency: "USD",
    return_window_days: 60,
    return_deadline: "2025-04-02",
    policy_source: "merchant_table",
    confidence: 0.82,
    status: "active",
    items: "Air Max 270",
  },
  {
    id: 3,
    merchant_name: "Amazon",
    merchant_domain: "amazon.com",
    order_id: "113-4829471-2938401",
    order_date: "2025-01-28",
    total_amount: 34.99,
    currency: "USD",
    return_window_days: 30,
    return_deadline: "2025-02-27",
    policy_source: "merchant_table",
    confidence: 0.78,
    status: "active",
    items: "USB-C Hub 7-in-1",
  },
  {
    id: 4,
    merchant_name: "Nordstrom",
    merchant_domain: "nordstrom.com",
    order_id: "NRD-20491",
    order_date: "2025-01-15",
    total_amount: 225.0,
    currency: "USD",
    return_window_days: 45,
    return_deadline: "2025-03-01",
    policy_source: "email",
    confidence: 0.91,
    status: "active",
    items: "Wool Coat",
  },
  {
    id: 5,
    merchant_name: "Best Buy",
    merchant_domain: "bestbuy.com",
    order_id: "BBY-1928374",
    order_date: "2025-01-05",
    total_amount: 499.99,
    currency: "USD",
    return_window_days: 15,
    return_deadline: "2025-01-20",
    policy_source: "merchant_table",
    confidence: 0.88,
    status: "active",
    items: "Sony WH-1000XM5",
  },
];

function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function UrgencyBadge({ daysLeft }) {
  if (daysLeft < 0)
    return (
      <span className="badge badge-expired">Expired</span>
    );
  if (daysLeft <= 3)
    return (
      <span className="badge badge-critical">{daysLeft}d left</span>
    );
  if (daysLeft <= 10)
    return (
      <span className="badge badge-warning">{daysLeft}d left</span>
    );
  return <span className="badge badge-safe">{daysLeft}d left</span>;
}

function ConfidenceDot({ confidence }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 90 ? "#4ade80" : pct >= 75 ? "#facc15" : "#f87171";
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94a3b8" }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {pct}%
    </span>
  );
}

function PolicyPill({ source }) {
  const labels = {
    email: { label: "From email", color: "#818cf8" },
    merchant_table: { label: "Merchant default", color: "#64748b" },
    user_override: { label: "You set this", color: "#34d399" },
  };
  const { label, color } = labels[source] || { label: source, color: "#64748b" };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}44`,
        borderRadius: 4,
        padding: "2px 6px",
        background: `${color}11`,
      }}
    >
      {label}
    </span>
  );
}

function DeadlineBar({ daysLeft, totalDays }) {
  const pct = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));
  const color =
    daysLeft < 0
      ? "#6b7280"
      : daysLeft <= 3
      ? "#ef4444"
      : daysLeft <= 10
      ? "#f59e0b"
      : "#22d3ee";
  return (
    <div style={{ width: "100%", height: 3, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: "width 0.6s ease",
          boxShadow: daysLeft > 0 ? `0 0 8px ${color}88` : "none",
        }}
      />
    </div>
  );
}

const TABS = ["All", "Urgent", "Active", "Returned", "Ignored"];

export default function App() {
  const [purchases, setPurchases] = useState(mockPurchases);
  const [tab, setTab] = useState("All");
  const [selected, setSelected] = useState(null);
  const [inboxCopied, setInboxCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [alertOffsets, setAlertOffsets] = useState([10, 3, 1]);
  const [minAmount, setMinAmount] = useState("");

  const inboxAddress = "u1928@receipts.returnradar.app";

  function updateStatus(id, status) {
    setPurchases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    setSelected(null);
  }

  const filtered = purchases.filter((p) => {
    const days = getDaysUntil(p.return_deadline);
    if (tab === "Urgent") return p.status === "active" && days >= 0 && days <= 10;
    if (tab === "Active") return p.status === "active";
    if (tab === "Returned") return p.status === "returned";
    if (tab === "Ignored") return p.status === "ignore";
    return true;
  });

  const urgentCount = purchases.filter((p) => {
    const d = getDaysUntil(p.return_deadline);
    return p.status === "active" && d >= 0 && d <= 10;
  }).length;

  const sel = selected ? purchases.find((p) => p.id === selected) : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080d14;
          color: #e2e8f0;
          font-family: 'DM Mono', monospace;
          min-height: 100vh;
        }

        .app {
          display: flex;
          min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: #0c1420;
          border-right: 1px solid #1e2d40;
          display: flex;
          flex-direction: column;
          padding: 32px 20px;
          position: fixed;
          top: 0; left: 0; bottom: 0;
        }

        .logo {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: -0.02em;
          color: #f1f5f9;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          width: 28px; height: 28px;
          background: linear-gradient(135deg, #22d3ee, #818cf8);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
        }

        .logo-sub {
          font-size: 10px;
          color: #475569;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 32px;
        }

        .nav-label {
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #334155;
          margin-bottom: 8px;
          margin-top: 24px;
        }

        .nav-tab {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          color: #64748b;
          transition: all 0.15s;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-family: 'DM Mono', monospace;
        }

        .nav-tab:hover { background: #1e293b; color: #94a3b8; }
        .nav-tab.active { background: #1e293b; color: #e2e8f0; }

        .nav-tab-badge {
          font-size: 10px;
          background: #ef4444;
          color: white;
          border-radius: 10px;
          padding: 1px 6px;
          font-weight: 600;
        }

        .sidebar-bottom {
          margin-top: auto;
        }

        .inbox-box {
          background: #0f1923;
          border: 1px solid #1e2d40;
          border-radius: 10px;
          padding: 14px;
        }

        .inbox-label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #334155;
          margin-bottom: 8px;
        }

        .inbox-addr {
          font-size: 11px;
          color: #22d3ee;
          word-break: break-all;
          line-height: 1.5;
          margin-bottom: 10px;
        }

        .btn-copy {
          width: 100%;
          padding: 7px;
          background: #1e293b;
          border: 1px solid #2d3f55;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'DM Mono', monospace;
        }

        .btn-copy:hover { background: #263548; color: #e2e8f0; }

        /* Main */
        .main {
          margin-left: 240px;
          flex: 1;
          padding: 40px 48px;
          max-width: 1100px;
        }

        .page-header {
          margin-bottom: 36px;
        }

        .page-title {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #f1f5f9;
          margin-bottom: 6px;
        }

        .page-sub {
          color: #475569;
          font-size: 13px;
        }

        /* Stats row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 36px;
        }

        .stat-card {
          background: #0c1420;
          border: 1px solid #1e2d40;
          border-radius: 12px;
          padding: 20px;
        }

        .stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #f1f5f9;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: #475569;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .stat-card.urgent .stat-value { color: #ef4444; }
        .stat-card.upcoming .stat-value { color: #f59e0b; }

        /* Tabs */
        .tabs-row {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
          border-bottom: 1px solid #1e2d40;
          padding-bottom: 0;
        }

        .tab-btn {
          padding: 8px 16px;
          font-size: 12px;
          cursor: pointer;
          background: none;
          border: none;
          color: #475569;
          font-family: 'DM Mono', monospace;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.15s;
          letter-spacing: 0.03em;
        }

        .tab-btn:hover { color: #94a3b8; }
        .tab-btn.active { color: #22d3ee; border-bottom-color: #22d3ee; }

        /* Table */
        .table-wrap {
          background: #0c1420;
          border: 1px solid #1e2d40;
          border-radius: 14px;
          overflow: hidden;
        }

        .table-head {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr 120px;
          padding: 12px 20px;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #334155;
          border-bottom: 1px solid #1e2d40;
          background: #0a1219;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr 120px;
          padding: 16px 20px;
          border-bottom: 1px solid #0f1923;
          cursor: pointer;
          transition: background 0.12s;
          align-items: center;
        }

        .table-row:hover { background: #0f1923; }
        .table-row:last-child { border-bottom: none; }
        .table-row.selected { background: #111d2e; }
        .table-row.dimmed { opacity: 0.4; }

        .merchant-name {
          font-family: 'Syne', sans-serif;
          font-weight: 600;
          font-size: 14px;
          color: #e2e8f0;
          margin-bottom: 2px;
        }

        .order-id {
          font-size: 11px;
          color: #334155;
        }

        .cell {
          font-size: 13px;
          color: #94a3b8;
        }

        .cell-amount {
          font-size: 14px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .badge-critical {
          background: #450a0a;
          color: #fca5a5;
          border: 1px solid #7f1d1d;
          animation: pulse-red 2s infinite;
        }

        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 #ef444422; }
          50% { box-shadow: 0 0 0 4px #ef444422; }
        }

        .badge-warning {
          background: #451a03;
          color: #fcd34d;
          border: 1px solid #78350f;
        }

        .badge-safe {
          background: #022c22;
          color: #6ee7b7;
          border: 1px solid #064e3b;
        }

        .badge-expired {
          background: #1c1c1c;
          color: #52525b;
          border: 1px solid #27272a;
        }

        /* Detail Panel */
        .detail-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 100;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
        }

        .detail-panel {
          width: 400px;
          height: 100vh;
          background: #0c1420;
          border-left: 1px solid #1e2d40;
          padding: 32px 28px;
          overflow-y: auto;
          animation: slide-in 0.2s ease;
        }

        @keyframes slide-in {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .panel-close {
          position: absolute;
          top: 24px;
          right: 24px;
          background: #1e293b;
          border: none;
          color: #64748b;
          width: 32px; height: 32px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }

        .panel-close:hover { background: #263548; color: #e2e8f0; }

        .panel-merchant {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #f1f5f9;
          margin-bottom: 4px;
          letter-spacing: -0.02em;
        }

        .panel-order {
          font-size: 12px;
          color: #475569;
          margin-bottom: 24px;
        }

        .panel-deadline-block {
          background: #0f1923;
          border: 1px solid #1e2d40;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          text-align: center;
        }

        .panel-days-big {
          font-family: 'Syne', sans-serif;
          font-size: 48px;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 4px;
        }

        .panel-deadline-label {
          font-size: 11px;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .detail-cell {
          background: #0f1923;
          border: 1px solid #1e2d40;
          border-radius: 8px;
          padding: 12px;
        }

        .detail-cell-label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #334155;
          margin-bottom: 4px;
        }

        .detail-cell-value {
          font-size: 14px;
          color: #e2e8f0;
        }

        .action-row {
          display: flex;
          gap: 8px;
          margin-top: 24px;
        }

        .btn {
          flex: 1;
          padding: 11px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-family: 'DM Mono', monospace;
          font-weight: 500;
          letter-spacing: 0.03em;
          transition: all 0.15s;
        }

        .btn-returned {
          background: #022c22;
          color: #6ee7b7;
          border: 1px solid #064e3b;
        }
        .btn-returned:hover { background: #064e3b; }

        .btn-ignore {
          background: #1c1c1c;
          color: #71717a;
          border: 1px solid #27272a;
        }
        .btn-ignore:hover { background: #27272a; color: #a1a1aa; }

        /* Settings panel */
        .settings-panel {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-box {
          background: #0c1420;
          border: 1px solid #1e2d40;
          border-radius: 16px;
          padding: 32px;
          width: 420px;
          animation: fade-up 0.2s ease;
        }

        @keyframes fade-up {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .settings-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 24px;
        }

        .settings-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }

        .settings-input {
          width: 100%;
          background: #0f1923;
          border: 1px solid #1e2d40;
          border-radius: 8px;
          padding: 10px 12px;
          color: #e2e8f0;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          margin-bottom: 20px;
          outline: none;
          transition: border-color 0.15s;
        }

        .settings-input:focus { border-color: #22d3ee; }

        .btn-primary {
          background: linear-gradient(135deg, #22d3ee, #818cf8);
          color: #0c1420;
          border: none;
          border-radius: 8px;
          padding: 11px 24px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          letter-spacing: 0.03em;
        }
        .btn-primary:hover { opacity: 0.9; }

        .btn-ghost {
          background: none;
          border: 1px solid #1e2d40;
          border-radius: 8px;
          padding: 11px 24px;
          color: #64748b;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          margin-right: 8px;
        }
        .btn-ghost:hover { border-color: #2d3f55; color: #94a3b8; }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #334155;
          font-size: 13px;
        }

        .empty-icon { font-size: 32px; margin-bottom: 12px; }

        @media (max-width: 900px) {
          .sidebar { display: none; }
          .main { margin-left: 0; padding: 24px 20px; }
          .stats-row { grid-template-columns: 1fr 1fr; }
          .table-head { display: none; }
          .table-row { grid-template-columns: 1fr; gap: 6px; }
          .detail-panel { width: 100vw; }
        }
      `}</style>

      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-icon">🔔</div>
            ReturnRadar
          </div>
          <div className="logo-sub">Receipt Monitor</div>

          <div className="nav-label">Views</div>
          {TABS.map((t) => (
            <button
              key={t}
              className={`nav-tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "Urgent" && urgentCount > 0 && (
                <span className="nav-tab-badge">{urgentCount}</span>
              )}
            </button>
          ))}

          <div className="nav-label">Account</div>
          <button className="nav-tab" onClick={() => setShowSettings(true)}>
            Settings
          </button>

          <div className="sidebar-bottom">
            <div className="inbox-box">
              <div className="inbox-label">Your Inbox Address</div>
              <div className="inbox-addr">{inboxAddress}</div>
              <button
                className="btn-copy"
                onClick={() => {
                  navigator.clipboard.writeText(inboxAddress);
                  setInboxCopied(true);
                  setTimeout(() => setInboxCopied(false), 2000);
                }}
              >
                {inboxCopied ? "✓ Copied!" : "Copy address"}
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="main">
          <div className="page-header">
            <div className="page-title">
              {tab === "All" ? "All Purchases" : tab}
            </div>
            <div className="page-sub">
              {filtered.length} purchase{filtered.length !== 1 ? "s" : ""}
              {tab === "Urgent" ? " expiring within 10 days" : " tracked"}
            </div>
          </div>

          {/* Stats */}
          {tab === "All" && (
            <div className="stats-row">
              <div className="stat-card urgent">
                <div className="stat-value">{urgentCount}</div>
                <div className="stat-label">Urgent</div>
              </div>
              <div className="stat-card upcoming">
                <div className="stat-value">
                  {purchases.filter((p) => {
                    const d = getDaysUntil(p.return_deadline);
                    return p.status === "active" && d > 10 && d <= 30;
                  }).length}
                </div>
                <div className="stat-label">Upcoming</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {purchases.filter((p) => p.status === "returned").length}
                </div>
                <div className="stat-label">Returned</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  ${purchases
                    .filter((p) => p.status === "active")
                    .reduce((sum, p) => sum + (p.total_amount || 0), 0)
                    .toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div className="stat-label">At Risk</div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="table-wrap">
            <div className="table-head">
              <span>Merchant</span>
              <span>Amount</span>
              <span>Order Date</span>
              <span>Deadline</span>
              <span>Time Left</span>
              <span>Confidence</span>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div>No purchases in this view</div>
              </div>
            ) : (
              filtered.map((p) => {
                const daysLeft = getDaysUntil(p.return_deadline);
                return (
                  <div
                    key={p.id}
                    className={`table-row ${selected === p.id ? "selected" : ""} ${
                      p.status !== "active" ? "dimmed" : ""
                    }`}
                    onClick={() => setSelected(selected === p.id ? null : p.id)}
                  >
                    <div>
                      <div className="merchant-name">{p.merchant_name}</div>
                      <div className="order-id">{p.items}</div>
                      <div style={{ marginTop: 6 }}>
                        <DeadlineBar daysLeft={daysLeft} totalDays={p.return_window_days} />
                      </div>
                    </div>
                    <div className="cell cell-amount">
                      ${p.total_amount?.toLocaleString()}
                    </div>
                    <div className="cell">
                      {new Date(p.order_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="cell">
                      {new Date(p.return_deadline).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div>
                      <UrgencyBadge daysLeft={daysLeft} />
                    </div>
                    <div>
                      <ConfidenceDot confidence={p.confidence} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* Detail Panel */}
        {sel && (
          <div className="detail-overlay" onClick={() => setSelected(null)}>
            <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
              <button className="panel-close" onClick={() => setSelected(null)}>
                ✕
              </button>

              <div className="panel-merchant">{sel.merchant_name}</div>
              <div className="panel-order">
                Order #{sel.order_id} · {sel.items}
              </div>

              {(() => {
                const d = getDaysUntil(sel.return_deadline);
                const color =
                  d < 0 ? "#52525b" : d <= 3 ? "#ef4444" : d <= 10 ? "#f59e0b" : "#22d3ee";
                return (
                  <div className="panel-deadline-block">
                    <div className="panel-days-big" style={{ color }}>
                      {d < 0 ? "—" : d}
                    </div>
                    <div className="panel-deadline-label">
                      {d < 0
                        ? "Return window expired"
                        : d === 0
                        ? "Last day to return!"
                        : `days left to return`}
                    </div>
                  </div>
                );
              })()}

              <div className="detail-grid">
                <div className="detail-cell">
                  <div className="detail-cell-label">Amount</div>
                  <div className="detail-cell-value">
                    ${sel.total_amount?.toLocaleString()} {sel.currency}
                  </div>
                </div>
                <div className="detail-cell">
                  <div className="detail-cell-label">Order Date</div>
                  <div className="detail-cell-value">
                    {new Date(sel.order_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="detail-cell">
                  <div className="detail-cell-label">Return Window</div>
                  <div className="detail-cell-value">{sel.return_window_days} days</div>
                </div>
                <div className="detail-cell">
                  <div className="detail-cell-label">Deadline</div>
                  <div className="detail-cell-value">
                    {new Date(sel.return_deadline).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Policy Source
                </div>
                <PolicyPill source={sel.policy_source} />
                <span style={{ marginLeft: 8 }}>
                  <ConfidenceDot confidence={sel.confidence} />
                </span>
              </div>

              {sel.status === "active" && (
                <div className="action-row">
                  <button
                    className="btn btn-returned"
                    onClick={() => updateStatus(sel.id, "returned")}
                  >
                    ✓ Mark Returned
                  </button>
                  <button
                    className="btn btn-ignore"
                    onClick={() => updateStatus(sel.id, "ignore")}
                  >
                    Ignore
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="settings-panel" onClick={() => setShowSettings(false)}>
            <div className="settings-box" onClick={(e) => e.stopPropagation()}>
              <div className="settings-title">Settings</div>

              <div className="settings-label">Alert Offsets (days before deadline)</div>
              <input
                className="settings-input"
                value={alertOffsets.join(", ")}
                onChange={(e) =>
                  setAlertOffsets(
                    e.target.value
                      .split(",")
                      .map((v) => parseInt(v.trim()))
                      .filter((v) => !isNaN(v))
                  )
                }
                placeholder="10, 3, 1"
              />

              <div className="settings-label">Minimum Purchase Amount for Alerts ($)</div>
              <input
                className="settings-input"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0 (alert on all)"
                type="number"
              />

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-ghost" onClick={() => setShowSettings(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={() => setShowSettings(false)}>
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
