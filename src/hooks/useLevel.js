import { useState, useEffect } from 'react';

/**
 * Hook para cargar datos de un nivel desde un archivo JSON
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

    // Cargar el archivo JSON
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
        console.error('Error cargando nivel:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [levelPath]);

  return { levelData, loading, error };
};

