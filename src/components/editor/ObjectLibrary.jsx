import './ObjectLibrary.css';

/**
 * Panel lateral que muestra los objetos disponibles para agregar al nivel
 * Incluye modelos 3D y colliders invisibles
 */
export const ObjectLibrary = ({ models, onAddObject, onAddCollider }) => {
  // Colliders disponibles
  const colliders = [
    { type: 'cylinder', name: 'Collider Cilíndrico', icon: '🔵' },
    { type: 'box', name: 'Collider de Caja', icon: '⬜' },
  ];

  return (
    <div className="object-library">
      <h3>Objetos Disponibles</h3>
      
      {/* Sección de Colliders */}
      <div className="library-section">
        <h4 className="section-title">Colliders (Invisibles)</h4>
        <div className="objects-list">
          {colliders.map((collider, index) => (
            <div
              key={`collider-${index}`}
              className="object-item collider-item"
              onClick={() => onAddCollider && onAddCollider(collider.type)}
              title={collider.name}
            >
              <div className="object-icon">{collider.icon}</div>
              <div className="object-name">{collider.name}</div>
              <div className="object-path">Invisible en juego</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección de Modelos 3D */}
      <div className="library-section">
        <h4 className="section-title">Modelos 3D</h4>
        <div className="objects-list">
          {models.length === 0 ? (
            <p className="no-objects">
              No hay objetos disponibles.
              <br />
              Agrega modelos GLB en src/assets/models/
            </p>
          ) : (
            models.map((model, index) => (
              <div
                key={index}
                className="object-item"
                onClick={() => onAddObject(model.path)}
                title={model.name}
              >
                <div className="object-icon">📦</div>
                <div className="object-name">{model.name}</div>
                <div className="object-path">{model.path}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

