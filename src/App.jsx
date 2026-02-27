import React, { useState, useEffect, useRef } from 'react';
import Preview from './components/Preview';
import SlotPanel from './components/SlotPanel';
import SettingsPanel from './components/SettingsPanel';
import ExpressionTabs from './components/ExpressionTabs';
import CalibrationModal from './components/CalibrationModal';
import AboutModal from './components/AboutModal';

import useAudioAnalyzer from './hooks/useAudioAnalyzer';
import useAnimation from './hooks/useAnimation';
import { loadAppData, saveAppData } from './utils/storage';
import debounce from 'lodash/debounce';

export const DEFAULT_PARTS = {
  mouth0: null,
  mouth1: null,
  mouth2: null,
  mouth3: null,
  eyeOpen: null,
  eyeHalf: null,
  eyeClosed: null
};

export const DEFAULT_EXP_SETTINGS = {
  preset: 'off',
  idleAnim: 'breathing',
  breathSpeed: 50
};

function App() {
  const [activeTabId, setActiveTabId] = useState('1');
  const [expressions, setExpressions] = useState([
    {
      id: '1',
      name: 'デフォルトのタブ',
      keybind: '1',
      parts: { ...DEFAULT_PARTS },
      settings: { ...DEFAULT_EXP_SETTINGS }
    }
  ]);

  const [globalSettings, setGlobalSettings] = useState({
    sensitivity: 50,
    bgColor: 'transparent',
    autoLaugh: false,
    autoSilence: false,
    silenceThreshold: 50,
    switchCooldown: 2.0
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isStreamMode, setIsStreamMode] = useState(false);

  const [hasLoadedData, setHasLoadedData] = useState(false);

  // BGM State
  const [bgmList, setBgmList] = useState([]);
  const [selectedBgm, setSelectedBgm] = useState('none');
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const bgmAudioRef = useRef(null);
  const selectedBgmRef = useRef('none');

  useEffect(() => {
    selectedBgmRef.current = selectedBgm;
  }, [selectedBgm]);

  // Load BGM list dynamically
  useEffect(() => {
    try {
      const isElectron = !!(window && window.process && window.process.type);
      if (isElectron) {
        const fs = window.require('fs');
        const path = window.require('path');
        let bgmDir;
        if (import.meta.env.DEV) {
          bgmDir = path.join(process.cwd(), 'public', 'BGM');
        } else {
          const processEnv = window.require('process');
          bgmDir = path.join(processEnv.resourcesPath, 'BGM');
        }
        if (fs.existsSync(bgmDir)) {
          const files = fs.readdirSync(bgmDir);
          const audioFiles = files.filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f));
          setBgmList(audioFiles);
        }
      } else {
        // Observer/Browser Env Fallback list
        setBgmList([
          "1.ナイトシティ・ステップ.mp3",
          "2.右手にチキン、左手にソーダ.mp3",
          "3.M-REMIX.mp3",
          "4.ミックス・ピザ.mp3",
          "5.モタロ・コンツェルト.mp3"
        ]);
      }
    } catch (e) {
      console.error("Failed to read BGM directory", e);
    }
  }, []);

  const getBgmUrl = (filename) => {
    const isElectron = !!(window && window.process && window.process.type);
    if (!isElectron) {
      return `/BGM/${filename}`;
    }
    const path = window.require('path');
    const processEnv = window.require('process');
    const bgmDir = path.join(processEnv.resourcesPath, 'BGM');
    return `file:///${bgmDir.replace(/\\/g, '/')}/${encodeURIComponent(filename)}`;
  };

  const playBgmTrack = (trackName) => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current = null;
    }
    if (trackName === 'none' || !trackName) return;

    let targetTrack = trackName;
    if (trackName === 'random') {
      if (bgmList.length === 0) return;
      const randomIndex = Math.floor(Math.random() * bgmList.length);
      targetTrack = bgmList[randomIndex];
    }

    const url = getBgmUrl(targetTrack);
    const audio = new Audio(url);
    audio.volume = 0.5;

    audio.addEventListener('ended', () => {
      // Loop if a specific track is selected, or pick a new random track if random is selected
      if (selectedBgmRef.current === 'random') {
        playBgmTrack('random');
      } else {
        audio.currentTime = 0;
        audio.play().catch(e => console.error(e));
      }
    });

    audio.play().catch(e => {
      console.error("BGM Playback failed:", e);
      setIsBgmPlaying(false);
    });

    bgmAudioRef.current = audio;
    setIsBgmPlaying(true);
  };

  const stopBgm = () => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current = null;
    }
    setIsBgmPlaying(false);
    setSelectedBgm('none');
  };

  const toggleBgmPlay = () => {
    if (selectedBgm === 'none') return;
    if (isBgmPlaying) {
      if (bgmAudioRef.current) bgmAudioRef.current.pause();
      setIsBgmPlaying(false);
    } else {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.play().catch(e => console.error(e));
        setIsBgmPlaying(true);
      } else {
        playBgmTrack(selectedBgm);
      }
    }
  };

  const handleBgmChange = (val) => {
    setSelectedBgm(val);
    if (val === 'none') {
      stopBgm();
    } else {
      playBgmTrack(val);
    }
  };

  // Load data on mount
  useEffect(() => {
    const initData = async () => {
      const data = await loadAppData();
      if (data) {
        if (data.expressions && data.expressions.length > 0) {
          setExpressions(data.expressions);
          setActiveTabId(data.expressions[0].id);
        }
        if (data.globalSettings) {
          setGlobalSettings(prev => ({ ...prev, ...data.globalSettings, _initialCalibratedNormal: data.calibratedNormal }));
        }
      }
      setHasLoadedData(true);
    };
    initData();
  }, []);

  useEffect(() => {
    // Handle Escape key to exit stream mode
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isStreamMode) {
        setIsStreamMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Toggle body classes for stream mode (fullscreen logic removed)
    if (isStreamMode) {
      document.documentElement.classList.add('stream-mode');
      document.body.classList.add('stream-mode');
    } else {
      document.documentElement.classList.remove('stream-mode');
      document.body.classList.remove('stream-mode');
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.documentElement.classList.remove('stream-mode');
      document.body.classList.remove('stream-mode');
    };
  }, [isStreamMode]);

  useEffect(() => {
    let hideCursorTimeout;

    const handleMouseMove = () => {
      if (!isStreamMode) return;

      document.documentElement.classList.remove('hide-cursor');
      clearTimeout(hideCursorTimeout);

      hideCursorTimeout = setTimeout(() => {
        if (isStreamMode) {
          document.documentElement.classList.add('hide-cursor');
        }
      }, 3000);
    };

    if (isStreamMode) {
      window.addEventListener('mousemove', handleMouseMove);
      // Initiate the timeout right away when entering stream mode
      handleMouseMove();
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideCursorTimeout);
      document.documentElement.classList.remove('hide-cursor');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideCursorTimeout);
      document.documentElement.classList.remove('hide-cursor');
    };
  }, [isStreamMode]);

  const activeExpression = expressions.find(exp => exp.id === activeTabId) || expressions[0];

  const handlePartChange = (partName, url) => {
    setExpressions(prev => prev.map(exp => {
      if (exp.id === activeTabId) {
        return { ...exp, parts: { ...exp.parts, [partName]: url } };
      }
      return exp;
    }));
  };

  const handleExpSettingsChange = (newSettings) => {
    setExpressions(prev => prev.map(exp => {
      if (exp.id === activeTabId) {
        return { ...exp, settings: newSettings };
      }
      return exp;
    }));
  };

  // --- AUDIO & ANIMATION HOOKS ---
  const audioAnalyzer = useAudioAnalyzer(globalSettings, hasLoadedData ? globalSettings._initialCalibratedNormal : null);

  // Save data when state changes (debounced)
  useEffect(() => {
    if (!hasLoadedData) return;

    const saveData = debounce(() => {
      saveAppData({
        expressions,
        globalSettings,
        calibratedNormal: audioAnalyzer.calibratedNormal
      });
    }, 1000);

    saveData();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveData.flush(); // Force immediate execution of pending save
      }
    };
    
    // Also save immediately beforeunload (closing tab)
    const handleBeforeUnload = () => {
      saveData.flush();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveData.cancel();
    };
  }, [expressions, globalSettings, audioAnalyzer.calibratedNormal, hasLoadedData]);

  // --- AUTO SWITCH LOGIC ---
  const lastManualTabRef = useRef(activeTabId);
  const lastProcessedToneRef = useRef(null);

  useEffect(() => {
    // If not actively auto-switched by a tone, record the user's manual choice
    const toneData = audioAnalyzer.detectedTone;
    const tone = toneData ? (toneData.tone || toneData) : null;

    if (!tone || tone === 'normal') {
      const currentName = expressions.find(e => e.id === activeTabId)?.name || '';
      if (!currentName.startsWith('LOL') && !currentName.startsWith('無言')) {
        lastManualTabRef.current = activeTabId;
      }
    } else {
      // If we ARE auto-switched, but activeTabId is clearly a manual tab 
      // (because the user clicked it while laughing/silent), update it anyway.
      const currentName = expressions.find(e => e.id === activeTabId)?.name || '';
      if (!currentName.startsWith('LOL') && !currentName.startsWith('無言')) {
        lastManualTabRef.current = activeTabId;
      }
    }
  }, [activeTabId, audioAnalyzer.detectedTone, expressions]);

  useEffect(() => {
    const toneData = audioAnalyzer.detectedTone;
    if (!toneData) return;

    const tone = toneData.tone || toneData;
    const toneId = toneData.id || toneData;

    // Prevent infinite loop from state change triggering re-eval
    if (lastProcessedToneRef.current === toneId) {
      return;
    }

    let targetTabId = null;

    // Laugh: Random LOL Tab Selection
    if (tone === 'laugh' && globalSettings.autoLaugh) {
      const lolTabs = expressions.filter(exp => exp.name.startsWith('LOL'));
      if (lolTabs.length > 0) {
        const nonLolTabs = expressions.filter(exp => !exp.name.startsWith('LOL'));
        // Safety check: Only auto-switch if there is at least 1 non-LOL tab
        if (nonLolTabs.length >= 1) {
          let availableLolTabs = lolTabs;
          // If there are multiple LOL tabs, avoid the currently active one
          if (lolTabs.length >= 2 && activeTabId) {
            availableLolTabs = lolTabs.filter(t => t.id !== activeTabId);
          }
          const randomIndex = Math.floor(Math.random() * availableLolTabs.length);
          targetTabId = availableLolTabs[randomIndex].id;
        }
      }
    }

    // Silence: Random 無言 Tab Selection
    if (tone === 'silence' && globalSettings.autoSilence) {
      const silenceTabs = expressions.filter(exp => exp.name.startsWith('無言'));
      if (silenceTabs.length > 0) {
        const nonAutoTabs = expressions.filter(exp => !exp.name.startsWith('無言') && !exp.name.startsWith('LOL'));
        // Safety check: Only auto-switch if there is at least 1 normal tab
        if (nonAutoTabs.length >= 1) {
          // If already on a silence tab, STAY on it. Don't re-randomize while still silent.
          const currentTab = expressions.find(exp => exp.id === activeTabId);
          if (currentTab && currentTab.name.startsWith('無言')) {
            targetTabId = activeTabId;
          } else {
            const randomIndex = Math.floor(Math.random() * silenceTabs.length);
            targetTabId = silenceTabs[randomIndex].id;
          }
        }
      }
    }

    if (targetTabId) {
      if (activeTabId !== targetTabId) {
        setActiveTabId(targetTabId);
      }
    } else {
      // Revert back if we are currently on an auto-switch tab and the tone ended
      const currentTabName = expressions.find(exp => exp.id === activeTabId)?.name || '';
      if (currentTabName.startsWith('LOL') || currentTabName.startsWith('無言')) {
        // Check if the tab we want to return to still exists
        const manualTabExists = expressions.find(exp => exp.id === lastManualTabRef.current);
        if (manualTabExists) {
          setActiveTabId(lastManualTabRef.current);
        } else {
          // Fallback to the very first non-LOL/non-silence tab if the last manual tab is gone
          const firstManual = expressions.find(exp => !exp.name.startsWith('LOL') && !exp.name.startsWith('無言'));
          if (firstManual) setActiveTabId(firstManual.id);
          else setActiveTabId(expressions[0].id);
        }
      }
    }

    lastProcessedToneRef.current = toneId;
  }, [audioAnalyzer.detectedTone, globalSettings.autoLaugh, globalSettings.autoSilence, expressions, activeTabId]);

  const mouthKeys = ['mouth0', 'mouth1', 'mouth2', 'mouth3'];
  const activeMouths = mouthKeys.filter(k => activeExpression.parts[k] !== null);
  const activeMouthCount = activeMouths.length;

  const { currentEye, mouthIndex, transform } = useAnimation(
    audioAnalyzer.level,
    activeExpression.settings,
    activeMouthCount
  );

  const safeMouthIndex = Math.min(mouthIndex, activeMouthCount > 0 ? activeMouthCount - 1 : 0);
  const currentMouthKey = activeMouthCount > 0 ? activeMouths[safeMouthIndex] : null;

  return (
    <div className={`app-container ${isStreamMode ? 'stream-mode' : ''}`}>
      {!isStreamMode && (
        <header className="header">
          <div
            className="header-title-container"
            onClick={() => setIsAboutModalOpen(true)}
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            title="このアプリについて"
          >
            <img src="/logo.png" alt="Logo" className="header-logo" />
            <div className="header-title">MOZ-3 Anime Studio</div>
          </div>
          <ExpressionTabs
            tabs={expressions}
            activeId={activeTabId}
            onSelect={setActiveTabId}
            setTabs={setExpressions}
          />
          <button className="header-stream-btn" onClick={() => setIsStreamMode(true)} title="配信モードを開始する">📺</button>
          <button className="gear-btn" onClick={() => setIsModalOpen(true)} title="音声キャリブレーション設定">⚙️</button>
        </header>
      )}

      <main className="main-content">
        <Preview
          globalSettings={globalSettings}
          parts={activeExpression.parts}
          transform={transform}
          currentEye={currentEye}
          currentMouthKey={currentMouthKey}
          isStreamMode={isStreamMode}
        />
        {!isStreamMode && (
          <>
            <SlotPanel parts={activeExpression.parts} onPartChange={handlePartChange} />
            <SettingsPanel
              globalSettings={globalSettings}
              onGlobalSettingsChange={setGlobalSettings}
              expSettings={activeExpression.settings}
              onExpSettingsChange={handleExpSettingsChange}
              audioAnalyzer={audioAnalyzer}
              bgmList={bgmList}
              selectedBgm={selectedBgm}
              onBgmChange={handleBgmChange}
              isBgmPlaying={isBgmPlaying}
              toggleBgmPlay={toggleBgmPlay}
              stopBgm={stopBgm}
            />
          </>
        )}
      </main>

      {!isStreamMode && (
        <CalibrationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          globalSettings={globalSettings}
          onGlobalSettingsChange={setGlobalSettings}
          audioAnalyzer={audioAnalyzer}
          onStartStream={() => {
            setIsStreamMode(true);
            setIsModalOpen(false);
          }}
        />
      )}

      {isStreamMode && (
        <button
          className="exit-stream-btn"
          onClick={() => setIsStreamMode(false)}
          title="Escキーでも解除できます"
        >
          ✖ 配信モードを終了
        </button>
      )}

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}

export default App;
