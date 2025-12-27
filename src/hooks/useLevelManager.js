import { useState, useEffect } from 'react';

/**
 * Hook para gestionar niveles: guardar, cargar, listar, crear, eliminar
 */
export const useLevelManager = () => {
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Listar niveles disponibles
  const listLevels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // En desarrollo, podemos leer desde /public/levels/
      // En producción, esto requeriría un backend
      // Por ahora, usamos una lista estática que se puede expandir
      const levelFiles = [
        'level1.json',
        'level2.json',
        'level3.json',
      ];

      // Verificar qué archivos realmente existen
      const existingLevels = [];
      for (const file of levelFiles) {
        try {
          const response = await fetch(`/levels/${file}`);
          if (response.ok) {
            const data = await response.json();
            existingLevels.push({
              filename: file,
              name: data.name || file.replace('.json', ''),
              description: data.description || '',
            });
          }
        } catch (err) {
          // Archivo no existe, continuar
        }
      }

      setLevels(existingLevels);
      return existingLevels;
    } catch (err) {
      setError(`Error al listar niveles: ${err.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Cargar un nivel
  const loadLevel = async (filename) => {
    try {
      setLoading(true);
      setError(null);
      
      // Primero intentar cargar desde localStorage (cambios sin guardar)
      try {
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
              console.log(`✅ Cargando nivel desde localStorage (cambios sin guardar): ${filename}`);
              setCurrentLevel({ filename, data });
              return data;
            } catch (parseErr) {
              console.warn('Error parseando datos de localStorage:', parseErr);
              // Continuar con carga desde archivo
            }
          } else {
            // Cache muy antiguo, limpiarlo
            localStorage.removeItem(`level_${filename}`);
            localStorage.removeItem(`level_${filename}_timestamp`);
          }
        }
      } catch (storageErr) {
        console.warn('Error accediendo a localStorage:', storageErr);
        // Continuar con carga desde archivo
      }
      
      // Si no hay datos en localStorage, cargar desde el archivo JSON
      const response = await fetch(`/levels/${filename}`);
      if (!response.ok) {
        throw new Error(`No se pudo cargar el nivel: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Cargando nivel desde archivo: ${filename}`);
      setCurrentLevel({ filename, data });
      return data;
    } catch (err) {
      setError(`Error al cargar nivel: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Guardar un nivel
  const saveLevel = async (filename, levelData) => {
    try {
      setLoading(true);
      setError(null);

      // Validar datos del nivel
      if (!levelData || !levelData.objects || !Array.isArray(levelData.objects)) {
        throw new Error('Datos del nivel inválidos');
      }

      // Crear el JSON
      const jsonString = JSON.stringify(levelData, null, 2);
      
      // Guardar también en localStorage para sincronización inmediata con el modo juego
      // Esto permite que los cambios se reflejen sin necesidad de guardar archivos manualmente
      try {
        localStorage.setItem(`level_${filename}`, jsonString);
        localStorage.setItem(`level_${filename}_timestamp`, Date.now().toString());
      } catch (storageErr) {
        console.warn('No se pudo guardar en localStorage:', storageErr);
      }
      
      // En el navegador, no podemos escribir directamente al sistema de archivos
      // Usamos el File System Access API si está disponible, o descarga
      if ('showSaveFilePicker' in window) {
        // File System Access API (Chrome/Edge)
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] },
            }],
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          
          // Actualizar lista de niveles
          await listLevels();
          
          // Mostrar mensaje informativo
          if (filename === 'level1.json') {
            console.log('✅ Nivel guardado. Los cambios ya están disponibles en el modo juego gracias a localStorage.');
          }
          return true;
        } catch (err) {
          if (err.name !== 'AbortError') {
            throw err;
          }
          return false; // Usuario canceló
        }
      } else {
        // Fallback: descargar archivo
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Mostrar mensaje al usuario
        if (filename === 'level1.json') {
          alert(`✅ Nivel guardado como ${filename}.\n\nLos cambios ya están disponibles en el modo juego.\n\nSi quieres guardar permanentemente, coloca el archivo descargado en /public/levels/`);
        } else {
          alert(`Nivel guardado como ${filename}. Por favor, colócalo manualmente en /public/levels/`);
        }
        return true;
      }
    } catch (err) {
      setError(`Error al guardar nivel: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo nivel
  const createNewLevel = (name = 'Nuevo Nivel') => {
    const newLevel = {
      name,
      description: 'Nivel creado en el editor',
      objects: [],
    };
    setCurrentLevel({ filename: null, data: newLevel });
    return newLevel;
  };

  // Validar datos del nivel
  const validateLevel = (levelData) => {
    if (!levelData) {
      return { valid: false, error: 'No hay datos del nivel' };
    }

    if (!levelData.objects || !Array.isArray(levelData.objects)) {
      return { valid: false, error: 'El nivel debe tener un array de objetos' };
    }

    for (let i = 0; i < levelData.objects.length; i++) {
      const obj = levelData.objects[i];
      if (!obj.model) {
        return { valid: false, error: `Objeto ${i} no tiene modelo` };
      }
      if (!obj.position || !Array.isArray(obj.position) || obj.position.length !== 3) {
        return { valid: false, error: `Objeto ${i} tiene posición inválida` };
      }
    }

    return { valid: true };
  };

  // Cargar lista de niveles al montar
  useEffect(() => {
    listLevels();
  }, []);

  return {
    levels,
    currentLevel,
    loading,
    error,
    listLevels,
    loadLevel,
    saveLevel,
    createNewLevel,
    validateLevel,
    setCurrentLevel,
  };
};

