import './PropertiesPanel.css';

/**
 * Panel de propiedades para editar el objeto seleccionado
 */
export const PropertiesPanel = ({ object, onUpdate, onDelete, onDuplicate, onToggleControls }) => {
  if (!object) {
    return (
      <div className="properties-panel">
        <h3>Propiedades</h3>
        <p className="no-selection">Selecciona un objeto para editar sus propiedades</p>
        {onToggleControls && (
          <div className="property-actions">
            <button className="controls-button" onClick={onToggleControls}>
              Controles
            </button>
          </div>
        )}
      </div>
    );
  }

  const handleChange = (property, value, index = null) => {
    if (index !== null) {
      // Para arrays (position, scale, rotation)
      const newArray = [...object[property]];
      newArray[index] = parseFloat(value) || 0;
      onUpdate({ [property]: newArray });
    } else {
      // Para valores simples
      onUpdate({ [property]: value });
    }
  };

  return (
    <div className="properties-panel">
      <h3>Propiedades</h3>
      
      <div className="property-group">
        <label>Modelo</label>
        <input 
          type="text" 
          value={object.model} 
          disabled 
          className="model-input"
        />
      </div>

      <div className="property-group">
        <label>Posición</label>
        <div className="vector-input">
          <input
            type="number"
            step="0.1"
            value={object.position[0]}
            onChange={(e) => handleChange('position', e.target.value, 0)}
            placeholder="X"
          />
          <input
            type="number"
            step="0.1"
            value={object.position[1]}
            onChange={(e) => handleChange('position', e.target.value, 1)}
            placeholder="Y"
          />
          <input
            type="number"
            step="0.1"
            value={object.position[2]}
            onChange={(e) => handleChange('position', e.target.value, 2)}
            placeholder="Z"
          />
        </div>
      </div>

      <div className="property-group">
        <label>Escala</label>
        <div className="vector-input">
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={object.scale[0]}
            onChange={(e) => handleChange('scale', e.target.value, 0)}
            placeholder="X"
          />
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={object.scale[1]}
            onChange={(e) => handleChange('scale', e.target.value, 1)}
            placeholder="Y"
          />
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={object.scale[2]}
            onChange={(e) => handleChange('scale', e.target.value, 2)}
            placeholder="Z"
          />
        </div>
      </div>

      <div className="property-group">
        <label>Rotación (grados)</label>
        <div className="vector-input">
          <input
            type="number"
            step="1"
            value={object.rotation[0]}
            onChange={(e) => handleChange('rotation', e.target.value, 0)}
            placeholder="X"
          />
          <input
            type="number"
            step="1"
            value={object.rotation[1]}
            onChange={(e) => handleChange('rotation', e.target.value, 1)}
            placeholder="Y"
          />
          <input
            type="number"
            step="1"
            value={object.rotation[2]}
            onChange={(e) => handleChange('rotation', e.target.value, 2)}
            placeholder="Z"
          />
        </div>
      </div>

      <div className="property-group">
        <label>
          <input
            type="checkbox"
            checked={object.castShadow}
            onChange={(e) => handleChange('castShadow', e.target.checked)}
          />
          Proyectar sombras
        </label>
      </div>

      <div className="property-group">
        <label>
          <input
            type="checkbox"
            checked={object.receiveShadow}
            onChange={(e) => handleChange('receiveShadow', e.target.checked)}
          />
          Recibir sombras
        </label>
      </div>

      <div className="property-group">
        <label>
          <input
            type="checkbox"
            checked={object.hasCollider}
            onChange={(e) => handleChange('hasCollider', e.target.checked)}
          />
          Tiene colisión
        </label>
      </div>

      <div className="property-actions">
        <button className="duplicate-button" onClick={onDuplicate}>
          📋 Duplicar Objeto
        </button>
        <button className="delete-button" onClick={onDelete}>
          🗑️ Eliminar Objeto
        </button>
        {onToggleControls && (
          <button className="controls-button" onClick={onToggleControls}>
            Controles
          </button>
        )}
      </div>
    </div>
  );
};

