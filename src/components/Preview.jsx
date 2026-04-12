import React, { useState, useEffect, useRef } from 'react';
// import TransformBox from './TransformBox';

export default function Preview({ globalSettings, activeTabId, parts, transform, currentEye, currentMouthKey, isStreamMode, layoutTransform, onLayoutTransformChange }) {
    const [isEditMode, setIsEditMode] = useState(false);

    const [crossfadeData, setCrossfadeData] = useState(null);
    const prevTabRef = useRef(activeTabId);
    const prevImagesRef = useRef({ mouth: null, eye: null });
    const crossfadeTimeoutRef = useRef(null);

    useEffect(() => {
        if (globalSettings.crossfade && activeTabId !== prevTabRef.current) {
            setCrossfadeData({
                mouth: prevImagesRef.current.mouth,
                eye: prevImagesRef.current.eye,
            });

            const speed = globalSettings.crossfadeSpeed || 150;
            if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
            crossfadeTimeoutRef.current = setTimeout(() => {
                setCrossfadeData(null);
            }, speed);
        }

        prevTabRef.current = activeTabId;
    }, [activeTabId, globalSettings.crossfade, globalSettings.crossfadeSpeed]);

    useEffect(() => {
        prevImagesRef.current = {
            mouth: currentMouthKey ? parts[currentMouthKey] : null,
            eye: parts[currentEye] ? parts[currentEye] : null
        };
    }, [parts, currentEye, currentMouthKey]);

    const isFading = crossfadeData !== null;
    const fadeSpeed = globalSettings.crossfadeSpeed || 150;

    const handleTransformChange = (newTransform) => {
        if (onLayoutTransformChange) {
            onLayoutTransformChange(newTransform);
        }
    };

    const gTransform = layoutTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

    return (
        <div className="preview-container" style={{ position: 'relative' }}>
            <div className={`preview-canvas-wrapper ${isFading ? 'cf-bounce' : ''}`} style={{ backgroundColor: getBgColor(globalSettings.bgColor), animationDuration: `${fadeSpeed}ms` }}>
                {/* <TransformBox
                    transform={gTransform}
                    onChange={handleTransformChange}
                    isEditMode={isEditMode}
                    setEditMode={setIsEditMode}
                    isStreamMode={isStreamMode}
                > */}
                <>
                    <div
                        className="preview-canvas"
                        style={{
                            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scaleX || 1}, ${transform.scaleY}) rotate(${transform.rotateZ || 0}deg)`,
                            transformOrigin: 'bottom center'
                        }}
                    >
                        {/* 過去の表情（フェードアウト＆スライドアウト） */}
                        {crossfadeData && (
                            <>
                                {crossfadeData.mouth && (
                                    <img src={crossfadeData.mouth} className="avatar-layer cf-fade-out" style={{ zIndex: 0, animationDuration: `${fadeSpeed}ms` }} alt="prev-mouth" />
                                )}
                                {crossfadeData.eye && (
                                    <div style={{ zIndex: 2, position: 'absolute', width: '100%', height: '100%', transform: `translate(${transform.eyeX || 0}px, ${transform.eyeY || 0}px)` }}>
                                        <img src={crossfadeData.eye} className="avatar-layer cf-eye-slide-out" style={{ animationDuration: `${fadeSpeed}ms` }} alt="prev-eye" />
                                    </div>
                                )}
                            </>
                        )}

                        {/* 現在の表情（フェードイン＆スライドイン） */}
                        {currentMouthKey && <img src={parts[currentMouthKey]} className={`avatar-layer ${isFading ? 'cf-fade-in' : ''}`} style={{ zIndex: 1, animationDuration: `${fadeSpeed}ms` }} alt="base/mouth" />}
                        <div style={{ zIndex: 3, position: 'absolute', width: '100%', height: '100%', transform: `translate(${transform.eyeX || 0}px, ${transform.eyeY || 0}px)` }}>
                            {parts[currentEye] && <img src={parts[currentEye]} className={`avatar-layer ${isFading ? 'cf-eye-slide-in' : ''}`} style={{ animationDuration: `${fadeSpeed}ms` }} alt="eye" />}
                        </div>
                    </div>
                </>
                {/* </TransformBox> */}
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
