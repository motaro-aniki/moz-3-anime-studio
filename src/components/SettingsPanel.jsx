import React, { useRef } from 'react';

export default function SettingsPanel({
    globalSettings, onGlobalSettingsChange,
    expSettings, onExpSettingsChange,
    audioAnalyzer,
    bgmList, selectedBgm, onBgmChange,
    isBgmPlaying, toggleBgmPlay, stopBgm,
    isStreamMode,
    onManualSave
}) {
    const fileInputRef = useRef(null);

    const updateGlobal = (key, value) => {
        onGlobalSettingsChange({ ...globalSettings, [key]: value });
    };

    const updateExp = (key, value) => {
        onExpSettingsChange({ ...expSettings, [key]: value });
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            audioAnalyzer.handleFileUpload(e.target.files[0]);
        }
    };

    // Calculate actual seconds for display
    const silenceSeconds = (0.5 + (globalSettings.silenceThreshold / 100) * 9.5).toFixed(1);

    return (
        <div className="settings-container">
            <div className="setting-section glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
                <h3>🎤 マイクとモデルの動き</h3>

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        className={`mic-btn ${audioAnalyzer.isActive ? 'active' : ''}`}
                        onClick={audioAnalyzer.toggleMic}
                        style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
                    >
                        🎙️
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {audioAnalyzer.isActive ? 'Mic Active' : 'Mic Off'}
                        </div>
                        <div className="mic-level-bar" style={{ width: '100%', marginTop: '4px' }}>
                            <div className="mic-level-fill" style={{ width: `${audioAnalyzer.level * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <div className="slider-header">
                        <span>マイク感度</span>
                        <span>{globalSettings.sensitivity}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={globalSettings.sensitivity}
                        onChange={(e) => updateGlobal('sensitivity', parseInt(e.target.value, 10))}
                        className="range-slider"
                        style={{ marginTop: '8px' }}
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <div className="slider-header" style={{ marginBottom: '8px' }}>
                        <span>待機中の動き</span>
                    </div>
                    <div className="bg-toggles">
                        <button
                            className={`bg-toggle-btn ${expSettings.idleAnim === 'none' ? 'active' : ''}`}
                            onClick={() => updateExp('idleAnim', 'none')}
                        >
                            なし
                        </button>
                        <button
                            className={`bg-toggle-btn ${expSettings.idleAnim === 'breathing' ? 'active' : ''}`}
                            onClick={() => updateExp('idleAnim', 'breathing')}
                        >
                            呼吸
                        </button>
                    </div>
                </div>

                {expSettings.idleAnim === 'breathing' && (
                    <div style={{ marginBottom: '16px' }}>
                        <div className="slider-header">
                            <span>呼吸の速さ</span>
                            <span>{expSettings.breathSpeed}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={expSettings.breathSpeed}
                            onChange={(e) => updateExp('breathSpeed', parseInt(e.target.value, 10))}
                            className="range-slider"
                            style={{ marginTop: '8px' }}
                        />
                    </div>
                )}

                <div>
                    <div className="slider-header" style={{ marginBottom: '8px' }}>
                        <span>おしゃべりアニメ</span>
                    </div>
                    <div className="preset-options">
                        {[
                            { id: 'off', label: 'なし' },
                            { id: 'poyon', label: 'のびる' },
                            { id: 'pyonpyon', label: 'はねる' },
                            { id: 'bibibi', label: 'ふるえる' }
                        ].map(preset => (
                            <button
                                key={preset.id}
                                className={`preset-btn ${expSettings.preset === preset.id ? 'active' : ''}`}
                                onClick={() => updateExp('preset', preset.id)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="setting-section glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
                <h3>🎨 背景の色</h3>

                <div>
                    <div className="slider-header" style={{ marginBottom: '8px' }}>
                        <span>色</span>
                    </div>
                    <div className="bg-toggles">
                        <button
                            className={`bg-toggle-btn ${globalSettings.bgColor === 'transparent' ? 'active' : ''}`}
                            onClick={() => updateGlobal('bgColor', 'transparent')}
                        >
                            透過
                        </button>
                        <button
                            className={`bg-toggle-btn ${globalSettings.bgColor === 'green' ? 'active' : ''}`}
                            onClick={() => updateGlobal('bgColor', 'green')}
                        >
                            Green
                        </button>
                        <button
                            className={`bg-toggle-btn ${globalSettings.bgColor === 'blue' ? 'active' : ''}`}
                            onClick={() => updateGlobal('bgColor', 'blue')}
                        >
                            Blue
                        </button>
                        <button
                            className={`bg-toggle-btn ${globalSettings.bgColor === 'magenta' ? 'active' : ''}`}
                            onClick={() => updateGlobal('bgColor', 'magenta')}
                        >
                            Magenta
                        </button>
                    </div>
                </div>
            </div>

            <div className="setting-section glass-panel" style={{ padding: '16px' }}>
                <h3>🎵 オーディオファイルで口パク</h3>

                <div style={{ marginBottom: '12px' }}>
                    <input
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <button
                        className="preset-btn"
                        style={{ width: '100%', marginBottom: '8px' }}
                        onClick={triggerFileUpload}
                    >
                        {audioAnalyzer.audioFileName || "📂 Upload Audio File"}
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        自分で用意した音声をアップロードしてモデルを口パクできるよ
                    </p>
                </div>

                {audioAnalyzer.audioFile && (
                    <div>
                        <div className="bg-toggles" style={{ marginBottom: '12px' }}>
                            {!audioAnalyzer.isPlayingFile ? (
                                <button className="bg-toggle-btn" onClick={audioAnalyzer.playFile}>▶ Play</button>
                            ) : (
                                <button className="bg-toggle-btn" onClick={audioAnalyzer.pauseFile}>⏸ Pause</button>
                            )}
                            <button className="bg-toggle-btn" onClick={audioAnalyzer.stopFile}>⏹ Stop</button>
                        </div>

                        <div className="slider-header">
                            <span>Playback Progress</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={audioAnalyzer.fileProgress}
                            onChange={(e) => audioAnalyzer.seekFile(parseFloat(e.target.value))}
                            className="range-slider"
                            style={{ marginTop: '8px' }}
                        />
                    </div>
                )}
            </div>

            <div className="setting-section glass-panel" style={{ padding: '16px' }}>
                <h3>🎵 BGM設定</h3>

                <div style={{ marginBottom: '16px' }}>
                    <div className="slider-header" style={{ marginBottom: '8px' }}>
                        <span>BGMを選択</span>
                    </div>
                    <select
                        style={{ width: '100%', padding: '8px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}
                        value={selectedBgm}
                        onChange={(e) => onBgmChange(e.target.value)}
                    >
                        <option value="none">なし</option>
                        <option value="random">ランダム再生</option>
                        {bgmList.map((bgm, i) => (
                            <option key={i} value={bgm}>{bgm}</option>
                        ))}
                    </select>

                    <div className="bg-toggles">
                        {isBgmPlaying ? (
                            <button
                                className="bg-toggle-btn active"
                                onClick={toggleBgmPlay}
                                disabled={selectedBgm === 'none'}
                                style={{ opacity: selectedBgm === 'none' ? 0.5 : 1, cursor: selectedBgm === 'none' ? 'not-allowed' : 'pointer' }}
                            >
                                ⏸ 停止
                            </button>
                        ) : (
                            <button
                                className="bg-toggle-btn"
                                onClick={toggleBgmPlay}
                                disabled={selectedBgm === 'none'}
                                style={{ opacity: selectedBgm === 'none' ? 0.5 : 1, cursor: selectedBgm === 'none' ? 'not-allowed' : 'pointer' }}
                            >
                                ▶ 再生
                            </button>
                        )}
                        <button
                            className="bg-toggle-btn"
                            onClick={stopBgm}
                            disabled={selectedBgm === 'none'}
                            style={{ opacity: selectedBgm === 'none' ? 0.5 : 1, cursor: selectedBgm === 'none' ? 'not-allowed' : 'pointer' }}
                        >
                            ⏹ リセット
                        </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        音楽がなくて寂しいときはモタロが作曲したプリセットBGMを再生するのもオススメ
                    </p>
                </div>
            </div>

            {/* 手動セーブボタン */}
            <div className="setting-section" style={{ border: '1px solid var(--accent-color)', background: 'rgba(6, 182, 212, 0.05)', padding: '16px' }}>
                <h3 style={{ marginBottom: '12px', color: 'var(--accent-color)' }}>💾 セーブ設定</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    設定は自動で保存されますが、ブラウザを閉じる前に手動でセーブすることで確実にデータを残すことができます。
                </p>
                <button 
                  className="learning-btn" 
                  onClick={onManualSave}
                  style={{ width: '100%', background: 'var(--accent-color)', color: 'black', fontWeight: 'bold' }}
                >
                    今の状態を手動でセーブする
                </button>
            </div>
        </div>
    );
}
