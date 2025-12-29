import { SceneObject } from './SceneObject';
import { ColliderObject } from './ColliderObject';
import { CameraComponent } from './CameraComponent';
import { useLevel } from '../../hooks/useLevel';
import { OBJECT_CONFIG, COLLIDER_CONFIG } from '../../constants/gameConstants';
import { validateObject } from '../../utils/objectUtils';

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

  // Contar colliders para depuración
  const colliders = level.objects.filter(obj => obj.type === 'collider');
  if (colliders.length > 0) {
    console.log(`LevelLoader: Cargando ${colliders.length} collider(s)`, colliders);
  }

  return (
    <>
      {level.objects.map((obj, index) => {
        // Validar que el objeto tenga las propiedades mínimas
        const validation = validateObject(obj, index);
        if (!validation.valid) {
          console.warn(`LevelLoader: ${validation.error}`);
          return null;
        }

        // Si es una cámara, renderizar CameraComponent
        if (obj.type === 'camera') {
          return (
            <CameraComponent
              key={`camera-${index}-${obj.id || index}`}
              position={obj.position || OBJECT_CONFIG.DEFAULT_POSITION}
              rotation={obj.rotation || OBJECT_CONFIG.DEFAULT_ROTATION}
              fov={obj.fov || 75}
              near={obj.near || 0.1}
              far={obj.far || 1000}
              mode={obj.mode || 'firstPerson'}
              height={obj.height || 1.65}
              distance={obj.distance || 5}
              offset={obj.offset || [0, 0, 0]}
              targetId={obj.targetId || null}
              active={obj.active || false}
              showGizmo={false} // No mostrar gizmo en modo juego
            />
          );
        }

        // Si es un collider, renderizar ColliderObject (invisible pero con física)
        if (obj.type === 'collider') {
          const colliderPosition = obj.position || OBJECT_CONFIG.DEFAULT_POSITION;
          const colliderScale = obj.scale || OBJECT_CONFIG.DEFAULT_SCALE;
          const colliderRotation = obj.rotation || OBJECT_CONFIG.DEFAULT_ROTATION;
          console.log(`LevelLoader: Renderizando collider ${index}:`, {
            type: obj.colliderType,
            position: colliderPosition,
            scale: colliderScale,
            rotation: colliderRotation,
            'VERIFICAR': 'Esta posición debe coincidir con la del editor',
          });
          return (
            <ColliderObject
              key={`collider-${index}-${obj.id || index}`}
              colliderType={obj.colliderType || COLLIDER_CONFIG.DEFAULT_TYPE}
              position={colliderPosition}
              scale={colliderScale}
              rotation={colliderRotation}
              isTrigger={obj.isTrigger || false}
              isSensor={obj.isSensor || false}
              physicsMaterial={obj.physicsMaterial || COLLIDER_CONFIG.DEFAULT_PHYSICS_MATERIAL}
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
            objectId={obj.id} // Pasar el ID del objeto
            model={obj.model}
            position={obj.position}
            scale={obj.scale || OBJECT_CONFIG.DEFAULT_SCALE}
            rotation={obj.rotation || OBJECT_CONFIG.DEFAULT_ROTATION}
            castShadow={obj.castShadow !== false}
            receiveShadow={obj.receiveShadow !== false}
            hasCollider={obj.hasCollider !== false}
            colliderScale={obj.colliderScale || OBJECT_CONFIG.DEFAULT_COLLIDER_SCALE}
            components={obj.components || []}
            componentProps={obj.componentProps || {}}
          />
        );
      })}
    </>
  );
};

