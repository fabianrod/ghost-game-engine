import { useEffect } from 'react';
import './EditorControls.css';

/**
 * Componente para mostrar controles del editor y manejar atajos de teclado
 */
export const EditorControls = ({
  transformMode,
  onModeChange,
  snapEnabled,
  onSnapToggle,
  onDelete,
  onDuplicate,
}) => {
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Solo procesar si no estamos escribiendo en un input
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'g':
          onModeChange('translate');
          break;
        case 'r':
          onModeChange('rotate');
          break;
        case 's':
          onModeChange('scale');
          break;
        case 'delete':
        case 'backspace':
          if (onDelete) {
            event.preventDefault();
            onDelete();
          }
          break;
        default:
          break;
      }

      // Atajos con Ctrl
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'd':
            if (onDuplicate) {
              event.preventDefault();
              onDuplicate();
            }
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onModeChange, onDelete, onDuplicate]);

  return (
    <div className="editor-controls">
      <h4>Controles del Editor</h4>
      <div className="controls-info">
        <div className="control-section">
          <div className="control-section-title">Transformación</div>
          <div className="control-item">
            <kbd>G</kbd>
            <span>Mover objeto</span>
          </div>
          <div className="control-item">
            <kbd>R</kbd>
            <span>Rotar objeto</span>
          </div>
          <div className="control-item">
            <kbd>S</kbd>
            <span>Escalar objeto</span>
          </div>
        </div>
        
        <div className="control-section">
          <div className="control-section-title">Navegación</div>
          <div className="control-item">
            <kbd>Click</kbd>
            <span>Seleccionar objeto</span>
          </div>
          <div className="control-item">
            <kbd>Orbit</kbd>
            <span>Rotar cámara</span>
          </div>
          <div className="control-item">
            <kbd>Pan</kbd>
            <span>Mover cámara</span>
          </div>
          <div className="control-item">
            <kbd>Zoom</kbd>
            <span>Rueda del mouse</span>
          </div>
        </div>

        <div className="control-section">
          <div className="control-section-title">Acciones</div>
          <div className="control-item">
            <kbd>Ctrl</kbd> + <kbd>D</kbd>
            <span>Duplicar objeto</span>
          </div>
          <div className="control-item">
            <kbd>Delete</kbd>
            <span>Eliminar objeto</span>
          </div>
        </div>
      </div>
      
      <div className="mode-indicator">
        <span>Modo actual:</span>
        <span className={`mode-badge ${transformMode}`}>
          {transformMode === 'translate' && 'Mover'}
          {transformMode === 'rotate' && 'Rotar'}
          {transformMode === 'scale' && 'Escalar'}
        </span>
      </div>

      {onSnapToggle && (
        <div className="snap-control">
          <label className="snap-toggle">
            <input
              type="checkbox"
              checked={snapEnabled}
              onChange={(e) => onSnapToggle(e.target.checked)}
            />
            <span>Snap a grid</span>
          </label>
        </div>
      )}
    </div>
  );
};

