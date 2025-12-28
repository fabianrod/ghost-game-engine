import { SceneObject } from './SceneObject';
import { ColliderObject } from './ColliderObject';
import { useLevel } from '../../hooks/useLevel';

/**
 * Componente que carga y renderiza un nivel completo desde un archivo JSON
 * @param {Object} props - Props del componente
 * @param {string} props.levelPath - Ruta al archivo JSON del nivel (ej: '/levels/level1.json')
 * @param {Object} props.levelData - Datos del nivel directamente (opcional, alternativa a levelPath)
 */
export const LevelLoader = ({ levelPath, levelData }) => {
  // Si se proporciona levelData directamente, usarlo
  // Si no, cargar desde levelPath usando el hook
  const { levelData: loadedLevelData, loading, error } = useLevel(levelPath);
  const level = levelData || loadedLevelData;

  if (loading) {
    return null; // O puedes mostrar un indicador de carga
  }

  if (error) {
    console.error('Error cargando nivel:', error);
    return null;
  }

  if (!level || !level.objects) {
    console.warn('LevelLoader: No se proporcionaron datos del nivel válidos');
    return null;
  }

  // Si no hay objetos, retornar null sin error
  if (level.objects.length === 0) {
    console.log('LevelLoader: Nivel cargado sin objetos');
    return null;
  }

  return (
    <>
      {level.objects.map((obj, index) => {
        // Validar que el objeto tenga las propiedades mínimas
        if (!obj.position) {
          console.warn(`LevelLoader: Objeto en índice ${index} no tiene position, omitiendo`);
          return null;
        }

        // Si es un collider, renderizar ColliderObject (invisible pero con física)
        if (obj.type === 'collider') {
          return (
            <ColliderObject
              key={`collider-${index}-${obj.id || index}`}
              colliderType={obj.colliderType || 'cylinder'}
              position={obj.position}
              scale={obj.scale || [1, 1, 1]}
              rotation={obj.rotation || [0, 0, 0]}
            />
          );
        }

        // Si es un objeto normal, validar que tenga model
        if (!obj.model) {
          console.warn(`LevelLoader: Objeto en índice ${index} no tiene model, omitiendo`);
          return null;
        }

        return (
          <SceneObject
            key={`${obj.model}-${index}`}
            model={obj.model}
            position={obj.position}
            scale={obj.scale || [1, 1, 1]}
            rotation={obj.rotation || [0, 0, 0]}
            castShadow={obj.castShadow !== false}
            receiveShadow={obj.receiveShadow !== false}
            hasCollider={obj.hasCollider !== false}
            colliderScale={obj.colliderScale || [0.8, 0.8, 0.8]}
          />
        );
      })}
    </>
  );
};

