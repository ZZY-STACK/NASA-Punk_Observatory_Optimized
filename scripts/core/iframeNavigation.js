/**
 * IFrame Navigation Helper - 🔥 修复版
 * Enables smooth navigation within iframe without page refresh
 * 修复：Cannot redefine property: href 报错
 */
(function initIframeNavigation(global) {
    // 重写导航方法，使用postMessage与父窗口通信
    function setupNavigation() {
        function sendActivationIfPlanet(url)
        {
            if (window.parent !== window && isPlanetPageUrl(url))
            {
                window.parent.postMessage({ type: 'activate-audio' }, '*');
            }
        }

        if (typeof TransitionManager !== 'undefined') {
            const originalNavigate = TransitionManager.navigate;
            TransitionManager.navigate = function(url) {
                // 检查是否在iframe中
                if (window.parent !== window) {
                    // 发送导航消息给父窗口
                    window.parent.postMessage({ type: 'navigate', url: url }, '*');
                    sendActivationIfPlanet(url);
                } else {
                    // 不在iframe中，使用原始导航方法
                    originalNavigate(url);
                }
            };
        }
        
        // 🔥 修复版：处理直接的window.location.href调用（加安全检查，防止报错）
        try {
            const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');
            // 只有当属性存在且可配置时，才尝试重定义
            if (originalLocationHref && originalLocationHref.configurable) {
                Object.defineProperty(window.location, 'href', {
                    set: function(url) {
                        if (window.parent !== window) {
                            window.parent.postMessage({ type: 'navigate', url: url }, '*');
                            if (isPlanetPageUrl(url)) {
                                window.parent.postMessage({ type: 'activate-audio' }, '*');
                            }
                        } else {
                            originalLocationHref.set.call(window.location, url);
                        }
                    },
                    get: originalLocationHref.get
                });
            }
        } catch (e) {
            // 静默失败，不影响其他功能
            console.warn('⚠️ 跳过 window.location.href 重定义（浏览器不支持）', e);
        }
        
        function isPlanetPageUrl(url)
        {
            return /(?:mercury|venus|earth|mars|jupiter|saturn|uranus|neptune)\.html(?:[?#]|$)/i.test(url);
        }

        // 处理<a>标签点击
        document.addEventListener('click', function(e) {
            const target = e.target.closest('a');
            if (window.parent !== window)
            {
                window.parent.postMessage({ type: 'user-interaction' }, '*');
            }
            if (target && target.href) {
                e.preventDefault();
                const url = target.href;
                // 检查是否在iframe中
                if (window.parent !== window) {
                    // 发送导航消息给父窗口
                    window.parent.postMessage({ type: 'navigate', url: url }, '*');
                    if (isPlanetPageUrl(url)) {
                        window.parent.postMessage({ type: 'activate-audio' }, '*');
                    }
                } else {
                    // 不在iframe中，直接导航
                    window.location.href = url;
                }
            }
        });

        document.addEventListener('touchstart', function() {
            if (window.parent !== window)
            {
                window.parent.postMessage({ type: 'user-interaction' }, '*');
            }
        }, {once: true, passive: true});
    }
    
    // 当DOM加载完成后设置导航
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupNavigation);
    } else {
        // DOM已经加载完成，直接设置导航
        setupNavigation();
    }
    
    global.IframeNavigation = {
        setup: setupNavigation
    };
})(window);