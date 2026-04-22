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
    
    function initAudio() {
        const audio = document.getElementById('background-music');
        if (audio) {
            // 加载保存的播放位置
            loadAudioPosition();
            
            // 定期保存播放位置
            setInterval(saveAudioPosition, 1000);
            
            // 页面卸载时保存播放位置
            window.addEventListener('beforeunload', saveAudioPosition);
        }
    }
    
    global.AudioManager = {
        init: initAudio,
        savePosition: saveAudioPosition,
        loadPosition: loadAudioPosition
    };
})(window);