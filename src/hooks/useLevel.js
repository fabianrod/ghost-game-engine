import { useState, useEffect } from 'react';

/**
 * Hook para cargar datos de un nivel desde un archivo JSON
 * Primero intenta cargar desde localStorage (si fue guardado desde el editor),
 * luego desde el archivo JSON
 * @param {string} levelPath - Ruta al archivo JSON del nivel
 * @returns {Object} { levelData, loading, error }
 */
export const useLevel = (levelPath) => {
  const [levelData, setLevelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!levelPath) {
      setError('No se proporcionó una ruta de nivel');
      setLoading(false);
      return;
    }

    // Extraer el nombre del archivo de la ruta (ej: "/levels/level1.json" -> "level1.json")
    const filename = levelPath.split('/').pop();
    
    // Primero intentar cargar desde localStorage (si fue guardado desde el editor)
    const tryLoadFromLocalStorage = () => {
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
              console.log(`✅ Nivel cargado desde localStorage: ${filename}`);
              setLevelData(data);
              setLoading(false);
              return true;
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
      return false;
    };

    // Intentar cargar desde localStorage primero
    if (tryLoadFromLocalStorage()) {
      return; // Ya cargamos desde localStorage
    }

    // Si no hay datos en localStorage, cargar desde el archivo JSON
    fetch(levelPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error al cargar el nivel: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log(`✅ Nivel cargado desde archivo: ${levelPath}`);
        setLevelData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando nivel:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [levelPath]);

  return { levelData, loading, error };
};

