import './ObjectLibrary.css';

/**
 * Panel lateral que muestra los objetos disponibles para agregar al nivel
 */
export const ObjectLibrary = ({ models, onAddObject }) => {
  return (
    <div className="object-library">
      <h3>Objetos Disponibles</h3>
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
  );
};

