import { useState, useRef, useEffect } from 'react';

export default function useAudioAnalyzer(globalSettings, initialCalibratedNormal = null) {
    const { sensitivity, silenceThreshold, noiseGateThreshold = 5, switchCooldown = 2.0, enableCooldown = true } = globalSettings;
    // Refs for states to ensure the loop closure always reads the latest values
    const isActiveRef = useRef(false);
    const isPlayingFileRef = useRef(false);

    const [isActive, setIsActiveState] = useState(false);
    const [level, setLevel] = useState(0); // 0-1
    const [detectedTone, setDetectedTone] = useState(null); // 'laugh', 'silence', 'normal'
    const [pitch, setPitch] = useState(0);

    // Audio File Elements
    const [audioFile, setAudioFile] = useState(null);
    const [audioFileName, setAudioFileName] = useState("");
    const [isPlayingFile, setIsPlayingFileState] = useState(false);
    const [fileProgress, setFileProgress] = useState(0);

    const setIsActive = (val) => {
        isActiveRef.current = val;
        setIsActiveState(val);
    };

    const setIsPlayingFile = (val) => {
        isPlayingFileRef.current = val;
        setIsPlayingFileState(val);
    };

    const audioContextRef = useRef(null);
    const micAnalyserRef = useRef(null);
    const fileAnalyserRef = useRef(null);
    const sourceRef = useRef(null);
    const fileSourceRef = useRef(null);
    const animationFrameRef = useRef(null);
    const audioElemRef = useRef(null);

    // Device Selection
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('default');

    // Tone Detection specific Refs
    const silenceStartRef = useRef(null);
    const clickMuteTimerRef = useRef(0);
    const speakingHangTimerRef = useRef(0);

    // --- Advanced Auto-Switch (Laugh Calibration Logic) ---
    // User_Pitch_Normal
    const [calibratedNormal, setCalibratedNormal] = useState(initialCalibratedNormal || 300);

    const [calibrationPhase, setCalibrationPhase] = useState('idle'); // 'idle', 'normal'
    const tempPitchesRef = useRef([]);

    // Hysteresis (Buffer): Require a tone to be detected continuously before switching
    const toneBufferQueueRef = useRef([]);
    const REQUIRED_FRAMES_FOR_SWITCH = 8; // ~130ms at 60fps

    // Stabilization Logic (Cooldown & Smoothing)
    const isLockedRef = useRef(false);
    const lockTimerRef = useRef(null);
    const currentToneRef = useRef(null);
    const recentPitchesRef = useRef([]); // for pitch moving average
    const recentVolumesRef = useRef([]); // for envelope (laugh rhythm) detection

    const startCalibration = (phase) => {
        setCalibrationPhase(phase);
        tempPitchesRef.current = [];

        setTimeout(() => {
            const pitches = tempPitchesRef.current;
            if (pitches.length > 0) {
                if (phase === 'normal') {
                    const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
                    setCalibratedNormal(avg);
                }
            }
            setCalibrationPhase('idle');
        }, 3000);
    };

    const resetCalibration = () => {
        setCalibratedNormal(300);
    };

    const initContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

            micAnalyserRef.current = audioContextRef.current.createAnalyser();
            micAnalyserRef.current.fftSize = 1024;
            micAnalyserRef.current.smoothingTimeConstant = 0.5;

            fileAnalyserRef.current = audioContextRef.current.createAnalyser();
            fileAnalyserRef.current.fftSize = 1024;
            fileAnalyserRef.current.smoothingTimeConstant = 0.5;

            audioElemRef.current = new Audio();
            audioElemRef.current.addEventListener('timeupdate', () => {
                if (audioElemRef.current.duration) {
                    setFileProgress((audioElemRef.current.currentTime / audioElemRef.current.duration) * 100);
                }
            });
            audioElemRef.current.addEventListener('ended', () => {
                setIsPlayingFile(false);
                setFileProgress(0);
                setDetectedTone(null);
            });

            fileSourceRef.current = audioContextRef.current.createMediaElementSource(audioElemRef.current);
            fileSourceRef.current.connect(fileAnalyserRef.current);
            fileAnalyserRef.current.connect(audioContextRef.current.destination);
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const getAudioDevices = async () => {
        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission first
            tempStream.getTracks().forEach(t => t.stop()); // Stop immediately to free the hardware

            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            setAudioDevices(audioInputs);
        } catch (err) {
            console.error("Error fetching audio devices: ", err);
        }
    };

    useEffect(() => {
        getAudioDevices();
        navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices);
    }, []);

    const startMicAnalysis = async (deviceId = selectedDeviceId) => {
        try {
            if (isPlayingFile) stopFile();
            initContext();

            // Enable built-in browser/Chromium Hardware & AI noise suppression
            const baseAudioConstraints = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false // Prevent the browser from boosting volume to catch quiet noises
            };

            const constraints = {
                audio: deviceId && deviceId !== 'default' ? { ...baseAudioConstraints, deviceId: { exact: deviceId } } : baseAudioConstraints
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

            // --- Physical Bandpass Filter (Cut out desk bumps and high frequency clicks) ---
            const highpassFilter = audioContextRef.current.createBiquadFilter();
            highpassFilter.type = 'highpass';
            highpassFilter.frequency.value = 250; // Ignore sub-bass (desk bumps, AC rumbles)

            const lowpassFilter = audioContextRef.current.createBiquadFilter();
            lowpassFilter.type = 'lowpass';
            lowpassFilter.frequency.value = 3500; // Ignore high frequencies (mouse clicks, sharp hisses)

            // Connect: Source -> Highpass -> Lowpass -> Analyser
            sourceRef.current.connect(highpassFilter);
            highpassFilter.connect(lowpassFilter);
            lowpassFilter.connect(micAnalyserRef.current);

            setIsActive(true);
            setDetectedTone(null);
            toneBufferQueueRef.current = [];
            currentToneRef.current = null;
            isLockedRef.current = false;
            if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
            recentPitchesRef.current = [];
            recentVolumesRef.current = [];
        } catch (err) {
            console.error("Microphone access denied or error: ", err);
            setIsActive(false);
            if (sourceRef.current) {
                sourceRef.current.disconnect();
                sourceRef.current = null;
            }
        }
    };

    const stopAnalysis = () => {
        setIsActive(false);
        if (sourceRef.current) {
            sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        setLevel(0);
        setDetectedTone(null);
    };

    const toggleMic = () => {
        if (isActive) stopAnalysis();
        else startMicAnalysis(selectedDeviceId);
    };

    const changeDevice = (deviceId) => {
        setSelectedDeviceId(deviceId);
        if (isActive) {
            stopAnalysis();
            startMicAnalysis(deviceId);
        }
    };

    // --- AUDIO FILE LOGIC ---
    const handleFileUpload = (file) => {
        if (file && file.type.startsWith('audio/')) {
            const url = URL.createObjectURL(file);
            setAudioFile(url);
            setAudioFileName(file.name);
            setFileProgress(0);
            if (isPlayingFile) stopFile();
        }
    };

    const playFile = () => {
        if (!audioFile) return;
        if (isActive) stopAnalysis();
        initContext();

        audioElemRef.current.src = audioFile;
        const seekTime = (fileProgress / 100) * (audioElemRef.current.duration || 0);
        if (fileProgress > 0 && seekTime < audioElemRef.current.duration) {
            audioElemRef.current.currentTime = seekTime;
        } else {
            audioElemRef.current.currentTime = 0;
        }
        audioElemRef.current.play();
        setIsPlayingFile(true);
        setDetectedTone(null);
        toneBufferQueueRef.current = [];
        currentToneRef.current = null;
        isLockedRef.current = false;
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        recentPitchesRef.current = [];
        recentVolumesRef.current = [];
    };

    const pauseFile = () => {
        if (audioElemRef.current) audioElemRef.current.pause();
        setIsPlayingFile(false);
    };

    const stopFile = () => {
        if (audioElemRef.current) {
            audioElemRef.current.pause();
            audioElemRef.current.currentTime = 0;
        }
        setIsPlayingFile(false);
        setFileProgress(0);
        setDetectedTone(null);
    };

    const seekFile = (percentage) => {
        setFileProgress(percentage);
        if (audioElemRef.current && audioElemRef.current.duration) {
            audioElemRef.current.currentTime = (percentage / 100) * audioElemRef.current.duration;
        }
    };

    // Helper to push to buffer and commit state if stable
    const commitToneWithBuffer = (rawTone) => {
        const queue = toneBufferQueueRef.current;
        queue.push(rawTone);
        if (queue.length > REQUIRED_FRAMES_FOR_SWITCH) {
            queue.shift();
        }

        // Delay / Hysteresis: only switch if this tone has been sustained
        const recentToneCount = queue.filter(t => t === rawTone).length;
        if (queue.length === REQUIRED_FRAMES_FOR_SWITCH && recentToneCount >= 5) {
            // Expression Switch Stabilization Logic (Gate Node & Timer Node equivalent)
            if (!isLockedRef.current) {
                if (currentToneRef.current !== rawTone || rawTone === 'laugh') {
                    // Update Current Expression
                    currentToneRef.current = rawTone;
                    setDetectedTone({ tone: rawTone, id: Date.now() });

                    // Lock the switch for Cooldown_Time if enabled
                    if (enableCooldown !== false && switchCooldown > 0) {
                        isLockedRef.current = true;
                        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);

                        lockTimerRef.current = setTimeout(() => {
                            isLockedRef.current = false;
                        }, switchCooldown * 1000); // converting seconds to ms
                    }
                }
            }
        }
    };

    const loop = (time) => {
        const currentlyActive = isActiveRef.current;
        const currentlyPlaying = isPlayingFileRef.current;

        if (!currentlyActive && !currentlyPlaying) {
            setLevel(0);
            animationFrameRef.current = requestAnimationFrame(loop);
            return;
        }

        const activeAnalyser = currentlyActive ? micAnalyserRef.current : fileAnalyserRef.current;
        if (!activeAnalyser || (!currentlyActive && !currentlyPlaying)) {
            setLevel(0);
            animationFrameRef.current = requestAnimationFrame(loop);
            return;
        }

        // --- Volume Analysis ---
        const dataArray = new Uint8Array(activeAnalyser.frequencyBinCount);
        activeAnalyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const multiplier = (sensitivity / 50) * 1.5;
        let normalized = (average / 128) * multiplier;
        if (normalized > 1) normalized = 1;

        // NOTE: We no longer unconditionaly setLevel(normalized). We set it to 0 if it's noise/click.

        // --- Volume Envelope & Transient (Click) Analysis ---
        recentVolumesRef.current.push(normalized);
        if (recentVolumesRef.current.length > 15) { // Track last ~250ms at 60fps
            recentVolumesRef.current.shift();
        }

        const volHistory = recentVolumesRef.current;
        const len = volHistory.length;
        if (len >= 2) {
            const attack = volHistory[len - 1] - volHistory[len - 2];
            // A human voice plosive takes ~30-50ms to rise. A mechanical switch takes <5ms.
            // If volume jumps wildly in a single 16ms frame, it is a hardware click/keyboard noise.
            if (attack > 0.20) {
                clickMuteTimerRef.current = time;
            }
        }
        const isMutedByClick = (time - clickMuteTimerRef.current) < 250; // Mute all lip sync for 250ms after a click

        const maxVol = Math.max(...volHistory);
        const minVol = Math.min(...volHistory);
        const volVariance = maxVol - minVol;

        // --- Silence Detection ---
        // RMS Node threshold logic
        const silenceDurSeconds = 0.5 + (silenceThreshold / 100) * 9.5;
        const silenceMaxVol = noiseGateThreshold / 100;

        // Gate: Drop if purely silent, or if forcibly muted by a physical click
        if (normalized <= silenceMaxVol || isMutedByClick) {
            setLevel(0); // Force mouth closed
            setPitch(calibratedNormal);
            if (silenceStartRef.current === null) {
                silenceStartRef.current = time;
            } else {
                const currentSilenceDur = (time - silenceStartRef.current) / 1000;
                if (currentSilenceDur >= silenceDurSeconds) {
                    commitToneWithBuffer('silence');
                } else {
                    commitToneWithBuffer('normal');
                }
            }
        } else {
            // Reset signal (voice detected)
            silenceStartRef.current = null;

            // --- Pitch Analysis ---
            const sampleRate = audioContextRef.current.sampleRate;
            const binSize = sampleRate / activeAnalyser.fftSize;

            let maxVal = -1;
            let maxIndex = -1;
            const startBin = Math.floor(50 / binSize);
            const endBin = Math.floor(1500 / binSize);

            for (let i = startBin; i < endBin && i < dataArray.length; i++) {
                if (dataArray[i] > maxVal) {
                    maxVal = dataArray[i];
                    maxIndex = i;
                }
            }

            const peakFreq = maxIndex * binSize;

            // --- Pitch Smoothing (Moving Average) ---
            let smoothedPitch = peakFreq;
            if (normalized > 0.05 && peakFreq > 50) {
                recentPitchesRef.current.push(peakFreq);
                if (recentPitchesRef.current.length > 5) { // Average over ~100ms
                    recentPitchesRef.current.shift();
                }
            } else {
                recentPitchesRef.current = [];
            }

            if (recentPitchesRef.current.length > 0) {
                smoothedPitch = recentPitchesRef.current.reduce((a, b) => a + b, 0) / recentPitchesRef.current.length;
            }
            setPitch(smoothedPitch);

            // --- Learning Calibration Phase ---
            if (calibrationPhase !== 'idle' && normalized > 0.1 && smoothedPitch > 50) {
                tempPitchesRef.current.push(smoothedPitch);
            }

            // --- Spectral Analysis (Voice vs Noise) ---
            let lowEnergy = 0;
            let highEnergy = 0;
            let lowBinsCount = 0;
            let highBinsCount = 0;
            const midBin = Math.floor(1200 / binSize); // Voice fundamentals
            const highBin = Math.floor(8000 / binSize); // Upper frequencies
            
            for (let i = startBin; i < highBin && i < dataArray.length; i++) {
                if (i < midBin) {
                    lowEnergy += dataArray[i];
                    lowBinsCount++;
                } else {
                    highEnergy += dataArray[i];
                    highBinsCount++;
                }
            }
            const avgLow = lowBinsCount > 0 ? (lowEnergy / lowBinsCount) : 0;
            const avgHigh = highBinsCount > 0 ? (highEnergy / highBinsCount) : 0;

            // 1.5x ratio is forgiving enough for all voices, but rejects ambient hum/hiss
            const isVoiceLike = avgLow > (avgHigh * 1.5);
            
            if (isVoiceLike) {
                 speakingHangTimerRef.current = time;
            }
            // Add a "Hang Time" of 500ms. If we hit a hissing "S" (not voice-like), we assume it's still speech.
            const isSpeaking = (time - speakingHangTimerRef.current) < 500;

            if (isSpeaking) {
                setLevel(normalized); // Allow lip sync
            } else {
                setLevel(0); // Loud ambient noise (e.g. constant fan). Mute lip sync.
            }

            // --- Laugh Detection Math ---
            const isLoud = maxVol > 0.30;
            const isHighPitch = smoothedPitch > (calibratedNormal * 1.15) || maxVol > 0.60;
            const hasRhythm = volVariance > 0.08;
            const framesAboveThreshold = volHistory.filter(v => v > 0.10).length;
            const isSustained = framesAboveThreshold >= 6; // At least ~100ms of decent volume

            // Gate Node / Switch Logic
            if (globalSettings.autoLaugh && isLoud && isHighPitch && hasRhythm && isVoiceLike && isSustained) {
                commitToneWithBuffer('laugh');
            } else if (isSpeaking) {
                commitToneWithBuffer('normal');
            } else {
                commitToneWithBuffer('silence');
            }
        }

        animationFrameRef.current = requestAnimationFrame(loop);
    };

    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isActive, isPlayingFile, sensitivity, silenceThreshold, noiseGateThreshold, switchCooldown, calibrationPhase, calibratedNormal, globalSettings.autoLaugh, globalSettings.autoSilence, selectedDeviceId]);

    useEffect(() => {
        return () => {
            stopAnalysis();
            if (audioElemRef.current) audioElemRef.current.pause();
            if (audioContextRef.current) audioContextRef.current.close().catch(() => { });
        };
    }, []);

    // Listen for external initial calibration updates
    useEffect(() => {
        if (initialCalibratedNormal !== null && calibratedNormal === 200) {
            setCalibratedNormal(initialCalibratedNormal);
        }
    }, [initialCalibratedNormal]);

    return {
        isActive, toggleMic, level, pitch, detectedTone,
        audioDevices, selectedDeviceId, changeDevice,
        calibrationPhase, startCalibration, resetCalibration,
        calibratedNormal,
        audioFile, audioFileName, isPlayingFile, fileProgress,
        handleFileUpload, playFile, pauseFile, stopFile, seekFile
    };
}
