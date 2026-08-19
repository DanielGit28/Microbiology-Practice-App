export default function Header({ onBack }) {
  return (
    <div className="app-header">
      <div>
        <p className="eyebrow">PDG · Microbiología y Química Clínica</p>
        <h1 className="app-title">Incubadora</h1>
      </div>
      {onBack && (
        <button className="nav-back" onClick={onBack}>
          &larr; Inicio
        </button>
      )}
    </div>
  );
}
