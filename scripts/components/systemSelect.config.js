(function initSystemSelectConfig(global)
{
    global.SYSTEM_SELECT_CONFIG = {
        dock       : {
            title    : '系别 : SOL',
            subText  : '扇区: <b>太阳系</b> // 恒星: <b>G2V_矮星</b> // 行星: <b>8</b>',
            rows     : ['&gt; 系统概览: <span class="alert">SOL</span>'],
            footerRow: '<div class="terminal-output" id="terminal-content"></div>'
        },
        interaction: {
            initialTerminalText: '> 系统就绪...\n> 选择目标\n> 待机...',
            planetsTotalWidthPx: 482,
            gapsCount          : 8,
            targetWidthRatio   : 0.70,
            minimumGapPx       : 20
        },
        zoom       : {
            sliderId : 'zoom-slider',
            displayId: 'scale-val',
            label    : '视野缩放',
            value    : '100%'
        },
        nodes      : [
            {
                name : 'sun',
                label: '太阳',
                link : 'sun.html',
                data : '> 目标: SOL [恒星]\n> 类型: G2V 黄矮星\n> 状态: 活跃',
                inner: `
                <div class="planet-body"></div>
            `
            },
            {
                name : 'mercury',
                label: '水星',
                link : 'mercury.html',
                data : '> 目标: SOL-I [水星]\n> 类型: 岩石行星\n> 状态: 在线',
                inner: `
                <div class="planet-body"></div>
            `
            },
            {
                name : 'venus',
                label: '金星',
                link : 'venus.html',
                data : '> 目标: SOL-II [金星]\n> 类型: 岩石行星\n> 状态: 在线',
                inner: `
                <div class="planet-body"></div>
            `
            },
            {
                name : 'earth',
                label: '地球',
                link : 'earth.html',
                data : '> 目标: SOL-III [地球]\n> 类型: 岩石行星\n> 状态: 可居住',
                inner: `
                <div class="planet-body"></div>
                <div class="satellite-orbit orbit-hidden">
                    <div class="satellite"></div>
                </div>
            `
            },
            {
                name : 'mars',
                label: '火星',
                link : 'mars.html',
                data : '> 目标: SOL-IV [火星]\n> 类型: 岩石行星\n> 状态: 在线',
                inner: `
                <div class="planet-body"></div>
                <div class="satellite-orbit orbit-hidden o-phobos">
                    <div class="satellite sat-small s-phobos"></div>
                </div>
                <div class="satellite-orbit orbit-hidden o-deimos">
                    <div class="satellite sat-small s-deimos"></div>
                </div>
            `
            },
            {
                name : 'jupiter',
                label: '木星',
                link : 'jupiter.html',
                data : '> 目标: SOL-V [木星]\n> 类型: 气体巨行星\n> 状态: 在线',
                inner: `
                <div class="planet-body"></div>
                <div class="satellite-orbit orbit-hidden">
                    <div class="satellite"></div>
                </div>
            `
            },
            {
                name : 'saturn',
                label: '土星',
                link : 'saturn.html',
                data : '> 目标: SOL-VI [土星]\n> 类型: 气体巨行星\n> 状态: 在线',
                inner: `
                <div class="ring-back"></div>
                <div class="planet-body"></div>
                <div class="ring-front"></div>
                <div class="satellite-orbit orbit-hidden">
                    <div class="satellite"></div>
                </div>
            `
            },
            {
                name : 'uranus',
                label: '天王星',
                link : 'uranus.html',
                data : '> 目标: SOL-VII [天王星]\n> 类型: 冰巨行星\n> 状态: 在线',
                inner: `
                <div class="ring-back"></div>
                <div class="planet-body"></div>
                <div class="ring-front"></div>
                <div class="satellite-orbit orbit-hidden">
                    <div class="satellite"></div>
                </div>
            `
            },
            {
                name : 'neptune',
                label: '海王星',
                link : 'neptune.html',
                data : '> 目标: SOL-VIII [海王星]\n> 类型: 冰巨行星\n> 状态: 在线',
                inner: `
                <div class="ring-back ring-faint"></div>
                <div class="planet-body"></div>
                <div class="ring-front ring-faint"></div>
                <div class="satellite-orbit orbit-hidden o-triton">
                    <div class="satellite s-triton"></div>
                </div>
            `
            }
        ]
    };
})(window);
