import { useState, useEffect, useMemo, useCallback } from 'react';
import { EditorCanvas } from './EditorCanvas';
import { ObjectLibrary } from './ObjectLibrary';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';
import { EditorControls } from './EditorControls';
import './LevelEditor.css';
import { useLevelManager } from '../../hooks/useLevelManager';
import { EDITOR_CONFIG, LEVEL_DEFAULTS } from '../../constants/gameConstants';
import { saveLevelToStorage, loadLevelFromStorage } from '../../utils/storageUtils';
import { prepareLevelDataForSave, createNewObject, createNewCollider, duplicateObject, normalizeModelPath } from '../../utils/objectUtils';

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
  const [snapSize, setSnapSize] = useState(EDITOR_CONFIG.DEFAULT_SNAP_SIZE);
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
      console.log('📦 Cargando objetos del nivel:', currentLevel.data.objects.length, 'objetos');
      
      // Preservar la selección actual y los IDs existentes
      const currentSelectedId = selectedObject;
      const existingObjectsMap = new Map();
      objects.forEach(obj => {
        // Crear un mapa de objetos existentes usando posición como clave (más estable que ID)
        const key = `${obj.position[0]},${obj.position[1]},${obj.position[2]}`;
        existingObjectsMap.set(key, obj.id);
      });
      
      // Convertir objetos del nivel a formato del editor
      // IMPORTANTE: Preservar IDs existentes usando posición como referencia
      const editorObjects = currentLevel.data.objects.map((obj, index) => {
        const key = `${obj.position[0]},${obj.position[1]},${obj.position[2]}`;
        const existingId = existingObjectsMap.get(key);
        
        // Normalizar la ruta del modelo si es necesario
        const modelPath = normalizeModelPath(obj.model, availableModels);
        if (modelPath !== obj.model) {
          console.log(`🔄 Ruta de modelo normalizada: ${obj.model} -> ${modelPath}`);
        }
        
        const editorObj = {
          ...obj,
          model: modelPath || obj.model,
          // Preservar ID existente si encontramos un objeto en la misma posición
          // De lo contrario, generar uno nuevo solo si no tiene ID
          id: existingId || obj.id || `obj-${index}-${Date.now()}-${Math.random()}`,
          // Solo agregar colliderScale a objetos normales, no a colliders
          ...(obj.type !== 'collider' && { colliderScale: obj.colliderScale || [0.8, 0.8, 0.8] }),
        };
        
        console.log(`  ✓ Objeto ${index}:`, {
          type: editorObj.type,
          model: editorObj.model,
          position: editorObj.position,
          id: editorObj.id
        });
        
        return editorObj;
      });
      
      console.log(`✅ ${editorObjects.length} objetos cargados en el editor`);
      setObjects(editorObjects);
      
      // Si había un objeto seleccionado, mantenerlo si todavía existe
      if (currentSelectedId) {
        const stillExists = editorObjects.some(obj => obj.id === currentSelectedId);
        if (!stillExists) {
          // El objeto ya no existe, pero NO deseleccionar automáticamente
          // Solo deseleccionar si el usuario lo hace explícitamente
          // setSelectedObject(null); // COMENTADO: No deseleccionar automáticamente
        }
      }
    } else if (currentLevel && currentLevel.data) {
      // Nivel sin objetos
      console.log('📦 Nivel sin objetos');
      setObjects([]);
      // NO deseleccionar automáticamente - solo si el usuario lo hace explícitamente
      // if (selectedObject) {
      //   setSelectedObject(null);
      // }
    } else if (!currentLevel) {
      console.log('📦 No hay nivel cargado');
    }
  }, [currentLevel, availableModels]); // Incluir availableModels para normalizar rutas

  // Sincronizar con cambios en localStorage (cuando se selecciona un nivel desde App.jsx)
  useEffect(() => {
    const checkForLevelChanges = () => {
      // Verificar si hay un nivel en localStorage que no coincide con el actual
      try {
        const filename = currentLevel?.filename || 'level1.json';
        const cachedData = loadLevelFromStorage(filename);
        
        if (cachedData) {
          // Solo actualizar si el nivel es diferente
          // IMPORTANTE: No actualizar si hay un objeto seleccionado para evitar deselección
          if (!currentLevel || 
              currentLevel.filename !== filename || 
              JSON.stringify(currentLevel.data) !== JSON.stringify(cachedData)) {
            console.log(`🔄 Sincronizando nivel desde localStorage: ${filename}`);
            setCurrentLevel({ filename, data: cachedData });
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
    const levelData = prepareLevelDataForSave(objects, currentLevel?.data);

    // Guardar en localStorage automáticamente
    if (saveLevelToStorage(filename, levelData) && objects.length > 0) {
      console.log(`💾 Cambios guardados automáticamente en localStorage: ${filename} (${objects.length} objetos)`);
    }
  }, [objects, currentLevel]); // Se ejecuta cada vez que cambian los objetos o el nivel actual

  // Inicializar con nivel nuevo si no hay nivel cargado
  // Primero intentar cargar desde localStorage si hay cambios sin guardar
  // Luego intentar cargar desde archivo
  useEffect(() => {
    if (!currentLevel) {
      console.log('🔍 Inicializando editor: buscando nivel...');
      
      // Intentar cargar desde localStorage primero (cambios sin guardar)
      const tryLoadFromLocalStorage = () => {
        try {
          // Intentar con level1.json por defecto
          const filename = 'level1.json';
          const cachedData = loadLevelFromStorage(filename);
          
          if (cachedData) {
            console.log(`✅ Cargando cambios sin guardar desde localStorage: ${filename}`);
            setCurrentLevel({ filename, data: cachedData });
            // Los objetos se cargarán en el useEffect que depende de currentLevel
            return true;
          }
        } catch (storageErr) {
          console.warn('Error accediendo a localStorage:', storageErr);
        }
        return false;
      };

      // Si no hay datos en localStorage, intentar cargar desde archivo
      const tryLoadFromFile = async () => {
        try {
          const filename = 'level1.json';
          console.log(`📂 Intentando cargar nivel desde archivo: ${filename}`);
          const levelData = await loadLevel(filename);
          if (levelData) {
            console.log(`✅ Nivel cargado desde archivo: ${filename}`);
            return true;
          }
        } catch (err) {
          console.warn('No se pudo cargar nivel desde archivo:', err.message);
        }
        return false;
      };

      // Intentar cargar desde localStorage primero
      if (!tryLoadFromLocalStorage()) {
        // Si no hay en localStorage, intentar desde archivo
        tryLoadFromFile().then(loaded => {
          if (!loaded) {
            // Si no se pudo cargar, crear nivel nuevo
            console.log('📝 Creando nivel nuevo');
            const newLevel = createNewLevel();
            setCurrentLevel({ filename: null, data: newLevel });
            setObjects([]);
          }
        });
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
  const handleSave = useCallback(async () => {
    try {
      // Preparar datos del nivel
      const levelData = prepareLevelDataForSave(objects, currentLevel?.data);

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
  }, [objects, currentLevel, validateLevel, saveLevel, listLevels, levels.length]);

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
  const handleAddObject = useCallback((modelPath) => {
    const newObject = createNewObject({ model: modelPath });
    setObjects((prev) => [...prev, newObject]);
    setSelectedObject(newObject.id);
  }, []);

  // Agregar un collider invisible al nivel
  const handleAddCollider = useCallback((colliderType) => {
    const newCollider = createNewCollider(colliderType);
    setObjects((prev) => [...prev, newCollider]);
    setSelectedObject(newCollider.id);
  }, []);

  // Eliminar un objeto
  const handleDeleteObject = (objectId) => {
    setObjects(objects.filter((obj) => obj.id !== objectId));
    if (selectedObject === objectId) {
      setSelectedObject(null);
    }
  };

  // Listener para atajos de teclado: eliminar objetos, cambiar modo de transformación, duplicar
  useEffect(() => {
    // Función para eliminar el objeto seleccionado
    const deleteSelectedObject = () => {
      if (!selectedObject) return;
      
      console.log('[LevelEditor] Eliminando objeto:', selectedObject);
      setObjects((prevObjects) => {
        const filtered = prevObjects.filter((obj) => obj.id !== selectedObject);
        console.log('[LevelEditor] Objetos después de eliminar:', filtered.length);
        return filtered;
      });
      setSelectedObject(null);
    };

    const handleKeyDown = (event) => {
      // Solo procesar si hay un objeto seleccionado (excepto para algunos atajos globales)
      const needsSelection = ['m', 'r', 's', 'Delete', 'Backspace'].includes(event.key);
      if (needsSelection && !selectedObject) {
        return;
      }
      
      // Verificar que no estemos escribiendo en un input o textarea
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      
      const key = event.key.toLowerCase();
      
      // Atajos de transformación: M (mover), R (rotar), S (escalar)
      if (selectedObject) {
        switch (key) {
          case 'm':
            event.preventDefault();
            setTransformMode('translate');
            break;
          case 'r':
            event.preventDefault();
            setTransformMode('rotate');
            break;
          case 's':
            event.preventDefault();
            setTransformMode('scale');
            break;
        }
      }
      
      // Detectar tecla Delete o Suprimir
      const isDeleteKey = 
        event.key === 'Delete' || 
        event.key === 'Backspace' || 
        event.code === 'Delete' ||
        event.keyCode === 46 || // Delete key code
        event.keyCode === 8;    // Backspace key code
      
      if (isDeleteKey && selectedObject) {
        console.log('[LevelEditor] Tecla Delete detectada');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        deleteSelectedObject();
        return false;
      }
      
      // Atajo para duplicar con Ctrl+D
      if ((event.ctrlKey || event.metaKey) && key === 'd' && selectedObject) {
        event.preventDefault();
        const objectToDuplicate = objects.find((obj) => obj.id === selectedObject);
        if (objectToDuplicate) {
          const duplicatedObject = duplicateObject(objectToDuplicate);
          setObjects((prevObjects) => [...prevObjects, duplicatedObject]);
          setSelectedObject(duplicatedObject.id);
        }
      }
    };

    // Agregar listener a window con fase de captura para interceptar antes que otros listeners
    window.addEventListener('keydown', handleKeyDown, true);
    
    // También agregar listener al canvas si existe (para cuando el canvas tiene el foco)
    // Usar un pequeño delay para asegurar que el canvas esté renderizado
    const setupCanvasListener = () => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.addEventListener('keydown', handleKeyDown, true);
        // Asegurar que el canvas pueda recibir eventos de teclado
        if (!canvas.hasAttribute('tabindex')) {
          canvas.setAttribute('tabindex', '0');
        }
        return canvas;
      }
      return null;
    };
    
    // Intentar configurar el listener del canvas inmediatamente y con un pequeño delay
    let canvas = setupCanvasListener();
    const timeoutId = setTimeout(() => {
      if (!canvas) {
        canvas = setupCanvasListener();
      }
    }, 100);
    
    // Limpiar listeners al desmontar
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (canvas) {
        canvas.removeEventListener('keydown', handleKeyDown, true);
      }
    };
  }, [selectedObject, objects]); // Incluir objects para poder duplicar

  // Duplicar un objeto
  const handleDuplicateObject = useCallback((objectId) => {
    const objectToDuplicate = objects.find((obj) => obj.id === objectId);
    if (objectToDuplicate) {
      const duplicatedObject = duplicateObject(objectToDuplicate);
      setObjects((prev) => [...prev, duplicatedObject]);
      setSelectedObject(duplicatedObject.id);
    }
  }, [objects]);

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
          onAddCollider={handleAddCollider}
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

