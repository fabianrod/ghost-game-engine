import { useState, useEffect } from 'react';
import { GameScene } from './components/game/Scene';
import { LevelEditor } from './components/editor/LevelEditor';
import './App.css';

/**
 * Componente principal de la aplicación
 * Permite alternar entre modo juego y modo edición
 */
function App() {
  const [mode, setMode] = useState('game'); // 'game' o 'editor'

  // Agregar clase al body para modo edición
  useEffect(() => {
    if (mode === 'editor') {
      document.body.classList.add('editor-mode');
    } else {
      document.body.classList.remove('editor-mode');
    }
    return () => {
      document.body.classList.remove('editor-mode');
    };
  }, [mode]);

  return (
    <div className="app-container">
      {/* Toggle para cambiar entre modos */}
      <div className="mode-toggle">
        <button
          className={mode === 'game' ? 'active' : ''}
          onClick={() => setMode('game')}
        >
          🎮 Modo Juego
        </button>
        <button
          className={mode === 'editor' ? 'active' : ''}
          onClick={() => setMode('editor')}
        >
          ✏️ Modo Edición
        </button>
      </div>

      {mode === 'game' ? (
        <>
          <GameScene />
          <div className="ui-overlay">
            <div className="controls-info">
              <h2>Zombie FPS</h2>
              <p>Controles: WASD para mover | Space para saltar | Mouse para mirar</p>
              <p className="hint">Haz clic para activar los controles</p>
            </div>
          </div>
        </>
      ) : (
        <LevelEditor />
      )}
    </div>
  );
}

export default App;
