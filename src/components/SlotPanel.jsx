import React from 'react';
import DropZone from './DropZone';

export default function SlotPanel({ parts, onPartChange, tabName, onResetTransform }) {

    const mouthConfigs = [
        { key: 'mouth0', icon: '😐', label: '閉じた口' },
        { key: 'mouth1', icon: '😮', label: '少し開いた口' },
        { key: 'mouth2', icon: '😲', label: '開いた口' },
        { key: 'mouth3', icon: '📢', label: '大きく開いた口' },
    ];

    const activeKeys = mouthConfigs.filter(c => parts[c.key] !== null).map(c => c.key);

    const getLabel = (key) => {
        const index = mouthConfigs.findIndex(c => c.key === key);
        if (parts[key] === null) return `未設定 (${mouthConfigs[index].label})`;
        return mouthConfigs[index].label;
    };

    return (
        <div className="slots-container">
            <h2 className="slots-title">🧩 モデルの素材を組み込む</h2>

            <div className="slot-group">
                <h3>モデルと口（口パク差分）</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                    アップロードした口パク差分の数だけ音量段階に合わせて表示されるよ。（最大4枚）
                </p>
                <div className="drop-zones-grid">
                    {mouthConfigs.map(config => (
                        <DropZone
                            key={config.key}
                            label={parts[config.key] ? getLabel(config.key) : config.label}
                            icon={config.icon}
                            value={parts[config.key]}
                            onChange={(url) => onPartChange(config.key, url)}
                        />
                    ))}
                </div>
            </div>

            <div className="slot-group">
                <h3>お目目（まばたき差分）</h3>
                <div className="drop-zones-grid">
                    <DropZone label="開いた目" icon="👀" value={parts.eyeOpen} onChange={(url) => onPartChange('eyeOpen', url)} />
                    <DropZone label="半開きの目" icon="😑" value={parts.eyeHalf} onChange={(url) => onPartChange('eyeHalf', url)} />
                    <DropZone label="閉じた目" icon="😌" value={parts.eyeClosed} onChange={(url) => onPartChange('eyeClosed', url)} />
                </div>
            </div>

            <div className="slot-group" style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <h3 style={{ marginBottom: '12px' }}>モデルの配置</h3>
                <button
                    className="bg-toggle-btn"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={onResetTransform}
                >
                    🔄 {tabName} のモデル配置をリセット
                </button>
            </div>

        </div>
    );
}
