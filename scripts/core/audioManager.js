/**
 * NASA-Punk Audio Manager
 * Manages background music across page transitions
 */
(function initAudioManager(global) {
    const AUDIO_STORAGE_KEY = 'nasa_punk_audio_position';
    const AUDIO_VOLUME_KEY = 'nasa_punk_audio_volume';
    const AUDIO_MUTED_KEY = 'nasa_punk_audio_muted';
    
    let _audioElement = null;
    let _interactionHandlerAdded = false;
    let _audioActivated = false;
    let _isMainWindow = (window.parent === window);

    function getAudioElement() {
        if (!_audioElement) {
            _audioElement = document.getElementById('background-music');
        }
        return _audioElement;
    }

    function saveAudioState() {
        const audio = getAudioElement();
        if (audio) {
            try {
                localStorage.setItem(AUDIO_STORAGE_KEY, audio.currentTime.toString());
                localStorage.setItem(AUDIO_VOLUME_KEY, audio.volume.toString());
                localStorage.setItem(AUDIO_MUTED_KEY, audio.muted.toString());
            } catch (error) {
                console.error('保存音频状态失败:', error);
            }
        }
    }
    
    function loadAudioState() {
        const audio = getAudioElement();
        if (!audio) return;
        
        try {
            const savedPosition = localStorage.getItem(AUDIO_STORAGE_KEY);
            if (savedPosition) {
                audio.currentTime = parseFloat(savedPosition);
            }
            
            const savedVolume = localStorage.getItem(AUDIO_VOLUME_KEY);
            if (savedVolume) {
                audio.volume = parseFloat(savedVolume);
            }
            
            const savedMuted = localStorage.getItem(AUDIO_MUTED_KEY);
            if (savedMuted) {
                audio.muted = (savedMuted === 'true');
            }
        } catch (error) {
            console.error('加载音频状态失败:', error);
        }
    }

    function tryStartAudio() {
        const audio = getAudioElement();
        if (!audio || !audio.paused) {
            return;
        }

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {
                if (!_interactionHandlerAdded) {
                    const resumeAudio = function() {
                        audio.play().catch(() => {
                        });
                        document.body.removeEventListener('click', resumeAudio);
                        document.body.removeEventListener('touchstart', resumeAudio);
                    };

                    document.body.addEventListener('click', resumeAudio, {once: true, passive: true});
                    document.body.addEventListener('touchstart', resumeAudio, {once: true, passive: true});
                    _interactionHandlerAdded = true;
                }
            });
        }
    }

    function toggleAudio() {
        const audio = getAudioElement();
        if (!audio) {
            return;
        }

        if (!_isMainWindow) {
            // 如果在iframe中，向主窗口发送消息
            window.parent.postMessage({ type: 'toggle-audio' }, '*');
            return;
        }

        if (audio.paused) {
            tryStartAudio();
        } else {
            audio.pause();
        }
        saveAudioState();
    }

    function setVolume(volume) {
        const audio = getAudioElement();
        if (!audio) {
            return;
        }

        if (!_isMainWindow) {
            // 如果在iframe中，向主窗口发送消息
            window.parent.postMessage({ type: 'set-volume', volume: volume }, '*');
            return;
        }

        audio.volume = volume;
        saveAudioState();
    }

    function setMuted(muted) {
        const audio = getAudioElement();
        if (!audio) {
            return;
        }

        if (!_isMainWindow) {
            // 如果在iframe中，向主窗口发送消息
            window.parent.postMessage({ type: 'set-muted', muted: muted }, '*');
            return;
        }

        audio.muted = muted;
        saveAudioState();
    }

    function activateAudio() {
        if (_audioActivated) {
            return;
        }
        _audioActivated = true;

        if (!_isMainWindow) {
            // 如果在iframe中，向主窗口发送消息
            window.parent.postMessage({ type: 'activate-audio' }, '*');
            return;
        }

        tryStartAudio();
    }

    function initAudio() {
        const audio = getAudioElement();
        if (!audio) {
            return;
        }

        if (!_isMainWindow) {
            // 在iframe中，禁用音频
            audio.pause();
            audio.muted = true;
            return;
        }

        // 加载保存的音频状态
        loadAudioState();

        // 监听来自iframe的消息
        window.addEventListener('message', (event) => {
            if (!event.data) {
                return;
            }
            
            switch (event.data.type) {
                case 'toggle-audio':
                    toggleAudio();
                    break;
                case 'set-volume':
                    setVolume(event.data.volume);
                    break;
                case 'set-muted':
                    setMuted(event.data.muted);
                    break;
                case 'activate-audio':
                    activateAudio();
                    break;
                case 'user-interaction':
                    activateAudio();
                    break;
            }
        });

        // 监听用户交互
        document.body.addEventListener('click', () => {
            activateAudio();
        }, {once: true, passive: true});
        document.body.addEventListener('touchstart', () => {
            activateAudio();
        }, {once: true, passive: true});

        // 定期保存音频状态
        setInterval(saveAudioState, 1000);
        
        // 页面卸载时保存音频状态
        window.addEventListener('beforeunload', saveAudioState);
    }
    
    global.AudioManager = {
        init: initAudio,
        activate: activateAudio,
        toggle: toggleAudio,
        setVolume: setVolume,
        setMuted: setMuted,
        saveState: saveAudioState,
        loadState: loadAudioState
    };
})(window);