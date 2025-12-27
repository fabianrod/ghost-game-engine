import { useState, useEffect, useMemo, useCallback } from 'react';
import { EditorCanvas } from './EditorCanvas';
import { ObjectLibrary } from './ObjectLibrary';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';
import { EditorControls } from './EditorControls';
import './LevelEditor.css';
import { useLevelManager } from '../../hooks/useLevelManager';

/**
 * Componente principal del editor de niveles
 * Maneja el estado global del editor y la interfaz
 */
export const LevelEditor = ({ mode, onModeChange }) => {
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

  // Cargar lista de modelos disponibles desde src/assets/models/
  useEffect(() => {
    // Usar import.meta.glob de Vite para cargar automáticamente todos los .glb
    // En Vite, los assets importados devuelven la URL como string
    const modelModules = import.meta.glob('../../assets/models/*.glb', { 
      eager: true,
      import: 'default'
    });
    
    // Convertir los módulos importados a un array de modelos
    const models = Object.entries(modelModules).map(([path, module]) => {
      // Extraer el nombre del archivo de la ruta
      const fileName = path.split('/').pop().replace('.glb', '');
      // Generar un nombre amigable (reemplazar guiones y capitalizar)
      const friendlyName = fileName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(/_/g, ' '); // También reemplazar guiones bajos
      
      // En Vite, cuando importas un asset con eager: true, el módulo es la URL directamente
      // o puede estar en module.default
      let modelUrl;
      if (typeof module === 'string') {
        modelUrl = module;
      } else if (module && typeof module === 'object' && 'default' in module) {
        modelUrl = module.default;
      } else {
        // Fallback: usar la ruta original (no debería llegar aquí)
        console.warn('No se pudo obtener URL para:', path, module);
        modelUrl = path;
      }
      
      return {
        name: friendlyName,
        path: modelUrl,
      };
    });
    
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

  // Sincronizar con cambios en localStorage (cuando se selecciona un nivel desde App.jsx)
  useEffect(() => {
    const checkForLevelChanges = () => {
      // Verificar si hay un nivel en localStorage que no coincide con el actual
      try {
        const filename = currentLevel?.filename || 'level1.json';
        const cachedData = localStorage.getItem(`level_${filename}`);
        const cachedTimestamp = localStorage.getItem(`level_${filename}_timestamp`);
        
        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const age = Date.now() - timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 horas
          
          if (age < maxAge) {
            try {
              const data = JSON.parse(cachedData);
              // Solo actualizar si el nivel es diferente
              if (!currentLevel || 
                  currentLevel.filename !== filename || 
                  JSON.stringify(currentLevel.data) !== JSON.stringify(data)) {
                console.log(`🔄 Sincronizando nivel desde localStorage: ${filename}`);
                setCurrentLevel({ filename, data });
              }
            } catch (parseErr) {
              console.warn('Error parseando datos de localStorage:', parseErr);
            }
          }
        }
      } catch (storageErr) {
        console.warn('Error accediendo a localStorage:', storageErr);
      }
    };

    // Verificar cada segundo si hay cambios en localStorage
    const interval = setInterval(checkForLevelChanges, 1000);
    
    return () => clearInterval(interval);
  }, [currentLevel, setCurrentLevel]);

  // Guardar automáticamente en localStorage cada vez que cambian los objetos
  // Esto permite que los cambios se reflejen inmediatamente en el modo juego
  useEffect(() => {
    // Solo guardar si hay objetos o si hay un nivel cargado
    // Evitar guardar en el montaje inicial antes de que se cargue el nivel
    if (!currentLevel && objects.length === 0) {
      return;
    }

    // Determinar el nombre del archivo del nivel actual (usar level1.json por defecto)
    const filename = currentLevel?.filename || 'level1.json';
    
    // Preparar datos del nivel sin los IDs internos del editor
    const levelData = {
      name: currentLevel?.data?.name || 'Nivel Editado',
      description: currentLevel?.data?.description || 'Nivel creado en el editor',
      objects: objects.map(({ id, ...obj }) => obj),
    };

    // Guardar en localStorage automáticamente
    try {
      const jsonString = JSON.stringify(levelData, null, 2);
      localStorage.setItem(`level_${filename}`, jsonString);
      localStorage.setItem(`level_${filename}_timestamp`, Date.now().toString());
      // Solo loguear si hay cambios significativos para no saturar la consola
      if (objects.length > 0) {
        console.log(`💾 Cambios guardados automáticamente en localStorage: ${filename} (${objects.length} objetos)`);
      }
    } catch (storageErr) {
      console.warn('No se pudo guardar en localStorage:', storageErr);
    }
  }, [objects, currentLevel]); // Se ejecuta cada vez que cambian los objetos o el nivel actual

  // Inicializar con nivel nuevo si no hay nivel cargado
  // Primero intentar cargar desde localStorage si hay cambios sin guardar
  useEffect(() => {
    if (!currentLevel) {
      // Intentar cargar desde localStorage primero (cambios sin guardar)
      const tryLoadFromLocalStorage = () => {
        try {
          // Intentar con level1.json por defecto
          const filename = 'level1.json';
          const cachedData = localStorage.getItem(`level_${filename}`);
          const cachedTimestamp = localStorage.getItem(`level_${filename}_timestamp`);
          
          if (cachedData && cachedTimestamp) {
            // Verificar que el cache no sea muy antiguo (más de 24 horas)
            const timestamp = parseInt(cachedTimestamp, 10);
            const age = Date.now() - timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas
            
            if (age < maxAge) {
              try {
                const data = JSON.parse(cachedData);
                console.log(`✅ Cargando cambios sin guardar desde localStorage: ${filename}`);
                setCurrentLevel({ filename, data });
                // Los objetos se cargarán en el useEffect que depende de currentLevel
                return true;
              } catch (parseErr) {
                console.warn('Error parseando datos de localStorage:', parseErr);
              }
            } else {
              // Cache muy antiguo, limpiarlo
              localStorage.removeItem(`level_${filename}`);
              localStorage.removeItem(`level_${filename}_timestamp`);
            }
          }
        } catch (storageErr) {
          console.warn('Error accediendo a localStorage:', storageErr);
        }
        return false;
      };

      // Si no hay datos en localStorage, crear nivel nuevo
      if (!tryLoadFromLocalStorage()) {
        const newLevel = createNewLevel();
        setCurrentLevel({ filename: null, data: newLevel });
        setObjects([]);
      }
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
        mode={mode}
        onModeChange={onModeChange}
        levels={levels}
        onSelectLevel={handleSelectLevel}
        onCreateNew={handleCreateNew}
        onDeleteLevel={handleDeleteLevel}
        levelLoading={levelLoading}
      />
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

