// src/components/UI.js


// ── MacroBar ───────────────────────────────────────────────────
export function MacroBar({ label, value, max, color }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{label}</span>
        <span style={{ color: "#94a3b8" }}>{value}g / {max}g</span>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ label = "Thinking..." }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#818cf8", padding: "8px 0" }}>
      <div style={{ width: 18, height: 18, border: "2px solid #312e81", borderTop: "2px solid #818cf8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────
export function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: "#0f172a",
      border: `1px solid ${accent || "#1e293b"}`,
      borderRadius: 20,
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Button ─────────────────────────────────────────────────────
export function Btn({ children, onClick, disabled, variant = "primary", fullWidth, style = {} }) {
  const variants = {
    primary:  { background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff" },
    success:  { background: "linear-gradient(135deg, #22c55e, #4ade80)", color: "#000" },
    ghost:    { background: "transparent", border: "1px solid #1e293b", color: "#94a3b8" },
    danger:   { background: "#ef444422", border: "1px solid #ef4444", color: "#f87171" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        border: variants[variant].border || "none",
        borderRadius: 12,
        padding: "13px 20px",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : "auto",
        fontFamily: "inherit",
        transition: "opacity 0.2s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────
export function Input({ label, type = "text", value, onChange, placeholder, style = {} }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: "12px 14px",
          color: "#f1f5f9",
          fontSize: 14,
          fontFamily: "inherit",
          boxSizing: "border-box",
          outline: "none",
          ...style,
        }}
      />
    </div>
  );
}

// ── CalorieRing ────────────────────────────────────────────────
export function CalorieRing({ value, max, size = 90 }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const r   = 36;
  const circ = 2 * Math.PI * r;
  const dash  = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
      <circle
        cx={45} cy={45} r={r} fill="none"
        stroke="#818cf8" strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={45} y={49} textAnchor="middle" fill="#f1f5f9" fontSize={12} fontWeight={700} fontFamily="inherit">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ── TagBadge ───────────────────────────────────────────────────
export function TagBadge({ label, color = "#6366f1" }) {
  return (
    <span style={{
      background: color + "22",
      border: `1px solid ${color}55`,
      color,
      borderRadius: 99,
      padding: "2px 10px",
      fontSize: 11,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}