import { useState } from 'react';
import { LevelSelector } from './LevelSelector';
import './Toolbar.css';

/**
 * Barra de herramientas del editor
 */
export const Toolbar = ({
  objects,
  onSave,
  onExport,
  onCopy,
  currentLevel,
  loading,
  mode,
  onModeChange,
  levels,
  onSelectLevel,
  onCreateNew,
  onDeleteLevel,
  levelLoading,
}) => {
  const [saveStatus, setSaveStatus] = useState(null);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await onSave();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleExportJSON = () => {
    const levelData = {
      name: currentLevel?.data?.name || 'Nivel Editado',
      description: currentLevel?.data?.description || 'Nivel creado en el editor',
      objects: objects.map(({ id, ...obj }) => obj),
    };
    onExport(levelData);
  };

  const handleCopyJSON = () => {
    const levelData = {
      name: currentLevel?.data?.name || 'Nivel Editado',
      description: currentLevel?.data?.description || 'Nivel creado en el editor',
      objects: objects.map(({ id, ...obj }) => obj),
    };
    onCopy(levelData);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h2>Editor de Niveles</h2>
        <span className="object-count">
          {objects.length} objeto{objects.length !== 1 ? 's' : ''}
        </span>
        {currentLevel && (
          <span className="level-name">
            • {currentLevel.data?.name || 'Sin nombre'}
          </span>
        )}
      </div>
      <div className="toolbar-right">
        {mode && onModeChange && (
          <>
            <button
              className={`toolbar-button mode-toggle-btn ${mode === 'game' ? 'active' : ''}`}
              onClick={() => onModeChange('game')}
            >
              🎮 Modo Juego
            </button>
            <button
              className={`toolbar-button mode-toggle-btn ${mode === 'editor' ? 'active' : ''}`}
              onClick={() => onModeChange('editor')}
            >
              ✏️ Modo Edición
            </button>
          </>
        )}
        {levels && onSelectLevel && (
          <LevelSelector
            levels={levels}
            currentLevel={currentLevel}
            onSelectLevel={onSelectLevel}
            onCreateNew={onCreateNew}
            onDeleteLevel={onDeleteLevel}
            loading={levelLoading}
          />
        )}
        <button
          onClick={handleCopyJSON}
          className="toolbar-button"
          disabled={loading}
        >
          Copiar JSON
        </button>
        <button
          onClick={handleExportJSON}
          className="toolbar-button"
          disabled={loading}
        >
          Exportar JSON
        </button>
        <button
          onClick={handleSave}
          className="toolbar-button primary"
          disabled={loading || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' && '💾 Guardando...'}
          {saveStatus === 'success' && '✓ Guardado'}
          {saveStatus === 'error' && '✗ Error'}
          {!saveStatus && '💾 Guardar'}
        </button>
      </div>
    </div>
  );
};

