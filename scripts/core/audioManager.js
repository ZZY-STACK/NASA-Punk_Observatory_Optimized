/**
 * NASA-Punk Audio Manager
 * Manages background music across page transitions
 */
(function initAudioManager(global) {
    const AUDIO_STORAGE_KEY = 'nasa_punk_audio_position';
    
    function saveAudioPosition() {
        const audio = document.getElementById('background-music');
        if (audio) {
            localStorage.setItem(AUDIO_STORAGE_KEY, audio.currentTime.toString());
        }
    }
    
    function loadAudioPosition() {
        const savedPosition = localStorage.getItem(AUDIO_STORAGE_KEY);
        if (savedPosition) {
            const audio = document.getElementById('background-music');
            if (audio) {
                audio.currentTime = parseFloat(savedPosition);
            }
        }
    }
    
    let _interactionHandlerAdded = false;
    let _audioActivated = false;

    function tryStartAudio(audio)
    {
        if (!audio || !audio.paused)
        {
            return;
        }

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function')
        {
            playPromise.catch(() =>
            {
                if (!_interactionHandlerAdded)
                {
                    const resumeAudio = function ()
                    {
                        audio.play().catch(() =>
                        {
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

    function activateAudio()
    {
        if (_audioActivated)
        {
            return;
        }
        _audioActivated = true;

        const audio = document.getElementById('background-music');
        if (!audio)
        {
            return;
        }
        tryStartAudio(audio);
    }

    function initAudio() {
        const audio = document.getElementById('background-music');
        if (!audio)
        {
            return;
        }

        if (window.parent !== window)
        {
            audio.pause();
            audio.muted = true;
            return;
        }

        window.addEventListener('message', (event) =>
        {
            if (!event.data)
            {
                return;
            }
            if (event.data.type === 'user-interaction' || event.data.type === 'activate-audio')
            {
                activateAudio();
            }
        });

        document.body.addEventListener('click', () =>
        {
            activateAudio();
        }, {once: true, passive: true});
        document.body.addEventListener('touchstart', () =>
        {
            activateAudio();
        }, {once: true, passive: true});

        // 加载保存的播放位置
        loadAudioPosition();
        
        // 定期保存播放位置
        setInterval(saveAudioPosition, 1000);
        
        // 页面卸载时保存播放位置
        window.addEventListener('beforeunload', saveAudioPosition);
    }
    
    global.AudioManager = {
        init: initAudio,
        savePosition: saveAudioPosition,
        loadPosition: loadAudioPosition
    };
})(window);