export default function Dial({ seconds, totalSeconds, color = "var(--agar)" }) {
  const pct = 100 - (seconds / totalSeconds) * 100;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="dial" style={{ background: `conic-gradient(${color} ${pct}%, var(--border) 0)` }}>
      <div className="dial-inner">
        <span className="dial-time">
          {mm}:{ss}
        </span>
        <span className="dial-label">restante</span>
      </div>
    </div>
  );
}
