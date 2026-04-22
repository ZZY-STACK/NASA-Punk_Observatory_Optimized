// ==========================================
// NASA-Punk Project: SATURN - 嫦娥探月采样数据专属版
// 数据映射：累计采样3666.3g → 星环粒子 366630 个
// 视觉规则：球体保留原生设计 | 星环承载数据 | 统一3秒延迟
// ==========================================

//  【新增】核心数据配置（仅加这一段，无结构改动）
const MAX_SAMPLE = 3666.3;
const MAX_SATURN_RING_PARTICLE = 366630;
const PARTICLE_PER_GRAM = 100;
const INIT_SAMPLE = 1731.0;
const INIT_TARGET_PARTICLE = 172600; // 略小于实际粒子总数172640，确保动画能触发
// 嫦娥探月数据分段
const saturnDataSegments = [
  { sample: 1731.0, date: "2020.12.17" },
  { sample: 3666.3, date: "2024.06.25" }
];

// 全局状态
window.currentSaturnSample = 1731.0;

// 数据工具函数（复用木星逻辑，无改动）
function dateToTimestamp(str) {
  const [y, m, d] = str.split('.');
  return new Date(y, m - 1, d).getTime();
}

function getSaturnData(particleCount) {
  const currentSample = Math.min(MAX_SAMPLE, parseFloat((particleCount / PARTICLE_PER_GRAM).toFixed(1)));
  for (let i = 0; i < saturnDataSegments.length - 1; i++) {
    const s = saturnDataSegments[i];
    const e = saturnDataSegments[i + 1];
    if (currentSample >= s.sample && currentSample <= e.sample) {
      const rate = (currentSample - s.sample) / (e.sample - s.sample);
      const curTime = dateToTimestamp(s.date) + (dateToTimestamp(e.date) - dateToTimestamp(s.date)) * rate;
      const date = new Date(curTime);
      return {
        date: `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,0)}.${String(date.getDate()).padStart(2,0)}`,
        sample: currentSample
      };
    }
  }
  return { date: "2024.06.25", sample: MAX_SAMPLE };
}

// 日期滚动函数（类似密码锁或钟表滚动）
function rollToDate(element, fromDate, toDate) {
  const [fromY, fromM, fromD] = fromDate.split('.').map(Number);
  const [toY, toM, toD] = toDate.split('.').map(Number);
  
  let currentY = fromY;
  let currentM = fromM;
  let currentD = fromD;
  
  const duration = 1500; // 1.5秒滚动
  const steps = 20;
  const stepDuration = duration / steps;
  
  let step = 0;
  const interval = setInterval(() => {
    step++;
    
    // 年份变化
    if (step <= 5) {
      currentY = fromY + Math.floor((toY - fromY) * (step / 5));
    } else if (step <= 10) {
      currentM = fromM + Math.floor((toM - fromM) * ((step - 5) / 5));
    } else {
      currentD = fromD + Math.floor((toD - fromD) * ((step - 10) / 10));
    }
    
    element.innerText = `${currentY}.${String(currentM).padStart(2,0)}.${String(currentD).padStart(2,0)}`;
    
    if (step >= steps) {
      clearInterval(interval);
      element.innerText = toDate; // 确保最终显示正确日期
    }
  }, stepDuration);
}

// 翻页动画函数（像钟表或书本翻页，定期跳变日期）
function startPageAnimation(element, fromDate, toDate) {
  const [fromY, fromM, fromD] = fromDate.split('.').map(Number);
  const [toY, toM, toD] = toDate.split('.').map(Number);
  
  let currentDate = new Date(fromY, fromM - 1, fromD);
  const endDate = new Date(toY, toM - 1, toD);
  
  // 每500ms前进一个月
  const interval = setInterval(() => {
    // 前进一个月
    currentDate.setMonth(currentDate.getMonth() + 1);
    
    // 如果超过结束日期，停止
    if (currentDate > endDate) {
      clearInterval(interval);
      element.innerText = toDate;
      return;
    }
    
    // 显示当前日期
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    element.innerText = `${year}.${String(month).padStart(2,0)}.${String(day).padStart(2,0)}`;
    
    // 添加翻页动画效果（可选）
    element.style.animation = 'none';
    element.offsetHeight; // 强制重绘
    element.style.animation = 'pageFlip 0.3s ease-in-out';
  }, 500); // 每500ms翻一页
}

// --- PART 1: 基础观测背景 ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100
});
sharedTopoBackground.resize();


// ==========================================
// PART 2: Three.js 3D 场景 (SOL-VI SATURN SYSTEM)
// ==========================================
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

let currentZoom    = 42;
const INITIAL_ZOOM = 42;
camera.position.z  = currentZoom;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha    : true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const zoomDisplay = document.getElementById('zoom-text-display');
const tgtLabel    = document.querySelector('.monitor-label.label-bottom');

const group = new THREE.Group();
scene.add(group);

// 1. 倾角容器 (保持原设计)
const saturnTiltGroup      = new THREE.Group();
saturnTiltGroup.rotation.z = 27 * (Math.PI / 180);
saturnTiltGroup.rotation.x = 15 * (Math.PI / 180);
group.add(saturnTiltGroup);

// 2. 自转容器
const planetSpinGroup = new THREE.Group();
saturnTiltGroup.add(planetSpinGroup);

// 3. 大气层独立容器
const planetAtmoGroup = new THREE.Group();
saturnTiltGroup.add(planetAtmoGroup);

// 泰坦容器
const titanOrbitGroup = new THREE.Group();
saturnTiltGroup.add(titanOrbitGroup);
const titanBodyGroup = new THREE.Group();
titanOrbitGroup.add(titanBodyGroup);
const titanAtmoGroup = new THREE.Group();
titanBodyGroup.add(titanAtmoGroup);

const ringUniforms = {
    uTime: { value: 0.0 }
};

// 卫星数组
const moons = [];
let titanAngle = 0;
const titanOrbitRadius = 16.2;


// --- A. 程序化气态巨行星 (SATURN) - 保留原生设计 ---
function createGasGiant()
{
    const particleCount = 1200000;
    const positions     = [];
    const colors        = [];
    const noiseGen      = new SimplexNoise('saturn-seed-v2');

    const saturnCream     = new THREE.Color('#E3DAC5');
    const saturnBeige     = new THREE.Color('#C9A070');
    const saturnTan       = new THREE.Color('#B08D55');
    const saturnAtmosphere = new THREE.Color('#d6c8a8');

    for (let i = 0; i < particleCount; i++)
    {
        const r     = 5.4 + Math.random() * 0.1;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);

        positions.push(x, y, z);

        let lat = (y / r + 1.0) * 0.5;
        let n   = noiseGen.noise3D(x * 2.5, y * 0.8, z * 2.5);
        let band = Math.cos(lat * 40.0) * 0.8 + Math.cos(lat * 15.0) * 0.4;

        let c = new THREE.Color();
        let idx = Math.floor(lat * 4 + band) % 4;
        if (idx < 0) idx = 0;

        if (idx === 0) c.copy(saturnCream);
        else if (idx === 1) c.copy(saturnBeige);
        else if (idx === 2) c.copy(saturnCream);
        else c.copy(saturnTan);

        colors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    const mat    = new THREE.PointsMaterial({
        size           : 0.06,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.98,
        sizeAttenuation: true
    });
    const planet = new THREE.Points(geo, mat);
    planetSpinGroup.add(planet);

    let saturnSurfaceIndex = 0;
    let saturnSurfaceFrame = 0;
    let startTime = Date.now();
    const saturnSurfaceBatchStart = 300;
    const saturnSurfaceBatchSlope = 50;
    const saturnSurfaceBatchMax = 4000;

    function addSaturnSurfaceParticles()
    {
        saturnSurfaceFrame += 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = saturnSurfaceBatchStart * speedFactor;
        const adjustedBatchSlope = saturnSurfaceBatchSlope * speedFactor;
        const adjustedBatchMax = saturnSurfaceBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + saturnSurfaceFrame * adjustedBatchSlope);
        const endIndex = Math.min(saturnSurfaceIndex + batchSize, positions.length / 3);
        const posArray = positions.slice(0, endIndex * 3);
        const colArray = colors.slice(0, endIndex * 3);

        geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

        saturnSurfaceIndex = endIndex;
        if (saturnSurfaceIndex < positions.length / 3)
        {
            requestAnimationFrame(addSaturnSurfaceParticles);
        }
    }
    addSaturnSurfaceParticles();

    // 平流层薄雾
    const hazeCount = 60000;
    const hazePos   = [];
    const hazeCols  = [];

    for (let i = 0; i < hazeCount; i++)
    {
        const r     = 5.55 + Math.random() * 0.08;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);

        hazePos.push(x, y, z);
        let c = new THREE.Color().copy(saturnAtmosphere);
        c.multiplyScalar(0.85 + Math.random() * 0.15);
        hazeCols.push(c.r, c.g, c.b);
    }

    const hazeGeo = new THREE.BufferGeometry();
    const hazeMat    = new THREE.PointsMaterial({
        size           : 0.06,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.12,
        sizeAttenuation: true,
        blending       : THREE.AdditiveBlending,
        depthWrite     : false
    });
    const planetHaze = new THREE.Points(hazeGeo, hazeMat);
    planetAtmoGroup.add(planetHaze);

    let saturnHazeIndex = 0;
    let saturnHazeFrame = 0;
    let hazeStartTime = Date.now();
    const saturnHazeBatchStart = 300;
    const saturnHazeBatchSlope = 50;
    const saturnHazeBatchMax = 3500;

    function addSaturnHazeParticles()
    {
        saturnHazeFrame += 1;
        const elapsed = (Date.now() - hazeStartTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = saturnHazeBatchStart * speedFactor;
        const adjustedBatchSlope = saturnHazeBatchSlope * speedFactor;
        const adjustedBatchMax = saturnHazeBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + saturnHazeFrame * adjustedBatchSlope);
        const endIndex = Math.min(saturnHazeIndex + batchSize, hazePos.length / 3);
        const posArray = hazePos.slice(0, endIndex * 3);
        const colArray = hazeCols.slice(0, endIndex * 3);

        hazeGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
        hazeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

        saturnHazeIndex = endIndex;
        if (saturnHazeIndex < hazePos.length / 3)
        {
            requestAnimationFrame(addSaturnHazeParticles);
        }
    }
    addSaturnHazeParticles();

    // 隐形网格
    // const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.6, 24, 16));
    // const wireMat = new THREE.LineBasicMaterial({
    //     color      : '#c2b280',
    //     transparent: true,
    //     opacity    : 0.0
    // });
    // planetSpinGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}


// --- B. 星环 - 数据承载核心（ 仅修改这里，添加分批加载+数据联动）---
function createProceduralRings()
{
    const ringParticles = MAX_SATURN_RING_PARTICLE;
    const positions     = [];
    const colors        = [];

    const innerRadius = 6.3;
    const outerRadius = 12.0;

    const colorRingC       = new THREE.Color('#2A2520');
    const colorRingB_Inner = new THREE.Color('#CDBFA0');
    const colorRingB_Outer = new THREE.Color('#DCCBBA');
    const colorCassini     = new THREE.Color('#050505');
    const colorRingA       = new THREE.Color('#989085');
    const colorRingF       = new THREE.Color('#AFAFA0');

    for (let i = 0; i < ringParticles; i++)
    {
        let r, c;
        const angle = Math.random() * Math.PI * 2;
        const rand = Math.random();

        if (rand < 0.15) {
            r = 6.3 + Math.random() * (7.7 - 6.3);
            c = colorRingC;
        } else if (rand < 0.65) {
            let t = Math.random();
            r = 7.7 + t * (9.5 - 7.7);
            c = colorRingB_Inner.clone().lerp(colorRingB_Outer, t);
        } else if (rand < 0.69) {
            r = 9.5 + Math.random() * (9.8 - 9.5);
            c = colorCassini;
        } else if (rand < 0.99) {
            r = 9.8 + Math.random() * (11.0 - 9.8);
            c = colorRingA;
            if (r > 10.8 && r < 10.9) continue;
        } else {
            r = 11.3 + Math.random() * 0.2;
            c = colorRingF;
        }

        const x = r * Math.cos(angle);
        const z = r * Math.sin(angle);
        const y = (Math.random() - 0.5) * 0.06;

        positions.push(x, y, z);
        colors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    const shaderMat = new THREE.ShaderMaterial({
        uniforms      : ringUniforms,
        vertexShader  : `
            uniform float uTime;
            attribute vec3 color;
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                float r = length(position.xz);
                float speed = 12.0 * pow(r, -1.4);
                float angle = -uTime * speed;
                float c = cos(angle);
                float s = sin(angle);
                vec3 newPos = vec3(
                    position.x * c - position.z * s,
                    position.y,
                    position.x * s + position.z * c
                );
                vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
                gl_PointSize = 2.0 * (30.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 0.8); 
            }
        `,
        transparent   : true,
        depthWrite    : false,
        blending      : THREE.AdditiveBlending
    });

    const rings = new THREE.Points(geo, shaderMat);
    saturnTiltGroup.add(rings);

    //  【修改后】星环分批加载 + 分段增长 + 降速
    let ringIndex = 0;
    let ringFrame = 0;
    const ringStartTime = Date.now();

    function addRingParticles() {
        ringFrame++;
        const elapsed = (Date.now() - ringStartTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const batchSize = Math.min(500, 200 * speedFactor + ringFrame * 20 * speedFactor);
        const endIndex = Math.min(ringIndex + batchSize, positions.length / 3);

        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(0, endIndex * 3), 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors.slice(0, endIndex * 3), 3));
        
        ringIndex = endIndex;

        // 固定配置
        const startSample = 1731.0;
        const endSample = 3666.3;

        // 阶段1：粒子数0-172600 → 固定显示2020.12.17
        if (ringIndex <= INIT_TARGET_PARTICLE) {
            // 更新采样值和粒子数
            document.getElementById('saturn-sample').innerText = startSample.toFixed(1);
            document.getElementById('saturn-particle').innerText = ringIndex.toLocaleString();
            
            // 确保时间显示为2020.12.17，且不显示任何动画
            const timeEl = document.getElementById('saturn-time');
            if (timeEl) {
                const currentEl = timeEl.querySelector('.date-current');
                const nextEl = timeEl.querySelector('.date-next');
                
                if (currentEl) {
                    currentEl.textContent = "2020.12.17";
                    currentEl.style.position = 'absolute';
                    currentEl.style.top = '0';
                    currentEl.style.opacity = '1';
                    currentEl.style.transform = 'translateY(0)';
                    currentEl.style.animation = 'none';
                }
                
                if (nextEl) {
                    nextEl.textContent = "2024.06.25";
                    nextEl.style.position = 'absolute';
                    nextEl.style.top = '0';
                    nextEl.style.opacity = '0';
                    nextEl.style.transform = 'translateY(50px)';
                    nextEl.style.animation = 'none';
                }
            }
        } 
        // 阶段2：粒子数172601+ → 启动动画并持续更新数据
        else {
            // 计算当前采样
            const currentSample = Math.min(endSample, parseFloat((ringIndex / PARTICLE_PER_GRAM).toFixed(1)));
            
            // 仅在第一次超过阈值时触发动画
            if (!window._saturn_animation_triggered) {
                window._saturn_animation_triggered = true;
                
                console.log('Triggering Saturn time animation at ringIndex:', ringIndex);
                
                // 确保元素存在后再触发动画
                const timeEl = document.getElementById('saturn-time');
                if (timeEl) {
                    const currentEl = timeEl.querySelector('.date-current');
                    const nextEl = timeEl.querySelector('.date-next');
                    
                    if (currentEl && nextEl) {
                        // 应用动画
                        setTimeout(() => {
                            currentEl.style.animation = 'fadeOutUp 10s ease-in-out forwards';
                            nextEl.style.animation = 'fadeInUp 10s ease-in-out forwards';
                        }, 16); // 延迟一帧确保样式已应用
                    }
                }
            }

            // 持续更新采样和粒子数
            document.getElementById('saturn-sample').innerText = currentSample.toFixed(1);
            document.getElementById('saturn-particle').innerText = ringIndex.toLocaleString();
        }

        if (ringIndex < positions.length / 3) {
            requestAnimationFrame(addRingParticles);
        }
    }
    addRingParticles();
}


// --- C. 泰坦卫星 ---
function createTitan()
{
    // 轨道
    const curve     = new THREE.EllipseCurve(0, 0, titanOrbitRadius, titanOrbitRadius, 0, 2 * Math.PI, false, 0);
    const geometry  = new THREE.BufferGeometry().setFromPoints(curve.getPoints(128));
    const orbitLine = new THREE.Line(geometry, new THREE.LineDashedMaterial({
        color      : 0xe06236,
        opacity    : 0.4,
        transparent: true,
        dashSize   : 0.4,
        gapSize    : 0.3
    }));
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 2;
    titanOrbitGroup.add(orbitLine);

    // 核心
    const coreParticles = 1200;
    const corePos       = [];
    const coreColors    = [];
    const coreGen       = new SimplexNoise('titan-core');
    const colCoreDark = new THREE.Color('#4a2e20');
    const colCoreLite = new THREE.Color('#8c4b28');

    for (let i = 0; i < coreParticles; i++)
    {
        const r     = 0.75;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);

        corePos.push(x, y, z);
        let n = coreGen.noise3D(x * 3, y * 3, z * 3);
        let c = new THREE.Color().copy(colCoreDark).lerp(colCoreLite, (n + 1) / 2);
        coreColors.push(c.r, c.g, c.b);
    }
    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute('position', new THREE.Float32BufferAttribute(corePos, 3));
    coreGeo.setAttribute('color', new THREE.Float32BufferAttribute(coreColors, 3));
    const coreMesh = new THREE.Points(coreGeo, new THREE.PointsMaterial({
        size        : 0.05,
        vertexColors: true,
        transparent : true,
        opacity     : 0.95
    }));
    titanBodyGroup.add(coreMesh);

    // 网格
    const wireGeo   = new THREE.WireframeGeometry(new THREE.SphereGeometry(0.75, 16, 16));
    const wireMat   = new THREE.LineBasicMaterial({
        color      : 0xff8c69,
        transparent: true,
        opacity    : 0.2
    });
    const titanGrid = new THREE.LineSegments(wireGeo, wireMat);
    titanBodyGroup.add(titanGrid);

    // 大气
    const hazeParticles = 2000;
    const hazePos       = [];
    const hazeColors    = [];
    const hazeGen       = new SimplexNoise('titan-haze');
    const colHazeBase = new THREE.Color('#d68528');
    const colHazeTop  = new THREE.Color('#ffaa44');

    for (let i = 0; i < hazeParticles; i++)
    {
        const r     = 0.82;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);

        hazePos.push(x, y, z);
        let n = hazeGen.noise3D(x * 1.5, y * 1.5, z * 1.5);
        let c = new THREE.Color().copy(colHazeBase).lerp(colHazeTop, (n + 1) / 2);
        hazeColors.push(c.r, c.g, c.b);
    }
    const hazeGeo = new THREE.BufferGeometry();
    hazeGeo.setAttribute('position', new THREE.Float32BufferAttribute(hazePos, 3));
    hazeGeo.setAttribute('color', new THREE.Float32BufferAttribute(hazeColors, 3));
    const hazeMesh = new THREE.Points(hazeGeo, new THREE.PointsMaterial({
        size        : 0.045,
        vertexColors: true,
        transparent : true,
        opacity     : 0.5
    }));
    titanAtmoGroup.add(hazeMesh);
}


// --- D. 土星卫星群 ---
function createMoon(name, parentGroup, orbitRadius, speed, inclinationDeg, colorHex, size, isRetrograde = false, isDualColor = false)
{
    const satOrbit      = new THREE.Group();
    satOrbit.rotation.x = inclinationDeg * (Math.PI / 180);
    satOrbit.rotation.y = Math.random() * Math.PI * 2;
    parentGroup.add(satOrbit);

    const geo  = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI).getPoints(64));
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color      : colorHex,
        transparent: true,
        opacity    : 0.15,
        dashSize   : 0.2,
        gapSize    : 0.2
    }));
    line.computeLineDistances();
    line.rotation.x = Math.PI / 2;
    satOrbit.add(line);

    if (isDualColor)
    {
        const iapParticles = 64;
        const iPos         = [];
        const iCol         = [];
        const cDark        = new THREE.Color('#111111');
        const cLite        = new THREE.Color('#eeeeee');

        for (let i = 0; i < iapParticles; i++)
        {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);
            const r     = size * 0.9;
            const x     = r * Math.sin(phi) * Math.cos(theta);
            const y     = r * Math.sin(phi) * Math.sin(theta);
            const z     = r * Math.cos(phi);
            iPos.push(x, y, z);
            let c = (x > 0) ? cLite : cDark;
            iCol.push(c.r, c.g, c.b);
        }
        const iGeo = new THREE.BufferGeometry();
        iGeo.setAttribute('position', new THREE.Float32BufferAttribute(iPos, 3));
        iGeo.setAttribute('color', new THREE.Float32BufferAttribute(iCol, 3));

        const satMat = new THREE.PointsMaterial({
            size        : size * 0.8,
            vertexColors: true
        });
        const mesh   = new THREE.Points(iGeo, satMat);
        mesh.position.set(orbitRadius, 0, 0);
        satOrbit.add(mesh);

        moons.push({
            orbitGroup   : satOrbit,
            mesh         : mesh,
            speed        : speed,
            radius       : orbitRadius,
            angle        : 0,
            isRetrograde : isRetrograde,
            isChaotic    : false,
            isTidalLocked: true
        });
    }
    else
    {
        const satMat = new THREE.PointsMaterial({
            color: colorHex,
            size : size * 0.8
        });
        const mesh   = new THREE.Points(new THREE.SphereGeometry(size, 4, 4), satMat);
        mesh.position.set(orbitRadius, 0, 0);
        satOrbit.add(mesh);

        moons.push({
            orbitGroup   : satOrbit,
            mesh         : mesh,
            speed        : speed,
            radius       : orbitRadius,
            angle        : 0,
            isRetrograde : isRetrograde,
            isChaotic    : name === "Hyperion",
            isTidalLocked: !isRetrograde && name !== "Hyperion"
        });
    }
}

// 封装所有卫星创建
function createAllMoons() {
    createMoon("Mimas", saturnTiltGroup, 12.4, 0.009, 0.0, 0x8090a0, 0.08);
    createMoon("Enceladus", saturnTiltGroup, 13.0, 0.0075, 0.0, 0xaaffff, 0.09);
    createMoon("Tethys", saturnTiltGroup, 13.6, 0.006, 0.0, 0xe6e0c0, 0.10);
    createMoon("Dione", saturnTiltGroup, 14.2, 0.005, 0.0, 0xc0c0e0, 0.10);
    createMoon("Rhea", saturnTiltGroup, 14.8, 0.004, 0.0, 0xb0a090, 0.12);
    createMoon("Hyperion", saturnTiltGroup, 17.6, 0.0025, 0.0, 0xcd853f, 0.09);
    createMoon("Iapetus", saturnTiltGroup, 19.0, 0.0015, 15.47, 0xffffff, 0.13, false, true);
    createMoon("Phoebe", group, 20.5, -0.001, 20.0, 0x2f4f4f, 0.07, true);
}


// ==========================================
//  统一3秒延迟加载（所有元素同步显示）
// ==========================================
setTimeout(() => {
    createGasGiant();
    createProceduralRings();
    createTitan();
    createAllMoons();
}, 3000);


// --- 动画循环 ---
initInteraction(group, INITIAL_ZOOM);
if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.0;
    InteractionState.targetRotationY = 0.0;
}
group.rotation.x = 0.0;
group.rotation.y = 0.0;

let time = 0;
function animate()
{
    requestAnimationFrame(animate);
    time += 0.002;

    // 行星自转
    if(planetSpinGroup) planetSpinGroup.rotation.y += 0.002;
    if(planetAtmoGroup) planetAtmoGroup.rotation.y += 0.0015;
    ringUniforms.uTime.value = time;

    // 泰坦动画
    titanAngle += 0.0005;
    titanBodyGroup.position.x = titanOrbitRadius * Math.cos(titanAngle);
    titanBodyGroup.position.z = titanOrbitRadius * Math.sin(titanAngle);
    titanBodyGroup.rotation.y = titanAngle - Math.PI / 2;
    titanAtmoGroup.rotation.y += 0.001;

    // 卫星动画
    moons.forEach(sat =>
    {
        sat.angle += sat.speed;
        sat.mesh.position.x = sat.radius * Math.cos(sat.angle);
        sat.mesh.position.z = sat.radius * Math.sin(sat.angle);

        if (sat.isChaotic) {
            sat.mesh.rotation.x += 0.03;
            sat.mesh.rotation.y += 0.05;
        } else if (sat.isTidalLocked) {
            sat.mesh.rotation.y = -sat.angle;
        } else {
            sat.mesh.rotation.y += 0.02;
        }
    });

    // 交互&渲染
    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
    updatePlanetTelemetry(planetSpinGroup, tgtLabel, 1);
    renderer.render(scene, camera);
}
animate();