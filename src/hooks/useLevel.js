import { useState, useEffect } from 'react';
import { loadLevelFromStorage } from '../utils/storageUtils';

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
    const cachedData = loadLevelFromStorage(filename);
    if (cachedData) {
      setLevelData(cachedData);
      setLoading(false);
      return;
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
        setLevelData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [levelPath]);

  return { levelData, loading, error };
};

