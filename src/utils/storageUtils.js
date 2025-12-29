/**
 * Utilidades para manejo de localStorage
 * Centraliza operaciones de almacenamiento local
 */

import { STORAGE_KEYS, LEVEL_DEFAULTS } from '../constants/gameConstants';

/**
 * Obtiene la clave de localStorage para un nivel
 * @param {string} filename - Nombre del archivo del nivel
 * @returns {string} Clave de localStorage
 */
export function getLevelStorageKey(filename) {
  return `${STORAGE_KEYS.LEVEL_PREFIX}${filename}`;
}

/**
 * Obtiene la clave de timestamp para un nivel
 * @param {string} filename - Nombre del archivo del nivel
 * @returns {string} Clave de timestamp
 */
export function getTimestampStorageKey(filename) {
  return `${STORAGE_KEYS.LEVEL_PREFIX}${filename}${STORAGE_KEYS.TIMESTAMP_SUFFIX}`;
}

/**
 * Guarda un nivel en localStorage
 * @param {string} filename - Nombre del archivo
 * @param {Object} levelData - Datos del nivel
 * @returns {boolean} True si se guardó exitosamente
 */
export function saveLevelToStorage(filename, levelData) {
  try {
    const jsonString = JSON.stringify(levelData, null, 2);
    const levelKey = getLevelStorageKey(filename);
    const timestampKey = getTimestampStorageKey(filename);
    
    localStorage.setItem(levelKey, jsonString);
    localStorage.setItem(timestampKey, Date.now().toString());
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Carga un nivel desde localStorage
 * @param {string} filename - Nombre del archivo
 * @returns {Object|null} Datos del nivel o null si no existe o es inválido
 */
export function loadLevelFromStorage(filename) {
  try {
    const levelKey = getLevelStorageKey(filename);
    const timestampKey = getTimestampStorageKey(filename);
    
    const cachedData = localStorage.getItem(levelKey);
    const cachedTimestamp = localStorage.getItem(timestampKey);
    
    if (!cachedData || !cachedTimestamp) {
      return null;
    }
    
    // Verificar que el cache no sea muy antiguo
    const timestamp = parseInt(cachedTimestamp, 10);
    const age = Date.now() - timestamp;
    
    if (age > LEVEL_DEFAULTS.CACHE_MAX_AGE) {
      // Cache muy antiguo, limpiarlo
      localStorage.removeItem(levelKey);
      localStorage.removeItem(timestampKey);
      return null;
    }
    
    const data = JSON.parse(cachedData);
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Elimina un nivel de localStorage
 * @param {string} filename - Nombre del archivo
 */
export function removeLevelFromStorage(filename) {
  try {
    const levelKey = getLevelStorageKey(filename);
    const timestampKey = getTimestampStorageKey(filename);
    localStorage.removeItem(levelKey);
    localStorage.removeItem(timestampKey);
  } catch (error) {
    // Error eliminando de localStorage
  }
}

/**
 * Verifica si un nivel existe en localStorage
 * @param {string} filename - Nombre del archivo
 * @returns {boolean} True si existe
 */
export function levelExistsInStorage(filename) {
  const levelKey = getLevelStorageKey(filename);
  return localStorage.getItem(levelKey) !== null;
}

