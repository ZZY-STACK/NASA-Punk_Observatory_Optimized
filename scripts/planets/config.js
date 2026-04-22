const PLANET_DOCK_CONFIG = {
    sun    : {
        title  : 'SOL',
        badge  : '恒星',
        subText: '系统: <b>SOL</b> // 类型: <b>G2V</b> // 年龄: <b>46亿年</b>',
        rows   : [
            '&gt; 热扫描: <span>5778 K</span> // 稳定',
            '&gt; 太阳风: <span>400 km/s</span> <span class="alert">[高]</span>',
            '&gt; 磁场: <span>极性翻转</span> 已检测'
        ]
    },
    mercury: {
        title  : 'SOL I',
        badge  : '水星',
        subText: '系统: <b>SOL</b> // 轨道: <b>0.39 AU</b> // 偏心率: <b>0.2056</b>',
        rows   : [
            '&gt; 地形扫描: <span>灼烧玄武岩</span>',
            '&gt; 大气扫描: <span>Na / K</span> <span class="alert">[微量外层]</span>',
            '&gt; 轨道资产: <span>0 已检测</span>'
        ]
    },
    venus  : {
        title  : 'SOL II',
        badge  : '金星',
        subText: '系统: <b>SOL</b> // 轨道: <b>0.72 AU</b> // 偏心率: <b>0.0067</b>',
        rows   : [
            '&gt; 地形扫描: <span>火山平原</span>',
            '&gt; 大气扫描: <span>CO2 / H2SO4</span> <span class="alert">[超临界]</span>',
            '&gt; 轨道资产: <span>0 已检测</span>'
        ]
    },
    earth  : {
        title  : 'SOL III',
        badge  : '地球',
        subText: '系统: <b>SOL</b> // 轨道: <b>1.00 AU</b> // 偏心率: <b>0.0167</b>',
        rows   : [
            '&gt; 地形扫描: <span>硅酸盐 / 液态水</span>',
            '&gt; 大气扫描: <span>N2 / O2</span> <span class="alert">[生命支持]</span>',
            '&gt; 轨道资产: <span>5 已检测</span>'
        ]
    },
    mars   : {
        title  : 'SOL IV',
        badge  : '火星',
        subText: '系统: <b>SOL</b> // 轨道: <b>1.52 AU</b> // 偏心率: <b>0.0934</b>',
        rows   : [
            '&gt; 地形扫描: <span>氧化铁尘埃</span>',
            '&gt; 大气成分: <span>CO2 / 氩</span> <span class="alert">[稀薄]</span>',
            '&gt; 轨道资产: <span>2 已检测</span>'
        ]
    },
    jupiter: {
        title  : 'SOL V',
        badge  : '木星',
        subText: '系统: <b>SOL</b> // 轨道: <b>5.20 AU</b> // 偏心率: <b>0.0484</b>',
        rows   : [
            '&gt; 地形扫描: <span>N/A</span> <span class="alert">[气体巨行星]</span>',
            '&gt; 大气扫描: <span>H2 / He / NH3</span> <span class="alert">[风暴带]</span>',
            '&gt; 轨道资产: <span>10 已检测</span>'
        ]
    },
    saturn : {
        title  : 'SOL VI',
        badge  : '土星',
        subText: '系统: <b>SOL</b> // 轨道: <b>9.58 AU</b> // 偏心率: <b>0.0541</b>',
        rows   : [
            '&gt; 地形扫描: <span>N/A</span> <span class="alert">[气体巨行星]</span>',
            '&gt; 大气扫描: <span>H2 / He</span> <span class="alert">[六角极]</span>',
            '&gt; 轨道资产: <span>9 已检测</span>'
        ]
    },
    uranus : {
        title  : 'SOL VII',
        badge  : '天王星',
        subText: '系统: <b>SOL</b> // 轨道: <b>19.22 AU</b> // 偏心率: <b>0.0472</b>',
        rows   : [
            '&gt; 地形扫描: <span>N/A</span> <span class="alert">[冰巨行星]</span>',
            '&gt; 大气扫描: <span>H2 / He / CH4</span> <span class="alert">[寒冷]</span>',
            '&gt; 轨道资产: <span>16 已检测</span>'
        ]
    },
    neptune: {
        title  : 'SOL VIII',
        badge  : '海王星',
        subText: '系统: <b>SOL</b> // 轨道: <b>30.07 AU</b> // 偏心率: <b>0.0086</b>',
        rows   : [
            '&gt; 地形扫描: <span>N/A</span> <span class="alert">[冰巨行星]</span>',
            '&gt; 大气扫描: <span>H2 / He / CH4</span> <span class="alert">[超音速]</span>',
            '&gt; 轨道资产: <span>5 已检测</span>'
        ]
    }
};

const PLANET_MONITOR_CONFIG = {
    sun    : {
        active      : 'sun',
        reticleLarge: true
    },
    mercury: {
        active: 'mercury'
    },
    venus  : {
        active: 'venus'
    },
    earth  : {
        active: 'earth'
    },
    mars   : {
        active: 'mars'
    },
    jupiter: {
        active      : 'jupiter',
        reticleLarge: true
    },
    saturn : {
        active      : 'saturn',
        reticleLarge: true
    },
    uranus : {
        active      : 'uranus',
        reticleLarge: true
    },
    neptune: {
        active                : 'neptune',
        activeMarkerExtraClass: 'p-neptune-theme'
    }
};

const PLANET_UI_CONFIG = Object.keys(PLANET_DOCK_CONFIG).reduce((acc, planetName) =>
{
    acc[planetName] = Object.assign(
        {},
        PLANET_DOCK_CONFIG[planetName],
        PLANET_MONITOR_CONFIG[planetName]
    );
    return acc;
}, {});
