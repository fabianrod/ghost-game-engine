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

  // Si es un collider, mostrar propiedades específicas de collider
  if (object.type === 'collider') {
    return (
      <div className="properties-panel">
        <h3>Propiedades del Collider</h3>
        <div style={{ padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '12px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#856404' }}>
            ⚠️ Este collider es invisible en el modo juego pero tiene colisión física
          </p>
        </div>

        <div className="property-group">
          <label>Tipo de Collider</label>
          <select
            value={object.colliderType || 'cylinder'}
            onChange={(e) => onUpdate({ colliderType: e.target.value })}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="cylinder">Cilíndrico</option>
            <option value="box">Caja</option>
          </select>
        </div>

        <div className="property-group">
          <label>Posición</label>
          <div className="vector-input">
            <input
              type="number"
              step="0.1"
              value={object.position[0]}
              onChange={(e) => {
                const newPos = [...object.position];
                newPos[0] = parseFloat(e.target.value) || 0;
                onUpdate({ position: newPos });
              }}
              placeholder="X"
            />
            <input
              type="number"
              step="0.1"
              value={object.position[1]}
              onChange={(e) => {
                const newPos = [...object.position];
                newPos[1] = parseFloat(e.target.value) || 0;
                onUpdate({ position: newPos });
              }}
              placeholder="Y"
            />
            <input
              type="number"
              step="0.1"
              value={object.position[2]}
              onChange={(e) => {
                const newPos = [...object.position];
                newPos[2] = parseFloat(e.target.value) || 0;
                onUpdate({ position: newPos });
              }}
              placeholder="Z"
            />
          </div>
        </div>

        <div className="property-group">
          <label>
            {object.colliderType === 'cylinder' ? 'Escala (Radio X/Z, Altura Y)' : 'Dimensiones (X, Y, Z)'}
          </label>
          <div className="vector-input">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={object.scale[0]}
              onChange={(e) => {
                const newScale = [...object.scale];
                newScale[0] = parseFloat(e.target.value) || 1;
                onUpdate({ scale: newScale });
              }}
              placeholder={object.colliderType === 'cylinder' ? 'Radio X' : 'X'}
            />
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={object.scale[1]}
              onChange={(e) => {
                const newScale = [...object.scale];
                newScale[1] = parseFloat(e.target.value) || 1;
                onUpdate({ scale: newScale });
              }}
              placeholder={object.colliderType === 'cylinder' ? 'Altura Y' : 'Y'}
            />
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={object.scale[2]}
              onChange={(e) => {
                const newScale = [...object.scale];
                newScale[2] = parseFloat(e.target.value) || 1;
                onUpdate({ scale: newScale });
              }}
              placeholder={object.colliderType === 'cylinder' ? 'Radio Z' : 'Z'}
            />
          </div>
          <p className="property-hint">
            {object.colliderType === 'cylinder' 
              ? 'Radio en X/Z, altura en Y' 
              : 'Dimensiones del collider de caja'}
          </p>
        </div>

        <div className="property-group">
          <label>Rotación (grados)</label>
          <div className="vector-input">
            <input
              type="number"
              step="1"
              value={object.rotation[0]}
              onChange={(e) => {
                const newRot = [...object.rotation];
                newRot[0] = parseFloat(e.target.value) || 0;
                onUpdate({ rotation: newRot });
              }}
              placeholder="X"
            />
            <input
              type="number"
              step="1"
              value={object.rotation[1]}
              onChange={(e) => {
                const newRot = [...object.rotation];
                newRot[1] = parseFloat(e.target.value) || 0;
                onUpdate({ rotation: newRot });
              }}
              placeholder="Y"
            />
            <input
              type="number"
              step="1"
              value={object.rotation[2]}
              onChange={(e) => {
                const newRot = [...object.rotation];
                newRot[2] = parseFloat(e.target.value) || 0;
                onUpdate({ rotation: newRot });
              }}
              placeholder="Z"
            />
          </div>
        </div>

        <div className="property-actions">
          <button className="duplicate-button" onClick={onDuplicate}>
            📋 Duplicar Collider
          </button>
          <button className="delete-button" onClick={onDelete}>
            🗑️ Eliminar Collider
          </button>
          {onToggleControls && (
            <button className="controls-button" onClick={onToggleControls}>
              Controles
            </button>
          )}
        </div>
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
            onChange={(e) => {
              const newValue = e.target.checked;
              handleChange('hasCollider', newValue);
              // Si se desactiva hasCollider y hay un customCollider, eliminarlo
              if (!newValue && object.customCollider) {
                onUpdate({ customCollider: null });
              }
            }}
            disabled={!!object.customCollider} // Deshabilitar si hay customCollider
          />
          Tiene colisión
          {object.customCollider && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
              (Activado por collider personalizado)
            </span>
          )}
        </label>
      </div>

      {/* Solo mostrar escala del collider si NO hay customCollider */}
      {object.hasCollider && !object.customCollider && (
        <div className="property-group">
          <label>Escala del Collider</label>
          <div className="vector-input">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={object.colliderScale ? object.colliderScale[0] : 0.8}
              onChange={(e) => {
                const currentScale = object.colliderScale || [0.8, 0.8, 0.8];
                handleChange('colliderScale', [
                  parseFloat(e.target.value) || 1,
                  currentScale[1],
                  currentScale[2],
                ]);
              }}
              placeholder="X"
            />
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={object.colliderScale ? object.colliderScale[1] : 0.8}
              onChange={(e) => {
                const currentScale = object.colliderScale || [0.8, 0.8, 0.8];
                handleChange('colliderScale', [
                  currentScale[0],
                  parseFloat(e.target.value) || 1,
                  currentScale[2],
                ]);
              }}
              placeholder="Y"
            />
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={object.colliderScale ? object.colliderScale[2] : 0.8}
              onChange={(e) => {
                const currentScale = object.colliderScale || [0.8, 0.8, 0.8];
                handleChange('colliderScale', [
                  currentScale[0],
                  currentScale[1],
                  parseFloat(e.target.value) || 1,
                ]);
              }}
              placeholder="Z"
            />
          </div>
          <p className="property-hint">Multiplicador del tamaño base del collider (solo para collider automático)</p>
        </div>
      )}


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

