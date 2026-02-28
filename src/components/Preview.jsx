import React, { useState } from 'react';
import TransformBox from './TransformBox';

export default function Preview({ globalSettings, onGlobalSettingsChange, parts, transform, currentEye, currentMouthKey, isStreamMode }) {
    const [isEditMode, setIsEditMode] = useState(false);

    const handleTransformChange = (newTransform) => {
        if (onGlobalSettingsChange) {
            onGlobalSettingsChange({ ...globalSettings, globalTransform: newTransform });
        }
    };

    const gTransform = globalSettings.globalTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

    return (
        <div className="preview-container" style={{ position: 'relative' }}>
            <div className="preview-canvas-wrapper" style={{ backgroundColor: getBgColor(globalSettings.bgColor) }}>
                <TransformBox
                    transform={gTransform}
                    onChange={handleTransformChange}
                    isEditMode={isEditMode}
                    setEditMode={setIsEditMode}
                    isStreamMode={isStreamMode}
                >
                    <div
                        className="preview-canvas"
                        style={{
                            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scaleY(${transform.scaleY})`
                        }}
                    >
                        {currentMouthKey && <img src={parts[currentMouthKey]} className="avatar-layer" style={{ zIndex: 1 }} alt="base/mouth" />}
                        {parts[currentEye] && <img src={parts[currentEye]} className="avatar-layer" style={{ zIndex: 3 }} alt="eye" />}
                    </div>
                </TransformBox>
            </div>
            {!isStreamMode && !isEditMode && (
                 <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', color: '#fff', pointerEvents: 'none', opacity: 0.6 }}>
                     モデルをダブルクリックで変形・編集
                 </div>
            )}
        </div>
    );
}

function getBgColor(type) {
    if (type === 'green') return '#00FF00';
    if (type === 'blue') return '#0000FF';
    if (type === 'magenta') return '#FF00FF';
    return 'transparent';
}
