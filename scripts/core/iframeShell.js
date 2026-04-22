(function initIframeShell(global)
{
    const contentFrame = document.getElementById('content-frame');
    if (!contentFrame)
    {
        return;
    }

    const internalRouteMap = {
        'index.html': 'system.html',
        '/index.html': 'system.html',
        './index.html': 'system.html',
        '../index.html': 'system.html',
        '': 'system.html',
        '/': 'system.html',
        'system.html': 'system.html'
    };

    function getRouteFromHash()
    {
        if (!window.location.hash)
        {
            return null;
        }
        const hash = window.location.hash.slice(1);
        return hash.trim() || null;
    }

    function normalizeTargetUrl(url)
    {
        if (typeof url !== 'string' || url.trim().length === 0)
        {
            return 'system.html';
        }

        try
        {
            const resolved = new URL(url, window.location.href);
            const pathname = resolved.pathname.replace(/\\/g, '/');
            const page = pathname.split('/').pop() || '';
            const normalizedPage = page.toLowerCase().trim();

            if (internalRouteMap[normalizedPage])
            {
                return internalRouteMap[normalizedPage];
            }

            return page + resolved.search + resolved.hash;
        }
        catch (error)
        {
            return 'system.html';
        }
    }

    function updateShellUrl(target)
    {
        const hash = target ? `#${target}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${hash}`);
    }

    function loadFrame(url)
    {
        const target = normalizeTargetUrl(url);
        contentFrame.src = target;
        updateShellUrl(target);
    }

    window.addEventListener('message', (event) =>
    {
        if (event.source !== contentFrame.contentWindow)
        {
            return;
        }

        if (!event.data || event.data.type !== 'navigate')
        {
            return;
        }

        loadFrame(event.data.url);
    });

    window.addEventListener('popstate', () =>
    {
        const page = getRouteFromHash() || 'system.html';
        contentFrame.src = normalizeTargetUrl(page);
    });

    const initialPage = getRouteFromHash() || 'system.html';
    contentFrame.src = normalizeTargetUrl(initialPage);
})(window);
