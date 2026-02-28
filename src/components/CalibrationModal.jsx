import React from 'react';

export default function CalibrationModal({
    isOpen,
    onClose,
    globalSettings,
    onGlobalSettingsChange,
    audioAnalyzer,
    onStartStream
}) {
    if (!isOpen) return null;

    const updateGlobal = (key, value) => {
        onGlobalSettingsChange({ ...globalSettings, [key]: value });
    };

    const silenceSeconds = (0.5 + (globalSettings.silenceThreshold / 100) * 9.5).toFixed(1);

    const {
        calibrationPhase, startCalibration, resetCalibration,
        calibratedNormal,
        audioDevices, selectedDeviceId, changeDevice
    } = audioAnalyzer;

    const getWizardGuideText = () => {
        switch (calibrationPhase) {
            case 'normal': return '🎤 ふつうの声で3秒間喋ってね...';
            default: return 'マイクをONにしてから測定してね！';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="calibration-modal glass-panel" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>×</button>
                <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>⚙️ 音声キャリブレーション設定</h2>

                {/* --- マイク設定エリア --- */}
                <div className="setting-section" style={{ padding: '16px', marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>🎤 マイク入力</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            className={`mic-btn ${audioAnalyzer.isActive ? 'active' : ''}`}
                            onClick={audioAnalyzer.toggleMic}
                            style={{ width: '40px', height: '40px', fontSize: '1.2rem', flexShrink: 0 }}
                            title="マイクのON/OFF"
                        >
                            🎙️
                        </button>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {audioAnalyzer.isActive ? 'マイク接続中' : 'マイクOFF'}
                            </div>
                            <div className="mic-level-bar" style={{ width: '100%', marginBottom: '8px' }}>
                                <div className="mic-level-fill" style={{ width: `${audioAnalyzer.level * 100}%` }}></div>
                            </div>
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => changeDevice(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--glass-border)',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="default">デフォルトマイク</option>
                                {audioDevices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `マイク ${device.deviceId.substring(0, 5)}...`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ① 音声キャリブレーション（声を覚えさせる）エリア */}
                <div className="wizard-area">
                    <h3 style={{ marginBottom: '16px' }}>① 声を測定（キャリブレーション）</h3>

                    <div className="wizard-status">
                        {getWizardGuideText()}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            className="learning-btn"
                            disabled={calibrationPhase !== 'idle'}
                            onClick={() => startCalibration('normal')}
                        >
                            押してマイクに話す (3秒)
                        </button>
                        <button
                            className="learning-btn"
                            disabled={calibrationPhase !== 'idle'}
                            onClick={resetCalibration}
                            style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                        >
                            リセット
                        </button>
                    </div>

                    <div className="pitch-values">
                        <div className="pitch-value-item">
                            <span style={{ fontSize: '0.8rem' }}>測定した地声の高さ (平均ピッチ)</span>
                            <span className="pitch-value-number">{Math.round(calibratedNormal)} Hz</span>
                        </div>
                    </div>
                </div>

                {/* ② モード別・詳細設定エリア */}
                <div className="setting-section">
                    <h3 style={{ marginBottom: '16px' }}>② モード別・詳細設定</h3>

                    {/* 表情クロスフェード設定 */}
                    <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>表情クロスフェード（アニメ化）</span>
                            <button
                                className={`bg-toggle-btn ${globalSettings.crossfade ? 'active' : ''}`}
                                onClick={() => updateGlobal('crossfade', !globalSettings.crossfade)}
                                style={{ margin: 0 }}
                            >
                                {globalSettings.crossfade ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '12px' }}>
                            表情が切り替わる際、中割りを自動生成して滑らかに繋げます。
                        </p>
                        <div className="slider-header" style={{ fontSize: '0.85rem' }}>
                            <span>フェード速度</span>
                            <span>{globalSettings.crossfadeSpeed || 150} ms</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="500"
                            step="10"
                            value={globalSettings.crossfadeSpeed || 150}
                            onChange={(e) => updateGlobal('crossfadeSpeed', parseInt(e.target.value, 10))}
                            className="range-slider"
                            style={{ marginTop: '8px' }}
                        />
                    </div>

                    {/* 笑い声設定 */}
                    <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>笑い声検知 (LOL切り替え)</span>
                            <button
                                className={`bg-toggle-btn ${globalSettings.autoLaugh ? 'active' : ''}`}
                                onClick={() => updateGlobal('autoLaugh', !globalSettings.autoLaugh)}
                                style={{ margin: 0 }}
                            >
                                {globalSettings.autoLaugh ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
                            ONにすると、測定した声より高い声や、笑い声を検知して「LOL」と含めて作成したタブのモデルに自動的に切り替わります。笑っちゃったときにモデルの表情を変化させることができるってわけ。
                        </p>
                    </div>

                    {/* 無言設定 */}
                    <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>無言設定</span>
                            <button
                                className={`bg-toggle-btn ${globalSettings.autoSilence ? 'active' : ''}`}
                                onClick={() => updateGlobal('autoSilence', !globalSettings.autoSilence)}
                                style={{ margin: 0 }}
                            >
                                {globalSettings.autoSilence ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div className="slider-header" style={{ fontSize: '0.85rem', marginTop: '12px' }}>
                            <span>何秒無音状態だったら自動切換させる？</span>
                            <span>{silenceSeconds}秒</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={globalSettings.silenceThreshold}
                            onChange={(e) => updateGlobal('silenceThreshold', parseInt(e.target.value, 10))}
                            className="range-slider"
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            ONにすると、マイクの音が無音になった状態が一定時間続いたときに、「無言」と含めて作成したタブのモデルに自動で切り替わります。
                        </p>
                    </div>

                    {/* 表情安定化（共通） */}
                    <div style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>表情維持タイマー（安定化）</span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                一度変化した表情を、指定した秒数は強制的に維持してチラつきを防止します。
                            </p>
                        </div>
                        <div className="slider-header" style={{ fontSize: '0.85rem', marginTop: '12px' }}>
                            <span>ロック秒数</span>
                            <span>{globalSettings.switchCooldown?.toFixed(1) || 1.0} 秒</span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="30"
                            value={(globalSettings.switchCooldown || 1.0) * 10}
                            onChange={(e) => updateGlobal('switchCooldown', parseInt(e.target.value, 10) / 10)}
                            className="range-slider"
                        />
                    </div>

                </div>

                {/* ③ 配信モード (OBS設定) エリア */}
                <div className="setting-section" style={{ padding: '16px', border: '1px solid var(--accent-color)', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.05)' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--accent-color)' }}>📹 ③ 配信モード (OBS用)</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
                        設定画面やボタン等のUIをすべて非表示にし、モデルだけを表示するモードです（背景透過）。<br />
                        OBS等の配信ソフトでウィンドウキャプチャしてクロマキー合成する際に最適です。
                    </p>

                    <button
                        className="learning-btn"
                        onClick={onStartStream}
                        style={{ width: '100%', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent-color)' }}
                    >
                        <span>📺</span> 配信モードを開始する
                    </button>

                    <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>【OBSでの設定手順】</div>
                        <ol style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                            <li>OBSのソースの「＋」ボタンから<strong>「ウィンドウキャプチャ」</strong>を選択。</li>
                            <li>「ウィンドウ」の欄で、現在開いているブラウザ（MOZ-3 Anime Studio）を選択。</li>
                            <li>「キャプチャ方法」を「Windows 10 以降」等に変更（画面が真っ黒な場合）。</li>
                            <li>必要に応じて、Altキーを押しながらソースの端をドラッグして余白をトリミング。</li>
                            <li>背景を透明にしたい場合は、アプリの背景色を「Green」か「Magenta」にし、OBSのソースを右クリック→「フィルタ」から<strong>「クロマキー」</strong>を追加して該当する色を透過します。</li>
                        </ol>
                    </div>
                </div>
                {/* ℹ️ クレジット＆バージョン情報 */}
                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0 16px', opacity: 0.5 }} />
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: '4px 0' }}>MOZ-3 Anime Studio</div>
                    <div>バージョン: v1.0.0 Beta</div>
                    <div>制作者: モタロ</div>
                    <div>キャラクターデザイン: モタロ</div>
                    <div>BGM: モタロ</div>
                </div>
            </div>
        </div>
    );
}
