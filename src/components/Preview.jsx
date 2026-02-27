import React from 'react';

export default function Preview({ globalSettings, parts, transform, currentEye, currentMouthKey }) {
    return (
        <div className="preview-container">
            <div className="preview-canvas-wrapper" style={{ backgroundColor: getBgColor(globalSettings.bgColor) }}>
                <div
                    className="preview-canvas"
                    style={{
                        transform: `translate(${transform.translateX}px, ${transform.translateY}px) scaleY(${transform.scaleY})`
                    }}
                >
                    {currentMouthKey && <img src={parts[currentMouthKey]} className="avatar-layer" style={{ zIndex: 1 }} alt="base/mouth" />}
                    {parts[currentEye] && <img src={parts[currentEye]} className="avatar-layer" style={{ zIndex: 3 }} alt="eye" />}
                </div>
            </div>
        </div>
    );
}

function getBgColor(type) {
    if (type === 'green') return '#00FF00';
    if (type === 'blue') return '#0000FF';
    if (type === 'magenta') return '#FF00FF';
    return 'transparent';
}
