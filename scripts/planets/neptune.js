// ==========================================
// NASA-Punk Project: SOL-VIII (NEPTUNE) - FULL INDUSTRY SCALE OPTIMIZED
// 核心数据：全产业链规模 0.60万亿 → 2.83万亿 → 30万 → 141.5万粒子 (1:200000比例)
// ==========================================

// 核心同步配置（1:200000 万亿→粒子数）
const MAX_SCALE = 2.83;  // 2025年全产业链规模（万亿）
const MAX_NEPTUNE_PARTICLE = 1415000;  // 最大粒子数 = 2.83 * 500000
const PARTICLE_PER_TRILLION = 500000; // 每万亿对应50万粒子

// 【新增】海王星同款初始锁定阈值
const INIT_SCALE_LOCK = 0.60;  // 2015年全产业链规模
const INIT_PARTICLE_LOCK = 300000;  // 对应粒子数 = 0.60 * 500000

// 时间分段配置（与全产业链规模严格绑定 2015-2025）
const segments = [
  { scale: 0.60, date: "2015" },
  { scale: 0.72, date: "2016" },
  { scale: 0.85, date: "2017" },
  { scale: 1.00, date: "2018" },
  { scale: 1.20, date: "2019" },
  { scale: 1.50, date: "2020" },
  { scale: 1.70, date: "2021" },
  { scale: 1.90, date: "2022" },
  { scale: 2.10, date: "2023" },
  { scale: 2.50, date: "2024" },
  { scale: 2.83, date: "2025" }
];

// 全局共享产业规模 ✅ 修复：初始值改为0.60（2015年）
window.currentScale = 0.60;

// 时间计算工具函数（与太阳完全一致）
function dateToTimestamp(str) {
  if (str.length === 4) return new Date(`${str}-01-01`).getTime();
  const [y, m, d] = str.split('.');
  return new Date(y, m - 1, d).getTime();
}
function getCurrentDate(scale) {
  for (let i = 0; i < segments.length - 1; i++) {
    const s = segments[i];
    const e = segments[i + 1];
    if (scale >= s.scale && scale <= e.scale) {
      const rate = (scale - s.scale)/(e.scale - s.scale);
      const sTime = dateToTimestamp(s.date);
      const eTime = dateToTimestamp(e.date);
      const curTime = sTime + (eTime - sTime) * rate;
      const date = new Date(curTime);
      
      if (s.date.length === 4) {
        return date.getFullYear().toString();
      } else {
        const y = date.getFullYear();
        const m = String(date.getMonth()+1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}.${m}.${d}`;
      }
    }
  }
  return "2025";
}


// --- PART 1: 基础观测背景 ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100
});
sharedTopoBackground.resize();


// ==========================================
// PART 2: Three.js 场景初始化
// ==========================================
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

let currentZoom    = 30;
const INITIAL_ZOOM = 30;
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

// 1. 倾角容器
const planetTiltGroup      = new THREE.Group();
planetTiltGroup.rotation.z = 28.32 * (Math.PI / 180);
group.add(planetTiltGroup);

// 2. 自转容器
const planetSpinGroup = new THREE.Group();
planetTiltGroup.add(planetSpinGroup);

// 3. 卫星系统容器
const moonSystemGroup = new THREE.Group();
group.add(moonSystemGroup);


// --- PART 3: 程序化海王星 (Atmosphere) - 渐进式加载 ---
function createNeptune()
{
    const particleCount = MAX_NEPTUNE_PARTICLE; // 使用新的粒子数量
    const originalPositions = new Float32Array(particleCount * 3);
    const baseColors = new Float32Array(particleCount * 3);
    const noiseGen      = new SimplexNoise('neptune-wind-shear');

    const colDeep   = new THREE.Color('#1a237e');
    const colMid    = new THREE.Color('#2962ff');
    const colBright = new THREE.Color('#448aff');
    const colStorm  = new THREE.Color('#0d1238');

    for (let i = 0; i < particleCount; i++)
    {
        const r     = 5.0 + Math.random() * 0.3;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        let nBand = noiseGen.noise3D(x * 0.5, y * 3.0, z * 0.5);

        let isStorm = false;
        if (y < -1.5 && y > -2.5 && x > 0 && Math.abs(z) < 2.0)
        {
            if (Math.random() > 0.6)
            {
                isStorm = true;
            }
        }

        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;

        let c = new THREE.Color();

        if (isStorm)
        {
            c.copy(colStorm);
        }
        else
        {
            const val = (nBand + 1) / 2;
            if (val < 0.4)
            {
                c.copy(colDeep).lerp(colMid, val / 0.4);
            }
            else
            {
                c.copy(colMid).lerp(colBright, (val - 0.4) / 0.6);
            }
        }

        const depthFactor = (r - 5.0) / 0.3;
        c.multiplyScalar(0.5 + depthFactor * 0.5);

        baseColors[i * 3] = c.r;
        baseColors[i * 3 + 1] = c.g;
        baseColors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3);
    const colorAttr = new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3);

    geo.setAttribute('position', positionAttr);
    geo.setAttribute('color', colorAttr);
    geo.setDrawRange(0, 0);
    geo.userData = {
        originalPositions: originalPositions,
        baseColors: baseColors,
        loadingComplete: false,
        particleCount: particleCount
    };

    const mat = new THREE.PointsMaterial({
        size           : 0.055,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.85,
        sizeAttenuation: true
    });
    const neptunePoints = new THREE.Points(geo, mat);
    planetSpinGroup.add(neptunePoints);

    // 渐进式加载 + 核心数据同步
    let neptuneIndex = 0;
    let neptuneFrame = 0;
    let startTime = Date.now();
    const neptuneBatchStart = 300;
    const neptuneBatchSlope = 50;
    const neptuneBatchMax = 4000;

    function addNeptuneParticles()
    {
        neptuneFrame += 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = neptuneBatchStart * speedFactor;
        const adjustedBatchSlope = neptuneBatchSlope * speedFactor;
        const adjustedBatchMax = neptuneBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + neptuneFrame * adjustedBatchSlope);
        const endIndex = Math.min(neptuneIndex + batchSize, particleCount);

        positionAttr.copyArray(originalPositions.subarray(0, endIndex * 3));
        colorAttr.copyArray(baseColors.subarray(0, endIndex * 3));
        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        geo.setDrawRange(0, endIndex);

        neptuneIndex = endIndex;

        // ======================
        // 【核心修改】严格复刻天王星逻辑，完全不删原有代码
        // 阶段1：粒子0~300000 → 锁死0.60万亿 + 2015年
        // 阶段2：粒子>300000 → 正常同步增长
        // ======================
        let currentIndustryScale;
        if (neptuneIndex <= INIT_PARTICLE_LOCK) {
            // 锁定初始值
            currentIndustryScale = INIT_SCALE_LOCK;
            window.currentScale = currentIndustryScale;
            document.getElementById('neptune-particle').innerText = neptuneIndex.toLocaleString();
            document.getElementById('neptune-scale').innerText = currentIndustryScale.toFixed(2);
            document.getElementById('neptune-time').innerText = "2015";
        } else {
            // 解锁，正常计算
            currentIndustryScale = Math.min(MAX_SCALE, parseFloat((neptuneIndex / PARTICLE_PER_TRILLION).toFixed(2)));
            window.currentScale = currentIndustryScale;
            document.getElementById('neptune-particle').innerText = neptuneIndex.toLocaleString();
            document.getElementById('neptune-scale').innerText = currentIndustryScale.toFixed(2);
            document.getElementById('neptune-time').innerText = getCurrentDate(currentIndustryScale);
        }

        if (neptuneIndex < particleCount)
        {
            requestAnimationFrame(addNeptuneParticles);
        } else {
            geo.userData.loadingComplete = true;
            console.log("Neptune particles loaded successfully.");
        }
    }

    addNeptuneParticles();

    // 透明网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.32, 32, 16));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#448aff',
        transparent: true,
        opacity    : 0.06
    });
    planetTiltGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}


// --- PART 4: 五道环系统 (The 5 Distinct Rings) - 增强密度 - 渐进式加载 ---
let ringLayers = [];

function createNeptuneRings()
{
    const ringGroup = new THREE.Group();
    planetTiltGroup.add(ringGroup);

    // 环的参数配置 - 增加粒子数量
    const ringsConfig = [
        {name: 'Galle', radius: 7.1, width: 0.6, particles: 8000, opacity: 0.25, color: 0x5566aa}, // 增加到8000
        {name: 'LeVerrier', radius: 7.8, width: 0.1, particles: 4000, opacity: 0.4, color: 0x6677cc}, // 增加到4000
        {name: 'Lassell', radius: 8.2, width: 0.3, particles: 3000, opacity: 0.2, color: 0x445599}, // 增加到3000
        {name: 'Arago', radius: 8.6, width: 0.1, particles: 3000, opacity: 0.4, color: 0x6677cc}, // 增加到3000
        {name: 'Adams', radius: 9.4, width: 0.4, particles: 25000, opacity: 0.95, color: 0x88aaff, isMain: true} // 增加到25000
    ];

    const ringNoise = new SimplexNoise('ring-arcs-separated');

    ringsConfig.forEach(config =>
    {
        // 收集所有粒子数据
        const allPositions = [];
        const allColors = [];

        for (let i = 0; i < config.particles; i++)
        {
            const theta = Math.random() * Math.PI * 2;
            const r     = config.radius + (Math.random() - 0.5) * config.width;

            let alpha = config.opacity;

            if (config.isMain)
            {
                const arcRaw         = ringNoise.noise2D(Math.cos(theta) * 2.0, Math.sin(theta) * 2.0);
                let presence         = (arcRaw + 0.4) / 1.4;
                presence             = Math.max(0, presence);
                const smoothPresence = Math.pow(presence, 3);

                const survivalChance = 0.02 + 0.98 * smoothPresence;
                if (Math.random() > survivalChance)
                {
                    continue;
                }
                alpha = 0.1 + 0.85 * smoothPresence;
            }

            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);

            allPositions.push(x, 0, z);

            const c = new THREE.Color(config.color);
            c.multiplyScalar(0.7 + Math.random() * 0.5);
            allColors.push(c.r, c.g, c.b);
        }

        // 创建几何体但不设置属性，等待渐进式加载
        const geo = new THREE.BufferGeometry();
        const mat = new THREE.PointsMaterial({
            size           : 0.065, // 稍微增大星环粒子尺寸
            vertexColors   : true,
            transparent    : true,
            opacity        : config.isMain ? 0.95 : 0.5, // 提高透明度
            sizeAttenuation: true,
            blending       : THREE.AdditiveBlending
        });

        const pointsMesh = new THREE.Points(geo, mat);
        ringGroup.add(pointsMesh);

        // 计算开普勒角速度: omega ~ r^(-1.5)
        const keplerRatio   = Math.pow(7.1 / config.radius, 1.5);
        const rotationSpeed = 0.008 * keplerRatio;

        // 渐进式加载环粒子
        let ringIndex = 0;
        let ringFrame = 0;
        const ringStartTime = Date.now();
        const totalRingParticles = allPositions.length / 3;

        function addRingParticles() {
            ringFrame++;
            const elapsed = (Date.now() - ringStartTime) / 1000;
            const speedFactor = elapsed < 3 ? 0.1 : 1.0;
            const batchSize = Math.min(800, 300 * speedFactor + ringFrame * 30 * speedFactor); // 增加批次大小
            const endIndex = Math.min(ringIndex + batchSize, totalRingParticles);

            // 设置当前批次的粒子
            geo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions.slice(0, endIndex * 3), 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(allColors.slice(0, endIndex * 3), 3));

            ringIndex = endIndex;

            if (ringIndex < totalRingParticles) {
                requestAnimationFrame(addRingParticles);
            }
        }

        addRingParticles();

        ringLayers.push({
            mesh : pointsMesh,
            speed: rotationSpeed
        });
    });
}


// --- PART 5: 卫星系统 - 渐进式加载 ---
let tritonData     = null;
let minorMoonsData = [];

function createTriton()
{
    const tOrbitRadius = 12.5;
    const tOrbitGroup  = new THREE.Group();

    // 倾角设置：Triton 具有高倾角和逆行轨道
    tOrbitGroup.rotation.z = 20 * (Math.PI / 180);
    tOrbitGroup.rotation.x = 157 * (Math.PI / 180);

    moonSystemGroup.add(tOrbitGroup);

    // [NEW] 海卫一程序化纹理噪声生成器
    const tritonNoise = new SimplexNoise('triton-cryovolcanism');

    // 1. 轨道线
    const orbitGeo  = new THREE.BufferGeometry().setFromPoints(
        new THREE.EllipseCurve(0, 0, tOrbitRadius, tOrbitRadius, 0, 2 * Math.PI).getPoints(128)
    );
    const orbitLine = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({
        color: 0x88aaff, transparent: true, opacity: 0.25, dashSize: 0.5, gapSize: 0.5
    }));
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 2;
    tOrbitGroup.add(orbitLine);

    // 2. Triton 本体
    const tBody = new THREE.Group();
    tOrbitGroup.add(tBody);

    const tParticles = 800;
    const tPos       = [];
    const tCol       = [];
    // 使用代表冰和氮冰的颜色
    const colTriton  = new THREE.Color('#d0e0ff');
    // 使用代表喷流和黑暗条纹的颜色
    const colDark    = new THREE.Color('#90a0bb');

    for (let i = 0; i < tParticles; i++)
    {
        const r     = 0.35;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        tPos.push(x, y, z);

        let c = colTriton.clone();

        // [MODIFIED] 使用 Simplex Noise 创建表面细节
        // 缩放系数 6.0 用于创建哈密瓜皮状的中等大小地貌
        const surfaceNoise = tritonNoise.noise3D(x * 6.0, y * 6.0, z * 6.0);

        let brightness = 0.8 + Math.random() * 0.2; // 基础随机亮度

        // 将噪声从 [-1, 1] 映射到 [0.6, 1.2] 的亮度调节因子
        let noiseFactor = THREE.MathUtils.clamp((surfaceNoise + 1) * 0.5 * 1.5, 0.6, 1.2);

        // 乘以基础亮度和噪声因子
        c.multiplyScalar(brightness * noiseFactor);

        // 进一步基于噪声值进行颜色混合，模拟深色条纹/喷流区
        if (surfaceNoise < -0.3)
        {
            // 噪声低谷区（代表黑暗或阴影）更倾向于深色
            c.lerp(colDark, 0.4);
        }

        tCol.push(c.r, c.g, c.b);
    }

    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
    tGeo.setAttribute('color', new THREE.Float32BufferAttribute(tCol, 3));

    const tMat = new THREE.PointsMaterial({
        size        : 0.045,
        vertexColors: true,
        transparent : true,
        opacity     : 1.0,
        blending    : THREE.AdditiveBlending // 增加科幻感
    });
    tBody.add(new THREE.Points(tGeo, tMat));

    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(0.36, 12, 12));
    const wireMat = new THREE.LineBasicMaterial({color: 0x88aaff, transparent: true, opacity: 0.1});
    tBody.add(new THREE.LineSegments(wireGeo, wireMat));

    tritonData = {
        mesh  : tBody,
        angle : 0,
        speed : -0.004,
        radius: tOrbitRadius
    };
}

// 存储所有小卫星配置
const minorMoonsConfigs = [
    {name: "Galatea", radius: 5.5, speed: 0.015, size: 0.05, color: 0x6677aa},
    {name: "Larissa", radius: 5.75, speed: 0.0125, size: 0.06, color: 0x556699},
    {name: "Proteus", radius: 6.0, speed: 0.01, size: 0.08, color: 0x6677aa},
    {name: "Nereid", radius: 24.0, speed: 0.001, size: 0.07, color: 0x8899cc, eccentric: true}
];

function createAndAddMinorMoonsGradually() {
    let moonIndex = 0;
    const moonInterval = setInterval(() => {
        if (moonIndex < minorMoonsConfigs.length) {
            const config = minorMoonsConfigs[moonIndex];
            
            const orbitGroup      = new THREE.Group();
            orbitGroup.rotation.x = config.eccentric ? 0.3 : Math.random() * 0.05;
            orbitGroup.rotation.z = config.eccentric ? 0.2 : Math.random() * 0.05;
            planetTiltGroup.add(orbitGroup);

            const orbitPoints = config.eccentric ? 128 : 64;
            const xRad        = config.radius;
            const yRad        = config.eccentric ? config.radius * 0.7 : config.radius;

            const orbitGeo  = new THREE.BufferGeometry().setFromPoints(
                new THREE.EllipseCurve(0, 0, xRad, yRad, 0, 2 * Math.PI).getPoints(orbitPoints)
            );
            const orbitLine = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({
                color: 0x445588, transparent: true, opacity: 0.1, dashSize: 0.2, gapSize: 0.2
            }));
            orbitLine.computeLineDistances();
            orbitLine.rotation.x = Math.PI / 2;
            orbitGroup.add(orbitLine);

            const mesh = new THREE.Mesh(
                new THREE.IcosahedronGeometry(config.size, 0),
                new THREE.MeshBasicMaterial({color: config.color, wireframe: true, transparent: true, opacity: 0.6})
            );
            orbitGroup.add(mesh);

            minorMoonsData.push({
                mesh : mesh,
                angle: Math.random() * Math.PI * 2,
                speed: config.speed,
                xRad : xRad,
                yRad : yRad
            });
            
            moonIndex++;
        } else {
            clearInterval(moonInterval);
            console.log("All Neptune moons added successfully.");
        }
    }, 150); // 每150ms添加一个小卫星
}


// ==========================================
// PART 6: 交互与动画循环 - 统一延迟初始化
// ==========================================

initInteraction(group, INITIAL_ZOOM);

if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.3;
    InteractionState.targetRotationY = 0.0;
}
group.rotation.x = 0.3;
group.rotation.y = 0.0;

// 【修改】延迟初始化所有元素
setTimeout(() => {
    createNeptune();
    createNeptuneRings();
    createTriton();
    createAndAddMinorMoonsGradually(); // 渐进式添加小卫星
}, 3000);

function animate()
{
    requestAnimationFrame(animate);

    planetSpinGroup.rotation.y += 0.003;

    // 光环自转动画
    ringLayers.forEach(layer =>
    {
        layer.mesh.rotation.y += layer.speed;
    });

    if (tritonData)
    {
        tritonData.angle += tritonData.speed;
        tritonData.mesh.position.x = tritonData.radius * Math.cos(tritonData.angle);
        tritonData.mesh.position.z = tritonData.radius * Math.sin(tritonData.angle);
        tritonData.mesh.rotation.y += 0.01;
    }

    minorMoonsData.forEach(moon =>
    {
        moon.angle += moon.speed;
        moon.mesh.position.x = moon.xRad * Math.cos(moon.angle);
        moon.mesh.position.z = moon.yRad * Math.sin(moon.angle);
        moon.mesh.rotation.x += 0.02;
        moon.mesh.rotation.y += 0.02;
    });

    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
    updatePlanetTelemetry(planetSpinGroup, tgtLabel, 1);

    renderer.render(scene, camera);
}

animate();