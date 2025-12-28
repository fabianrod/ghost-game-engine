/**
 * Calcula los parámetros de un collider cilíndrico basado en la escala
 * @param {Object} params - Parámetros del collider
 * @param {string} params.type - Tipo de collider ('cylinder')
 * @param {Array<number>} params.position - Posición [x, y, z]
 * @param {Array<number>} params.scale - Escala [radioX, alturaY, radioZ]
 * @param {Array<number>} params.rotation - Rotación [x, y, z] en radianes
 * @returns {Object|null} Parámetros del collider: { radius, halfHeight, height, rotation }
 */
export function calculateCylinderCollider({ type, position, scale, rotation }) {
  try {
    if (type !== 'cylinder') {
      console.warn('[calculateCylinderCollider] Tipo de collider no soportado:', type);
      return null;
    }

    // Validar y normalizar scale
    if (!scale || !Array.isArray(scale) || scale.length < 3) {
      console.warn('[calculateCylinderCollider] Escala inválida, usando valores por defecto:', scale);
      scale = [1, 1, 1];
    }

    // Asegurar que todos los valores sean números válidos
    const radiusX = typeof scale[0] === 'number' && !isNaN(scale[0]) ? Math.max(0.1, scale[0]) : 1;
    const radiusZ = typeof scale[2] === 'number' && !isNaN(scale[2]) ? Math.max(0.1, scale[2]) : 1;
    const heightY = typeof scale[1] === 'number' && !isNaN(scale[1]) ? Math.max(0.1, scale[1]) : 1;

    // Para un cilindro, scale[0] y scale[2] representan el radio en X y Z
    // scale[1] representa la altura en Y
    // Usamos el promedio de los radios X y Z para el radio del collider
    const radius = (radiusX + radiusZ) / 2;

    // La altura es scale[1]
    const height = heightY;
    const halfHeight = height / 2;

    // Validar rotation
    const validRotation = Array.isArray(rotation) && rotation.length >= 3
      ? rotation.map(r => typeof r === 'number' && !isNaN(r) ? r : 0)
      : [0, 0, 0];

    return {
      radius,
      halfHeight,
      height,
      rotation: validRotation,
    };
  } catch (error) {
    console.error('[calculateCylinderCollider] Error calculando collider:', error);
    // Retornar valores por defecto seguros en caso de error
    return {
      radius: 1,
      halfHeight: 0.5,
      height: 1,
      rotation: [0, 0, 0],
    };
  }
}

/**
 * Calcula la altura total de una cápsula (cilindro con semiesferas en los extremos)
 * @param {number} halfHeight - La mitad de la altura del cilindro
 * @param {number} radius - El radio de la cápsula
 * @returns {number} La altura total de la cápsula
 */
export function getCapsuleTotalHeight(halfHeight, radius) {
  try {
    // Validar parámetros
    const validHalfHeight = typeof halfHeight === 'number' && !isNaN(halfHeight) ? Math.max(0, halfHeight) : 0.5;
    const validRadius = typeof radius === 'number' && !isNaN(radius) ? Math.max(0, radius) : 1;
    
    // Una cápsula tiene: altura del cilindro (halfHeight * 2) + dos semiesferas (radius * 2)
    return validHalfHeight * 2 + validRadius * 2;
  } catch (error) {
    console.error('[getCapsuleTotalHeight] Error calculando altura:', error);
    return 2; // Valor por defecto seguro
  }
}
