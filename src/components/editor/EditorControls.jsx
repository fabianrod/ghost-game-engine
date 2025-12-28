import { useEffect, useRef, useState } from 'react';
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
  onClose,
}) => {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // Manejar arrastre del panel
  useEffect(() => {
    const handleMouseDown = (e) => {
      // Solo arrastrar desde el header
      if (!e.target.closest('.panel-header') || e.target.closest('.close-btn')) {
        return;
      }
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Limitar dentro de la ventana
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 320);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 200);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    const header = panelRef.current?.querySelector('.panel-header');
    if (header) {
      header.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (header) {
        header.removeEventListener('mousedown', handleMouseDown);
      }
    };
  }, [isDragging, dragOffset]);

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
        case 'c':
          onModeChange('collider');
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
    <div 
      ref={panelRef}
      className={`editor-controls-panel ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
      }}
    >
      <div className="panel-header">
        <h4>Controles del Editor</h4>
        {onClose && (
          <button className="close-btn" onClick={onClose} title="Cerrar">
            ×
          </button>
        )}
      </div>

      <div className="panel-content">
        {/* Modo de Transformación */}
        <div className="control-card">
          <div className="card-title">Modo de Transformación</div>
          <div className="transform-buttons">
            <button
              className={`transform-btn ${transformMode === 'translate' ? 'active' : ''}`}
              onClick={() => onModeChange('translate')}
              title="Mover (G)"
            >
              <span className="btn-key">G</span>
              <span className="btn-label">Mover</span>
            </button>
            <button
              className={`transform-btn ${transformMode === 'rotate' ? 'active' : ''}`}
              onClick={() => onModeChange('rotate')}
              title="Rotar (R)"
            >
              <span className="btn-key">R</span>
              <span className="btn-label">Rotar</span>
            </button>
            <button
              className={`transform-btn ${transformMode === 'scale' ? 'active' : ''}`}
              onClick={() => onModeChange('scale')}
              title="Escalar (S)"
            >
              <span className="btn-key">S</span>
              <span className="btn-label">Escalar</span>
            </button>
            <button
              className={`transform-btn ${transformMode === 'collider' ? 'active' : ''}`}
              onClick={() => onModeChange('collider')}
              title="Collider (C)"
            >
              <span className="btn-key">C</span>
              <span className="btn-label">Collider</span>
            </button>
          </div>
        </div>

        {/* Snap Control */}
        {onSnapToggle && (
          <div className="control-card">
            <label className="snap-label">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={(e) => onSnapToggle(e.target.checked)}
              />
              <span>Snap a Grid</span>
            </label>
          </div>
        )}

        {/* Atajos de Teclado */}
        <div className="control-card">
          <div className="card-title">Atajos de Teclado</div>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <div className="shortcut-keys">
                <kbd>Click</kbd>
              </div>
              <span className="shortcut-desc">Seleccionar objeto</span>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>D</kbd>
              </div>
              <span className="shortcut-desc">Duplicar</span>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-keys">
                <kbd>Del</kbd>
              </div>
              <span className="shortcut-desc">Eliminar</span>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <div className="control-card">
          <div className="card-title">Navegación</div>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <div className="shortcut-keys">
                <kbd>Orbit</kbd>
              </div>
              <span className="shortcut-desc">Rotar cámara</span>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-keys">
                <kbd>Pan</kbd>
              </div>
              <span className="shortcut-desc">Mover cámara</span>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-keys">
                <kbd>Rueda</kbd>
              </div>
              <span className="shortcut-desc">Zoom</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

