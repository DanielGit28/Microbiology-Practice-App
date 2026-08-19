import { areaById } from "../data/areas.js";

export default function ProgresoPanel({ progreso }) {
  const ids = Object.keys(progreso);
  if (ids.length === 0) return null;

  return (
    <div className="panel">
      <h2>Tu progreso por área</h2>
      {ids.map((id) => {
        const a = areaById(id);
        if (!a) return null;
        const p = progreso[id];
        const pct = p.total > 0 ? Math.round((p.correctas / p.total) * 100) : 0;
        return (
          <div className="progreso-row" key={id}>
            <span className="progreso-code">{a.codigo}</span>
            <div className="progreso-bar">
              <div className="progreso-fill" style={{ width: pct + "%" }} />
            </div>
            <span className="progreso-num">
              {p.correctas}/{p.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
