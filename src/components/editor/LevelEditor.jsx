import { useState, useEffect, useMemo, useCallback } from 'react';
import { EditorCanvas } from './EditorCanvas';
import { ObjectLibrary } from './ObjectLibrary';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';
import { EditorControls } from './EditorControls';
import { LevelSelector } from './LevelSelector';
import './LevelEditor.css';
import { useLevelManager } from '../../hooks/useLevelManager';

/**
 * Componente principal del editor de niveles
 * Maneja el estado global del editor y la interfaz
 */
export const LevelEditor = () => {
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [transformMode, setTransformMode] = useState('translate');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapSize, setSnapSize] = useState(1); // Tamaño del grid para snap
  const [showEditorControls, setShowEditorControls] = useState(false); // Control de visibilidad del widget (oculto por defecto)

  // Gestor de niveles
  const {
    levels,
    currentLevel,
    loading: levelLoading,
    error: levelError,
    loadLevel,
    saveLevel,
    createNewLevel,
    validateLevel,
    setCurrentLevel,
    listLevels,
  } = useLevelManager();

  // Cargar lista de modelos disponibles desde /public/models/
  useEffect(() => {
    // En desarrollo, podemos usar import.meta.glob de Vite
    // O hacer un fetch a un endpoint que liste los archivos
    // Por ahora, lista manual de modelos conocidos
    const models = [
      { name: 'Raíz de Árbol', path: '/models/raiz-arbol.glb' },
      // Agregar más modelos aquí cuando los tengas
    ];
    setAvailableModels(models);
  }, []);

  // Cargar objetos del nivel actual
  useEffect(() => {
    if (currentLevel && currentLevel.data && currentLevel.data.objects) {
      // Convertir objetos del nivel a formato del editor (agregar id)
      const editorObjects = currentLevel.data.objects.map((obj, index) => ({
        ...obj,
        id: `obj-${index}-${Date.now()}-${Math.random()}`,
      }));
      setObjects(editorObjects);
    } else if (currentLevel && currentLevel.data) {
      // Nivel sin objetos
      setObjects([]);
    }
  }, [currentLevel]);

  // Inicializar con nivel nuevo si no hay nivel cargado
  useEffect(() => {
    if (!currentLevel) {
      const newLevel = createNewLevel();
      setCurrentLevel({ filename: null, data: newLevel });
      setObjects([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manejar selección de nivel
  const handleSelectLevel = async (filename) => {
    try {
      const levelData = await loadLevel(filename);
      setCurrentLevel({ filename, data: levelData });
      setSelectedObject(null);
    } catch (error) {
      alert(`Error al cargar el nivel: ${error.message}`);
    }
  };

  // Manejar creación de nuevo nivel
  const handleCreateNew = () => {
    const newLevel = createNewLevel();
    setCurrentLevel({ filename: null, data: newLevel });
    setObjects([]);
    setSelectedObject(null);
  };

  // Manejar guardado
  const handleSave = async () => {
    try {
      // Preparar datos del nivel
      const levelData = {
        name: currentLevel?.data?.name || 'Nivel Editado',
        description: currentLevel?.data?.description || 'Nivel creado en el editor',
        objects: objects.map(({ id, ...obj }) => obj),
      };

      // Validar datos
      const validation = validateLevel(levelData);
      if (!validation.valid) {
        alert(`Error de validación: ${validation.error}`);
        return;
      }

      // Determinar nombre de archivo
      const filename = currentLevel?.filename || `level${levels.length + 1}.json`;

      // Guardar
      await saveLevel(filename, levelData);
      
      // Actualizar nivel actual si se guardó exitosamente
      if (!currentLevel?.filename) {
        setCurrentLevel({ filename, data: levelData });
      } else {
        setCurrentLevel({ ...currentLevel, data: levelData });
      }

      // Actualizar lista de niveles
      await listLevels();
    } catch (error) {
      alert(`Error al guardar: ${error.message}`);
      throw error;
    }
  };

  // Manejar exportar
  const handleExport = (levelData) => {
    const jsonString = JSON.stringify(levelData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentLevel?.filename || 'level.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Manejar copiar
  const handleCopy = async (levelData) => {
    const jsonString = JSON.stringify(levelData, null, 2);
    try {
      await navigator.clipboard.writeText(jsonString);
      alert('JSON copiado al portapapeles!');
    } catch (error) {
      alert('Error al copiar al portapapeles');
    }
  };

  // Manejar eliminación de nivel
  const handleDeleteLevel = async (filename) => {
    // Nota: En el navegador no podemos eliminar archivos directamente
    // Esto requeriría un backend. Por ahora, solo mostramos un mensaje
    alert(
      `Para eliminar ${filename}, elimínalo manualmente de la carpeta /public/levels/`
    );
    await listLevels();
  };

  // Agregar un objeto al nivel
  const handleAddObject = (modelPath) => {
    const newObject = {
      id: `obj-${Date.now()}-${Math.random()}`,
      type: 'object',
      model: modelPath,
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
      castShadow: true,
      receiveShadow: true,
      hasCollider: true,
    };
    setObjects([...objects, newObject]);
    setSelectedObject(newObject.id);
  };

  // Eliminar un objeto
  const handleDeleteObject = (objectId) => {
    setObjects(objects.filter((obj) => obj.id !== objectId));
    if (selectedObject === objectId) {
      setSelectedObject(null);
    }
  };

  // Duplicar un objeto
  const handleDuplicateObject = (objectId) => {
    const objectToDuplicate = objects.find((obj) => obj.id === objectId);
    if (objectToDuplicate) {
      const duplicatedObject = {
        ...objectToDuplicate,
        id: `obj-${Date.now()}-${Math.random()}`,
        position: [
          objectToDuplicate.position[0] + 2, // Desplazar 2 unidades en X
          objectToDuplicate.position[1],
          objectToDuplicate.position[2],
        ],
      };
      setObjects([...objects, duplicatedObject]);
      setSelectedObject(duplicatedObject.id);
    }
  };

  // Crear un mapa de índices para acceso O(1) en lugar de O(n)
  const objectIndexMap = useMemo(() => {
    const map = new Map();
    objects.forEach((obj, index) => {
      map.set(obj.id, index);
    });
    return map;
  }, [objects]);

  // Actualizar propiedades de un objeto - OPTIMIZADO
  // En lugar de .map() completo, actualizamos solo el objeto específico
  const handleUpdateObject = useCallback((objectId, updates) => {
    setObjects((prevObjects) => {
      // Buscar índice del objeto (O(n) pero solo una vez)
      const index = prevObjects.findIndex((obj) => obj.id === objectId);
      
      if (index === -1) {
        // Objeto no encontrado, retornar array sin cambios
        return prevObjects;
      }

      // Crear nuevo array con solo el objeto actualizado
      const newObjects = [...prevObjects];
      newObjects[index] = { ...newObjects[index], ...updates };
      
      return newObjects;
    });
  }, []); // Sin dependencias - usa función de actualización de estado

  // Obtener el objeto seleccionado - MEMOIZADO para evitar recálculo
  const selectedObjectData = useMemo(() => {
    if (!selectedObject) return null;
    return objects.find((obj) => obj.id === selectedObject);
  }, [objects, selectedObject]);

  return (
    <div className="level-editor">
      <Toolbar
        objects={objects}
        onSave={handleSave}
        onExport={handleExport}
        onCopy={handleCopy}
        currentLevel={currentLevel}
        loading={levelLoading}
      />
      <div className="toolbar-level-selector">
        <LevelSelector
          levels={levels}
          currentLevel={currentLevel}
          onSelectLevel={handleSelectLevel}
          onCreateNew={handleCreateNew}
          onDeleteLevel={handleDeleteLevel}
          loading={levelLoading}
        />
      </div>
      {levelError && (
        <div className="error-message">
          ⚠️ {levelError}
        </div>
      )}
      <div className="editor-layout">
        <ObjectLibrary
          models={availableModels}
          onAddObject={handleAddObject}
        />
        <EditorCanvas
          objects={objects}
          selectedObject={selectedObject}
          onSelectObject={setSelectedObject}
          onUpdateObject={handleUpdateObject}
          transformMode={transformMode}
          snapEnabled={snapEnabled}
          snapSize={snapSize}
        />
        <PropertiesPanel
          object={selectedObjectData}
          onUpdate={(updates) =>
            selectedObject &&
            handleUpdateObject(selectedObject, updates)
          }
          onDelete={() =>
            selectedObject && handleDeleteObject(selectedObject)
          }
          onDuplicate={() =>
            selectedObject && handleDuplicateObject(selectedObject)
          }
          onToggleControls={() => setShowEditorControls(!showEditorControls)}
        />
      </div>
      {/* Controles del editor fuera del editor-layout para posicionamiento fijo */}
      {showEditorControls && (
        <EditorControls
          transformMode={transformMode}
          onModeChange={setTransformMode}
          snapEnabled={snapEnabled}
          onSnapToggle={setSnapEnabled}
          onDelete={() =>
            selectedObject && handleDeleteObject(selectedObject)
          }
          onDuplicate={() =>
            selectedObject && handleDuplicateObject(selectedObject)
          }
          onClose={() => setShowEditorControls(false)}
        />
      )}
    </div>
  );
};

