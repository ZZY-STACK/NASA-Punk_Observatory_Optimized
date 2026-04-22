// ==========================================
// NASA-Punk Project: URANUS
// ==========================================

//  核心同步配置（1:1000  航天器数→粒子数）
const MAX_SATELLITE = 1150;
const MAX_URANUS_PARTICLE = 1150000;
const PARTICLE_PER_SATELLITE = 1000;

// 【新增】土星同款初始锁定阈值（完全不删原有代码）
const INIT_SATELLITE_LOCK = 140;
const INIT_PARTICLE_LOCK = 140000;

// 时间分段配置（与在轨航天器数严格绑定 2015-2025）
const segments = [
  { count: 140,  date: "2015" },
  { count: 170,  date: "2016" },
  { count: 200,  date: "2017" },
  { count: 280,  date: "2018" },
  { count: 340,  date: "2019" },
  { count: 400,  date: "2020" },
  { count: 500,  date: "2021" },
  { count: 600,  date: "2022" },
  { count: 800,  date: "2023" },
  { count: 1094, date: "2024" },
  { count: 1150, date: "2025" }
];

// 全局共享在轨航天器数量 ✅ 修复：初始值改为140（2015年）
window.currentCount = 140;

// 时间计算工具函数（与太阳完全一致）
function dateToTimestamp(str) {
  if (str.length === 4) return new Date(`${str}-01-01`).getTime();
  const [y, m, d] = str.split('.');
  return new Date(y, m - 1, d).getTime();
}
function getCurrentDate(count) {
  for (let i = 0; i < segments.length - 1; i++) {
    const s = segments[i];
    const e = segments[i + 1];
    if (count >= s.count && count <= e.count) {
      const rate = (count - s.count)/(e.count - s.count);
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
    canvasId   : "topo-canvas",
    noiseOffset: 800
});
sharedTopoBackground.resize();


// --- PART 2: Three.js 场景 ---
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

let currentZoom    = 38;
const INITIAL_ZOOM = 38;

camera.position.z = currentZoom;

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

const uranusTiltGroup      = new THREE.Group();
uranusTiltGroup.rotation.z = 97.77 * (Math.PI / 180);
group.add(uranusTiltGroup);

const uranusSpinGroup = new THREE.Group();
uranusTiltGroup.add(uranusSpinGroup);

const ringGroup = new THREE.Group();
uranusTiltGroup.add(ringGroup);

const moonGroup = new THREE.Group();
uranusTiltGroup.add(moonGroup);


// --- PART 3: 天王星主体（柔和均匀版 + 数据联动 + 渐进式加载）---
let uranusGeometry;
let uranusParticles;
const uranusNoiseGen = new SimplexNoise('uranus-smooth');

function createUranus()
{
    // 固定115万粒子（对应1150颗航天器）
    const particleCount = MAX_URANUS_PARTICLE;
    const originalPositions = new Float32Array(particleCount * 3);
    const baseColors = new Float32Array(particleCount * 3);

    // 天王星真实颜色：淡蓝绿色，比之前更暗淡
    const uranusBase    = new THREE.Color('#559ec2');  // 更暗的蓝绿色
    const uranusSoft    = new THREE.Color('#4a8fb0');  // 对应的较暗色调

    for (let i = 0; i < particleCount; i++)
    {
        const r     = 5.0;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;

        // 极柔和过渡，几乎看不出两极区别
        let lat = Math.abs(y / r);
        let c   = new THREE.Color();
        c.copy(uranusBase);
        c.lerp(uranusSoft, lat * 0.15);

        // 极淡的大气噪点，不突兀
        let n = uranusNoiseGen.noise3D(x * 0.7, y * 0.7, z * 0.7);
        c.multiplyScalar(0.92 + n * 0.04); // 降低噪点幅度

        baseColors[i * 3] = c.r;
        baseColors[i * 3 + 1] = c.g;
        baseColors[i * 3 + 2] = c.b;
    }

    uranusGeometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3);
    const colorAttr = new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3);

    uranusGeometry.setAttribute('position', positionAttr);
    uranusGeometry.setAttribute('color', colorAttr);
    uranusGeometry.setDrawRange(0, 0);
    uranusGeometry.userData = {
        originalPositions: originalPositions,
        baseColors: baseColors,
        loadingComplete: false,
        particleCount: particleCount
    };

    const uranusMat = new THREE.PointsMaterial({
        size           : 0.06,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.88, // 稍微降低透明度
        sizeAttenuation: true
    });

    uranusParticles = new THREE.Points(uranusGeometry, uranusMat);
    uranusSpinGroup.add(uranusParticles);

    // 渐进式加载 + 核心数据同步
    let uranusIndex = 0;
    let uranusFrame = 0;
    let startTime = Date.now();
    const uranusBatchStart = 300;
    const uranusBatchSlope = 50;
    const uranusBatchMax = 4000;

    function addUranusParticles()
    {
        uranusFrame += 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = uranusBatchStart * speedFactor;
        const adjustedBatchSlope = uranusBatchSlope * speedFactor;
        const adjustedBatchMax = uranusBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + uranusFrame * adjustedBatchSlope);
        const endIndex = Math.min(uranusIndex + batchSize, particleCount);

        positionAttr.copyArray(originalPositions.subarray(0, endIndex * 3));
        colorAttr.copyArray(baseColors.subarray(0, endIndex * 3));
        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        uranusGeometry.setDrawRange(0, endIndex);

        uranusIndex = endIndex;

        // ======================
        // 【核心修改】严格复刻土星逻辑，完全不删原有代码
        // 阶段1：粒子0~140000 → 锁死140颗 + 2015年
        // 阶段2：粒子>140000 → 正常同步增长
        // ======================
        let currentSatCount;
        if (uranusIndex <= INIT_PARTICLE_LOCK) {
            // 锁定初始值
            currentSatCount = INIT_SATELLITE_LOCK;
            window.currentCount = currentSatCount;
            document.getElementById('particle').innerText = uranusIndex.toLocaleString();
            document.getElementById('satellite').innerText = currentSatCount;
            document.getElementById('time').innerText = "2015";
        } else {
            // 解锁，正常计算
            currentSatCount = Math.min(MAX_SATELLITE, Math.round(uranusIndex / PARTICLE_PER_SATELLITE));
            window.currentCount = currentSatCount;
            document.getElementById('particle').innerText = uranusIndex.toLocaleString();
            document.getElementById('satellite').innerText = currentSatCount;
            document.getElementById('time').innerText = getCurrentDate(currentSatCount);
        }

        if (uranusIndex < particleCount)
        {
            requestAnimationFrame(addUranusParticles);
        } else {
            uranusGeometry.userData.loadingComplete = true;
            console.log("Uranus particles loaded successfully.");
        }
    }

    addUranusParticles();

    // 高层薄雾 - 调整为更符合天王星大气的颜色
    const atmosGeo = new THREE.BufferGeometry();
    const atmosPos = [];
    const atmosCol = [];
    for (let i = 0; i < 300000; i++) {
        const r     = 5.22;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        atmosPos.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
        // 使用更柔和的天王星色调
        atmosCol.push(0.35, 0.62, 0.75); // 调整为更真实的颜色
    }

    const atmos = new THREE.Points(atmosGeo, new THREE.PointsMaterial({
        size           : 0.07,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.12, // 降低透明度
        blending       : THREE.AdditiveBlending,
        depthWrite     : false,
        sizeAttenuation: true
    }));
    uranusSpinGroup.add(atmos);

    // 薄雾加载
    let uranusAtmosIndex = 0;
    let uranusAtmosFrame = 0;
    let atmosStartTime = Date.now();
    const uranusAtmosBatchStart = 300;
    const uranusAtmosBatchSlope = 50;
    const uranusAtmosBatchMax = 3500;

    function addUranusAtmosParticles()
    {
        uranusAtmosFrame += 1;
        const elapsed = (Date.now() - atmosStartTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = uranusAtmosBatchStart * speedFactor;
        const adjustedBatchSlope = uranusAtmosBatchSlope * speedFactor;
        const adjustedBatchMax = uranusAtmosBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + uranusAtmosFrame * adjustedBatchSlope);
        const endIndex = Math.min(uranusAtmosIndex + batchSize, atmosPos.length / 3);
        const posArray = atmosPos.slice(0, endIndex * 3);
        const colArray = atmosCol.slice(0, endIndex * 3);

        atmosGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
        atmosGeo.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

        uranusAtmosIndex = endIndex;
        if (uranusAtmosIndex < atmosPos.length / 3) {
            requestAnimationFrame(addUranusAtmosParticles);
        }
    }
    addUranusAtmosParticles();

    // 极淡网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.1, 24, 24));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#4a8fb0', // 匹配主体颜色
        transparent: true,
        opacity    : 0.04
    });
    uranusSpinGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}


// --- PART 5: 星环系统 ---
function createProceduralRings()
{
    const ringDefs = [
        {
            r      : 6.9,
            width  : 0.8,
            color  : '#1a1a1a',
            opacity: 0.12,
            density: 10000,
            spread : 0.08
        },
        {
            r      : 9.0,
            width  : 0.2,
            color  : '#2a4f50',
            opacity: 0.10,
            density: 5000,
            spread : 0.04
        },
        {
            r      : 9.7,
            width  : 0.3,
            color  : '#40e0d0',
            opacity: 0.5,
            density: 12000,
            spread : 0.02
        },
        {
            r      : 10.3,
            width  : 0.1,
            color  : '#3a5f60',
            opacity: 0.3,
            density: 4000,
            spread : 0.03
        },
        {
            r      : 11.4,
            width  : 0.8,
            color  : '#2f4f4f',
            opacity: 0.15,
            density: 8000,
            spread : 0.06
        }
    ];

    // 收集所有粒子数据
    const allPositions = [];
    const allColors = [];

    ringDefs.forEach(def =>
    {
        const pColor = new THREE.Color(def.color);

        for (let i = 0; i < def.density; i++)
        {
            const r     = def.r + (Math.random() - 0.5) * def.width;
            const angle = Math.random() * Math.PI * 2;
            const y     = (Math.random() - 0.5) * def.spread;

            const x = r * Math.cos(angle);
            const z = r * Math.sin(angle);

            allPositions.push(x, y, z);

            let c = pColor.clone();
            c.multiplyScalar(0.7 + Math.random() * 0.6);
            c.multiplyScalar(0.9); // 提高亮度

            allColors.push(c.r, c.g, c.b);
        }
    });

    // 创建几何体但不设置属性，等待渐进式加载
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.PointsMaterial({
        size           : 0.07, // 增大粒子尺寸
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.7, // 提高透明度
        sizeAttenuation: true,
        blending       : THREE.AdditiveBlending,
        depthWrite     : false
    });

    const rings = new THREE.Points(geo, mat);
    ringGroup.add(rings);

    // 渐进式加载星环粒子
    let ringIndex = 0;
    let ringFrame = 0;
    const ringStartTime = Date.now();
    const totalRingParticles = allPositions.length / 3;

    function addRingParticles() {
        ringFrame++;
        const elapsed = (Date.now() - ringStartTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const batchSize = Math.min(800, 300 * speedFactor + ringFrame * 30 * speedFactor); // 控制批次大小
        const endIndex = Math.min(ringIndex + batchSize, totalRingParticles);

        // 设置当前批次的粒子
        geo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions.slice(0, endIndex * 3), 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(allColors.slice(0, endIndex * 3), 3));

        ringIndex = endIndex;

        // 更新全局计数（如果需要的话）
        if (window.currentCount !== undefined) {
            // 根据当前粒子数计算对应的卫星数
            let currentSatCount;
            if (endIndex <= INIT_PARTICLE_LOCK) {
                currentSatCount = INIT_SATELLITE_LOCK;
            } else {
                currentSatCount = Math.min(MAX_SATELLITE, Math.round(endIndex / PARTICLE_PER_SATELLITE));
            }
            
            // 更新UI元素
            const particleEl = document.getElementById('particle');
            const satelliteEl = document.getElementById('satellite');
            const timeEl = document.getElementById('time');
            
            if (particleEl) {
                particleEl.innerText = endIndex.toLocaleString();
            }
            if (satelliteEl) {
                satelliteEl.innerText = currentSatCount;
            }
            if (timeEl) {
                timeEl.innerText = getCurrentDate(currentSatCount);
            }
            
            // 更新全局变量
            window.currentCount = currentSatCount;
        }

        if (ringIndex < totalRingParticles) {
            requestAnimationFrame(addRingParticles);
        } else {
            console.log("Uranus rings loaded successfully.");
        }
    }

    addRingParticles();
}


// --- PART 6: 卫星系统（渐进式生成） ---
const moons = [];

function createMoon(config)
{
    const {
              name,
              radius,
              speed,
              size,
              color,
              type,
              detail,
              inclination  = 0,
              isRetrograde = false
          } = config;

    const satOrbit = new THREE.Group();
    if (inclination !== 0)
    {
        satOrbit.rotation.x = (Math.random() - 0.5) * inclination;
        satOrbit.rotation.z = (Math.random() - 0.5) * inclination;
    }
    else
    {
        satOrbit.rotation.x = (Math.random() - 0.5) * 0.04;
    }
    satOrbit.rotation.y = Math.random() * Math.PI * 2;
    // 不立即添加到场景，稍后渐进式添加
    // moonGroup.add(satOrbit);

    const curve     = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI);
    const points    = curve.getPoints(type === 'Major' ? 128 : 64);
    const orbitGeo  = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat  = new THREE.LineDashedMaterial({
        color      : color,
        transparent: true,
        opacity    : type === 'Major' ? 0.35 : 0.08,
        dashSize   : type === 'Major' ? 0.3 : 0.5,
        gapSize    : type === 'Major' ? 0.2 : 0.8
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 2;
    satOrbit.add(orbitLine);

    const moonMeshGroup = new THREE.Group();
    moonMeshGroup.position.set(radius, 0, 0);
    satOrbit.add(moonMeshGroup);

    const baseColor = new THREE.Color(color);

    if (type === 'Major')
    {
        const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(size, 8, 8));
        const wireMat = new THREE.LineBasicMaterial({
            color      : color,
            transparent: true,
            opacity    : 0.6
        });
        moonMeshGroup.add(new THREE.LineSegments(wireGeo, wireMat));

        const pCount    = 300;
        const pPos      = [];
        const pCol      = [];
        const mNoise    = new SimplexNoise(name);
        const darkColor = baseColor.clone().multiplyScalar(0.3);

        for (let i = 0; i < pCount; i++)
        {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);
            const r     = size * 0.92;
            const x     = r * Math.sin(phi) * Math.cos(theta);
            const y     = r * Math.sin(phi) * Math.sin(theta);
            const z     = r * Math.cos(phi);
            pPos.push(x, y, z);

            let n = mNoise.noise3D(x * detail, y * detail, z * detail);
            let c = new THREE.Color().copy(baseColor);

            if (name === "Miranda" && Math.abs(n) > 0.3)
            {
                c.multiplyScalar(0.4);
            }
            else if (name === "Ariel" && n > 0.2)
            {
                c.addScalar(0.3);
            }
            else if (name === "Umbriel")
            {
                c.multiplyScalar(0.6);
            }
            if (n < -0.2)
            {
                c.lerp(darkColor, 0.5);
            }

            pCol.push(c.r, c.g, c.b);
        }
        const cloudGeo = new THREE.BufferGeometry();
        cloudGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
        cloudGeo.setAttribute('color', new THREE.Float32BufferAttribute(pCol, 3));
        moonMeshGroup.add(new THREE.Points(cloudGeo, new THREE.PointsMaterial({
            size        : size * 0.45,
            vertexColors: true
        })));

    }
    else
    {
        // ✅ 修复报错：正确写法 new THREE.IcosahedronGeometry
        const geo = new THREE.IcosahedronGeometry(size, 0);
        const mat = new THREE.MeshBasicMaterial({
            color      : color,
            wireframe  : true,
            transparent: true,
            opacity    : 0.5
        });
        moonMeshGroup.add(new THREE.Mesh(geo, mat));
    }

    // 返回未添加到场景的对象，稍后统一添加
    return {
        group    : satOrbit,
        meshGroup: moonMeshGroup,
        speed    : isRetrograde ? -speed : speed,
        radius   : radius,
        angle    : Math.random() * Math.PI * 2,
        type     : type,
        addedToScene: false // 标记是否已添加到场景
    };
}

// 存储所有卫星配置
const moonConfigs = [
    { name: "Bianca", radius: 7.5, speed: 0.018, size: 0.05, color: 0x447777, type: 'Minor' },
    { name: "Cressida", radius: 7.8, speed: 0.017, size: 0.06, color: 0x447777, type: 'Minor' },
    { name: "Puck", radius: 8.0, speed: 0.015, size: 0.08, color: 0x55aaaa, type: 'Minor' },
    { name: "Desdemona", radius: 8.1, speed: 0.016, size: 0.05, color: 0x447777, type: 'Minor' },
    { name: "Juliet", radius: 8.4, speed: 0.015, size: 0.06, color: 0x447777, type: 'Minor' },
    { name: "Portia", radius: 8.7, speed: 0.014, size: 0.08, color: 0x559999, type: 'Minor' },
    { name: "Cordelia", radius: 9.35, speed: 0.013, size: 0.04, color: 0x558888, type: 'Minor' },
    { name: "Ophelia", radius: 10.05, speed: 0.012, size: 0.04, color: 0x558888, type: 'Minor' },
    { name: "Miranda", radius: 10.6, speed: 0.008, size: 0.22, color: 0xcccccc, type: 'Major', detail: 10.0 },
    { name: "Ariel", radius: 12.2, speed: 0.006, size: 0.28, color: 0xe0ffff, type: 'Major', detail: 5.0 },
    { name: "Umbriel", radius: 14.0, speed: 0.005, size: 0.28, color: 0x666666, type: 'Major', detail: 3.0 },
    { name: "Titania", radius: 16.2, speed: 0.004, size: 0.38, color: 0xe0d0b0, type: 'Major', detail: 6.0 },
    { name: "Oberon", radius: 19.0, speed: 0.003, size: 0.35, color: 0xa08080, type: 'Major', detail: 8.0 },
    { name: "Caliban", radius: 23.0, speed: 0.0008, size: 0.06, color: 0xaa5555, type: 'Minor', inclination: 0.8, isRetrograde: true },
    { name: "Sycorax", radius: 27.0, speed: 0.0005, size: 0.08, color: 0xcc6666, type: 'Minor', inclination: 0.9, isRetrograde: true },
    { name: "Setebos", radius: 31.0, speed: 0.0003, size: 0.05, color: 0x888888, type: 'Minor', inclination: 0.6, isRetrograde: true }
];

// 渐进式添加卫星
function createAndAddMoonsGradually() {
    let moonIndex = 0;
    const moonInterval = setInterval(() => {
        if (moonIndex < moonConfigs.length) {
            const moon = createMoon(moonConfigs[moonIndex]);
            moons.push(moon);
            moonGroup.add(moon.group); // 现在添加到场景
            moonIndex++;
        } else {
            clearInterval(moonInterval);
            console.log("All Uranus moons added successfully.");
        }
    }, 100); // 每100ms添加一颗卫星
}


// --- PART 7: 交互与动画 ---

// 初始化交互模块
initInteraction(group, INITIAL_ZOOM);

// [NEW] 初始相机倾角设置
if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.0;
    InteractionState.targetRotationY = 0.2;
}
group.rotation.x = 0.0;
group.rotation.y = 0.2;

// 【修改】延迟初始化所有元素
setTimeout(() => {
    createUranus();
    createProceduralRings();
    createAndAddMoonsGradually(); // 渐进式添加卫星
}, 3000);

function animate()
{
    requestAnimationFrame(animate);

    // 物理更新
    // 逆行自转
    uranusSpinGroup.rotation.y -= 0.004;
    ringGroup.rotation.y += 0.0005;
    moons.forEach(sat =>
    {
        sat.angle += sat.speed;
        sat.meshGroup.position.x = sat.radius * Math.cos(sat.angle);
        sat.meshGroup.position.z = sat.radius * Math.sin(sat.angle);

        if (sat.type === 'Major')
        {
            sat.meshGroup.rotation.y += 0.01;
        }
        else
        {
            sat.meshGroup.rotation.x += 0.02;
            sat.meshGroup.rotation.y += 0.02;
        }
    });

    // 天王星动态效果
    if (uranusParticles && uranusGeometry) {
        const positions = uranusGeometry.attributes.position.array;
        const colors    = uranusGeometry.attributes.color.array;
        const origPos   = uranusGeometry.userData.originalPositions;
        const time = performance.now() * 0.00005;

        const uranusBase    = new THREE.Color('#7aafcc');
        const uranusSoft    = new THREE.Color('#6ca6c7');

        for (let i = 0; i < positions.length / 3; i++) {
            const x = origPos[i * 3];
            const y = origPos[i * 3 + 1];
            const z = origPos[i * 3 + 2];

            let n = uranusNoiseGen.noise3D(x * 0.7, y * 0.7, z * 0.7 + time);
            const pulse = 1.0 + n * 0.02;
            positions[i * 3] = x * pulse;
            positions[i * 3 + 1] = y * pulse;
            positions[i * 3 + 2] = z * pulse;
        }
        uranusGeometry.attributes.position.needsUpdate = true;
    }

    // 2. 更新交互状态
    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);

    // 3. 更新遥测数据
    updatePlanetTelemetry(uranusSpinGroup, tgtLabel, -1);

    renderer.render(scene, camera);
}

animate();