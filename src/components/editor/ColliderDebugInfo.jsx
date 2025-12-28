import { useMemo } from 'react';
import { calculateCylinderCollider, getCapsuleTotalHeight } from '../../utils/colliderUtils';

/**
 * Componente de debug para mostrar información sobre el collider
 * Ayuda a verificar que el collider visual corresponde al físico
 */
export const ColliderDebugInfo = ({ object, isSelected }) => {
  if (!isSelected || !object) return null;

  const debugInfo = useMemo(() => {
    const info = {
      objectType: object.type || 'object',
      hasCollider: object.hasCollider,
      colliderScale: object.colliderScale || [0.8, 0.8, 0.8],
    };

    // Si es un collider, mostrar información del collider
    if (object.type === 'collider') {
      if (object.colliderType === 'cylinder') {
        const params = calculateCylinderCollider({
          type: 'cylinder',
          position: [0, 0, 0],
          scale: object.scale || [1, 1, 1],
          rotation: [0, 0, 0],
        });
        if (params) {
          info.colliderParams = {
            radius: params.radius,
            halfHeight: params.halfHeight,
            height: params.height,
            totalHeight: getCapsuleTotalHeight(params.halfHeight, params.radius),
          };
        }
      }
    }

    return info;
  }, [object]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff00',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 1000,
        maxWidth: '300px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🔍 Debug Info</div>
      <div>Tipo: {debugInfo.objectType === 'collider' ? 'Collider' : 'Objeto 3D'}</div>
      {debugInfo.objectType === 'collider' ? (
        <>
          <div>Tipo Collider: {object.colliderType || 'cylinder'}</div>
          {debugInfo.colliderParams && (
            <div style={{ marginTop: '5px', borderTop: '1px solid #333', paddingTop: '5px' }}>
              <div>Radio: {debugInfo.colliderParams.radius.toFixed(2)}</div>
              <div>HalfHeight: {debugInfo.colliderParams.halfHeight.toFixed(2)}</div>
              <div>Altura: {debugInfo.colliderParams.height.toFixed(2)}</div>
              <div>Altura Total: {debugInfo.colliderParams.totalHeight.toFixed(2)}</div>
            </div>
          )}
        </>
      ) : (
        <>
          <div>hasCollider: {debugInfo.hasCollider ? '✅' : '❌'}</div>
          <div style={{ marginTop: '5px', borderTop: '1px solid #333', paddingTop: '5px' }}>
            <div>Usando collider automático</div>
            <div>Escala: [{debugInfo.colliderScale.map(v => v.toFixed(2)).join(', ')}]</div>
          </div>
        </>
      )}
    </div>
  );
};

