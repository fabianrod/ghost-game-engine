/**
 * Utilidades matemáticas compartidas
 * Centraliza operaciones matemáticas comunes para evitar duplicación
 */

import { DEG_TO_RAD, RAD_TO_DEG } from '../constants/gameConstants';

/**
 * Convierte grados a radianes
 * @param {number|Array<number>} degrees - Grados a convertir
 * @returns {number|Array<number>} Radianes convertidos
 */
export function degreesToRadians(degrees) {
  if (Array.isArray(degrees)) {
    return degrees.map(deg => deg * DEG_TO_RAD);
  }
  return degrees * DEG_TO_RAD;
}

/**
 * Convierte radianes a grados
 * @param {number|Array<number>} radians - Radianes a convertir
 * @returns {number|Array<number>} Grados convertidos
 */
export function radiansToDegrees(radians) {
  if (Array.isArray(radians)) {
    return radians.map(rad => rad * RAD_TO_DEG);
  }
  return radians * RAD_TO_DEG;
}

/**
 * Aplica snap a un valor
 * @param {number} value - Valor a ajustar
 * @param {number} snapSize - Tamaño del snap
 * @param {boolean} enabled - Si el snap está habilitado
 * @returns {number} Valor con snap aplicado
 */
export function applySnap(value, snapSize = 1, enabled = true) {
  if (!enabled) return value;
  return Math.round(value / snapSize) * snapSize;
}

/**
 * Aplica snap a un vector 3D
 * @param {Array<number>} vector - Vector [x, y, z]
 * @param {number} snapSize - Tamaño del snap
 * @param {boolean} enabled - Si el snap está habilitado
 * @returns {Array<number>} Vector con snap aplicado
 */
export function applySnapToVector(vector, snapSize = 1, enabled = true) {
  if (!enabled || !Array.isArray(vector) || vector.length < 3) {
    return vector;
  }
  return [
    applySnap(vector[0], snapSize, enabled),
    applySnap(vector[1], snapSize, enabled),
    applySnap(vector[2], snapSize, enabled),
  ];
}

/**
 * Limita un valor entre min y max
 * @param {number} value - Valor a limitar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} Valor limitado
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Limita un vector 3D entre valores min y max
 * @param {Array<number>} vector - Vector a limitar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {Array<number>} Vector limitado
 */
export function clampVector(vector, min, max) {
  if (!Array.isArray(vector) || vector.length < 3) {
    return vector;
  }
  return [
    clamp(vector[0], min, max),
    clamp(vector[1], min, max),
    clamp(vector[2], min, max),
  ];
}

/**
 * Valida si un número es válido (no NaN, no Infinity)
 * @param {number} value - Valor a validar
 * @param {number} defaultValue - Valor por defecto si es inválido
 * @returns {number} Valor válido
 */
export function validateNumber(value, defaultValue = 0) {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * Valida y normaliza un vector 3D
 * @param {Array<number>} vector - Vector a validar
 * @param {Array<number>} defaultValue - Vector por defecto
 * @returns {Array<number>} Vector válido
 */
export function validateVector(vector, defaultValue = [0, 0, 0]) {
  if (!Array.isArray(vector) || vector.length < 3) {
    return defaultValue;
  }
  return [
    validateNumber(vector[0], defaultValue[0]),
    validateNumber(vector[1], defaultValue[1]),
    validateNumber(vector[2], defaultValue[2]),
  ];
}

/**
 * Calcula la distancia entre dos puntos 3D
 * @param {Array<number>} point1 - Primer punto [x, y, z]
 * @param {Array<number>} point2 - Segundo punto [x, y, z]
 * @returns {number} Distancia
 */
export function distance3D(point1, point2) {
  if (!Array.isArray(point1) || !Array.isArray(point2) || point1.length < 3 || point2.length < 3) {
    return 0;
  }
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  const dz = point2[2] - point1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compara dos valores con una tolerancia
 * @param {number} a - Primer valor
 * @param {number} b - Segundo valor
 * @param {number} tolerance - Tolerancia (por defecto 0.001)
 * @returns {boolean} True si la diferencia es menor que la tolerancia
 */
export function isEqual(a, b, tolerance = 0.001) {
  return Math.abs(a - b) < tolerance;
}

/**
 * Compara dos vectores 3D con tolerancia
 * @param {Array<number>} vec1 - Primer vector
 * @param {Array<number>} vec2 - Segundo vector
 * @param {number} tolerance - Tolerancia (por defecto 0.001)
 * @returns {boolean} True si los vectores son iguales dentro de la tolerancia
 */
export function isVectorEqual(vec1, vec2, tolerance = 0.001) {
  if (!Array.isArray(vec1) || !Array.isArray(vec2) || vec1.length < 3 || vec2.length < 3) {
    return false;
  }
  return (
    isEqual(vec1[0], vec2[0], tolerance) &&
    isEqual(vec1[1], vec2[1], tolerance) &&
    isEqual(vec1[2], vec2[2], tolerance)
  );
}

