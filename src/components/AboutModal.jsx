import React, { useState } from 'react';

export default function AboutModal({ isOpen, onClose }) {
    const [showTerms, setShowTerms] = useState(false);

    if (!isOpen) {
        if (showTerms) setShowTerms(false); // Reset state when closed
        return null;
    }

    const handleYoutubeClick = () => {
        const url = 'https://www.youtube.com/c/モタロ';
        if (window.require) {
            const { shell } = window.require('electron');
            shell.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
            <div
                className="calibration-modal"
                onClick={e => e.stopPropagation()}
                style={{ textAlign: 'center', position: 'relative', width: showTerms ? '600px' : '400px', padding: '32px', transition: 'width 0.2s ease' }}
            >
                <button className="modal-close-btn" onClick={() => {
                    if (showTerms) {
                        setShowTerms(false);
                    } else {
                        onClose();
                    }
                }}>
                    {showTerms ? '←' : '×'}
                </button>

                {showTerms ? (
                    // --- 利用規約（Terms of Service）ビュー ---
                    <div style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--accent-color)', textAlign: 'center' }}>
                            📘 「MOZ-3 Anime Studio」利用規約
                        </h3>

                        <div style={{ fontSize: '0.85rem', lineHeight: '1.8', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
                            <p style={{ marginBottom: '16px' }}>
                                本規約は、制作者モタロが提供する「MOZ-3 Anime Studio」（以下「本アプリ」）の利用条件を定めるものです。
                            </p>

                            <h4 style={{ color: 'var(--text-primary)', marginTop: '20px', marginBottom: '8px' }}>1. 権利の帰属</h4>
                            <p style={{ marginBottom: '16px' }}>
                                本アプリに含まれる全てのプログラム、デザイン、BGM、およびキャラクターに関する著作権その他一切の知的財産権は、制作者モタロに帰属します。<br />
                                本アプリを利用して生成された配信画面や動画コンテンツについては、商用・非商用を問わず自由にご利用いただけます。
                            </p>

                            <h4 style={{ color: 'var(--text-primary)', marginTop: '20px', marginBottom: '8px' }}>2. 禁止事項</h4>
                            <p style={{ marginBottom: '16px' }}>
                                本アプリのプログラムやデータの改変、解析（リバースエンジニアリング）、および二次配布を固く禁じます。<br />
                                本アプリに組み込まれている画像やBGMを、本アプリの利用目的以外で単体で抜き出し、使用・配布することを禁じます。
                            </p>

                            <h4 style={{ color: 'var(--text-primary)', marginTop: '20px', marginBottom: '8px' }}>3. 免責事項</h4>
                            <p style={{ marginBottom: '16px' }}>
                                本アプリの利用により生じたトラブルや損害について、制作者は一切の責任を負いません。
                            </p>

                            <h4 style={{ color: 'var(--text-primary)', marginTop: '20px', marginBottom: '8px' }}>4. 制作者からのお願い</h4>
                            <p style={{ marginBottom: '16px' }}>
                                本アプリを気に入っていただけましたら、ぜひモタロのYouTubeチャンネル登録をお願いします！
                            </p>

                            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                <button
                                    onClick={handleYoutubeClick}
                                    style={{ background: '#ff0000', color: 'white', padding: '10px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    ▶ 公式YouTubeチャンネル
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- 基本情報（About）ビュー ---
                    <>
                        <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                            このアプリについて
                        </h3>

                        <div style={{ marginBottom: '24px' }}>
                            <img
                                src="./motako.png"
                                alt="モタ子"
                                style={{ width: '200px', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                            />
                        </div>

                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '32px' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1rem' }}>
                                MOZ-3 Anime Studio
                            </div>
                            <div>バージョン: v1.0.0 Beta</div>
                            <div>制作: モタロ</div>
                            <div>キャラクターデザイン: モタロ</div>
                            <div>BGM: モタロ</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                            <button
                                onClick={handleYoutubeClick}
                                style={{ background: '#ff0000', color: 'white', padding: '10px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '80%' }}
                            >
                                ▶ 公式YouTubeチャンネル
                            </button>

                            <button
                                onClick={() => setShowTerms(true)}
                                style={{ background: 'transparent', color: 'var(--accent-color)', padding: '10px 24px', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '80%' }}
                            >
                                📘 利用規約を開く
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
