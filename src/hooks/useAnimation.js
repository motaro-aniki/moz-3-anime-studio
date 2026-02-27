import { useState, useEffect, useRef } from 'react';

export default function useAnimation(audioLevel, expSettings, activeMouthCount) {
    const [currentEye, setCurrentEye] = useState('eyeOpen');
    const [mouthIndex, setMouthIndex] = useState(0);
    const [transform, setTransform] = useState({ scaleY: 1, translateY: 0, translateX: 0 });

    const blinkTimeoutRef = useRef(null);

    // Blink sequence logic
    useEffect(() => {
        let isSubscribed = true;

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const doBlink = async () => {
            setCurrentEye('eyeClosed');
            await wait(80);
            if (!isSubscribed) return;
            setCurrentEye('eyeHalf');
            await wait(80);
            if (!isSubscribed) return;
            setCurrentEye('eyeOpen');
        };

        const scheduleBlink = () => {
            const waitTime = 2000 + Math.random() * 4000; // 2-6 seconds
            blinkTimeoutRef.current = setTimeout(async () => {
                if (!isSubscribed) return;

                await doBlink();
                if (!isSubscribed) return;

                // 30% chance for a quick double blink
                if (Math.random() < 0.3) {
                    await wait(150);
                    if (!isSubscribed) return;
                    await doBlink();
                }

                scheduleBlink();
            }, waitTime);
        };

        scheduleBlink();

        return () => {
            isSubscribed = false;
            clearTimeout(blinkTimeoutRef.current);
        };
    }, []);

    const audioLevelRef = useRef(audioLevel);
    const expSettingsRef = useRef(expSettings);
    const activeMouthCountRef = useRef(activeMouthCount);

    useEffect(() => {
        audioLevelRef.current = audioLevel;
        expSettingsRef.current = expSettings;
        activeMouthCountRef.current = activeMouthCount;
    }, [audioLevel, expSettings, activeMouthCount]);

    // Frame-by-frame loop for continuous animation
    useEffect(() => {
        let animationFrame;
        const startTime = performance.now();

        const loop = (time) => {
            const currentAudioLevel = audioLevelRef.current;
            const { preset, idleAnim, breathSpeed } = expSettingsRef.current;
            const currentMouthCount = activeMouthCountRef.current;

            // 1. Lip Sync Mapping
            let mIndex = 0;
            if (currentMouthCount > 1 && currentAudioLevel > 0.05) {
                const thresholds = currentMouthCount - 1;
                const normalizedAudio = Math.min(Math.max((currentAudioLevel - 0.05) / 0.95, 0), 1);
                mIndex = 1 + Math.floor(normalizedAudio * (thresholds - 0.001));
            }
            setMouthIndex(mIndex);

            // 2. Transform Logic / Idling vs Bouncing
            const elapsed = time - startTime;

            // Idle Animation (always calculated, never stops unless set to 'none')
            let idleSy = 1.0;
            if (idleAnim === 'breathing') {
                const speedMult = 0.001 + (breathSpeed / 100) * 0.005;
                idleSy = 1.0 + 0.015 * Math.sin(elapsed * speedMult);
            }

            let sY = idleSy;
            let tY = 0;
            let tX = 0;

            // Bounce Preset is ONLY applied if audio is playing AND preset isn't off.
            const isTalking = currentAudioLevel > 0.05 && preset !== 'off';

            if (isTalking) {
                switch (preset) {
                    case 'poyon':
                        sY += currentAudioLevel * 0.15;
                        break;
                    case 'pyonpyon':
                        tY = -(currentAudioLevel * 40);
                        break;
                    case 'bibibi':
                        tX = (Math.random() - 0.5) * 10 * currentAudioLevel;
                        break;
                }
            }

            setTransform({ scaleY: sY, translateY: tY, translateX: tX });

            animationFrame = requestAnimationFrame(loop);
        };

        animationFrame = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationFrame);
    }, []);

    return { currentEye, mouthIndex, transform };
}
