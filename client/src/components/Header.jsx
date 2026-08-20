export default function Header({ onBack, perfilNombre, onCambiarPerfil }) {
  return (
    <div className="app-header">
      <div>
        <p className="eyebrow">PDG · Microbiología y Química Clínica</p>
        <h1 className="app-title">Incubadora</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {perfilNombre && (
          <button className="nav-back" onClick={onCambiarPerfil} title="Cambiar de perfil">
            {perfilNombre}
          </button>
        )}
        {onBack && (
          <button className="nav-back" onClick={onBack}>
            &larr; Inicio
          </button>
        )}
      </div>
    </div>
  );
}
