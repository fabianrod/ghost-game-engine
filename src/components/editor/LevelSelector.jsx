import { useState, useEffect } from 'react';
import './LevelSelector.css';

/**
 * Componente selector de niveles
 * Permite seleccionar, crear y gestionar niveles
 */
export const LevelSelector = ({
  levels,
  currentLevel,
  onSelectLevel,
  onCreateNew,
  onDeleteLevel,
  loading,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="level-selector">
      <button
        className="level-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        {currentLevel
          ? `📁 ${currentLevel.filename || 'Nuevo Nivel'}`
          : '📁 Seleccionar Nivel'}
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="level-selector-dropdown">
          <div className="dropdown-header">
            <h4>Niveles</h4>
            <button
              className="new-level-button"
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
            >
              + Nuevo
            </button>
          </div>

          <div className="levels-list">
            {levels.length === 0 ? (
              <div className="no-levels">
                <p>No hay niveles guardados</p>
                <button
                  className="create-first-button"
                  onClick={() => {
                    onCreateNew();
                    setIsOpen(false);
                  }}
                >
                  Crear primer nivel
                </button>
              </div>
            ) : (
              levels.map((level) => (
                <div
                  key={level.filename}
                  className={`level-item ${
                    currentLevel?.filename === level.filename ? 'active' : ''
                  }`}
                >
                  <div
                    className="level-item-content"
                    onClick={() => {
                      onSelectLevel(level.filename);
                      setIsOpen(false);
                    }}
                  >
                    <div className="level-item-name">{level.name}</div>
                    <div className="level-item-filename">{level.filename}</div>
                    {level.description && (
                      <div className="level-item-description">
                        {level.description}
                      </div>
                    )}
                  </div>
                  {currentLevel?.filename === level.filename && (
                    <button
                      className="delete-level-button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar ${level.filename}? Esta acción no se puede deshacer.`
                          )
                        ) {
                          onDeleteLevel(level.filename);
                        }
                      }}
                      title="Eliminar nivel"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

