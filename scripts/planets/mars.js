// ==========================================
// NASA-Punk Project: SOL-IV (MARS) - POINT CLOUD MOONS
//  数据联动优化：天问一号科学数据量 → 火星粒子数 (1TB = 1000粒子)
// ==========================================

//  核心同步配置（1:1000  数据量(TB)→粒子数）
const MAX_DATA = 1050; // 最大累计科学数据量(TB)
const MAX_MARS_PARTICLE = 1050000; // 对应105万粒子
const PARTICLE_PER_DATA = 1000;

//  天问一号官方时间分段（严格绑定：时间+飞行里程+数据量）
const marsSegments = [
  { data: 0,    mileage: 0.0055, date: "2020.07.23" },
  { data: 100,  mileage: 4.75,   date: "2021.02.10" },
  { data: 200,  mileage: 4.80,   date: "2021.05.15" },
  { data: 940,  mileage: 8.50,   date: "2022.05.15" },
  { data: 980,  mileage: 10.20,  date: "2023.05.15" },
  { data: 1000, mileage: 11.80,  date: "2024.05.15" },
  { data: 1020, mileage: 12.50,  date: "2025.04.21" },
  { data: 1050, mileage: 13.20,  date: "2026.04.15" }
];

// 全局共享当前数据量
window.currentMarsData = 0;
window.currentMarsMileage = 0.0055;

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

// [CONFIG] 保持拉远的视角以容纳卫星
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
planetTiltGroup.rotation.z = 25.19 * (Math.PI / 180);
group.add(planetTiltGroup);

// 2. 自转容器 - CORE (承载地表)
const marsSurfaceGroup = new THREE.Group();
planetTiltGroup.add(marsSurfaceGroup);

// 3. 自转容器 - ATMOS (承载大气)
const marsAtmosGroup = new THREE.Group();
planetTiltGroup.add(marsAtmosGroup);

// 4. 卫星容器
const marsMoonGroup = new THREE.Group();
planetTiltGroup.add(marsMoonGroup);

// --- 时间计算工具函数（复用太阳架构，适配火星数据）---
function dateToTimestamp(str) {
  const [y, m, d] = str.split('.');
  return new Date(y, m - 1, d).getTime();
}

// 获取当前时间/里程/数据量（联动核心）
function getCurrentMarsData(currentParticle) {
  const currentData = Math.min(MAX_DATA, Math.round(currentParticle / PARTICLE_PER_DATA));
  for (let i = 0; i < marsSegments.length - 1; i++) {
    const s = marsSegments[i];
    const e = marsSegments[i + 1];
    if (currentData >= s.data && currentData <= e.data) {
      const rate = (currentData - s.data) / (e.data - s.data);
      // 插值计算当前里程
      const currentMileage = s.mileage + (e.mileage - s.mileage) * rate;
      // 插值计算当前时间
      const sTime = dateToTimestamp(s.date);
      const eTime = dateToTimestamp(e.date);
      const curTime = sTime + (eTime - sTime) * rate;
      const date = new Date(curTime);
      const y = date.getFullYear();
      const m = String(date.getMonth()+1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return {
        date: `${y}.${m}.${d}`,
        data: currentData,
        mileage: parseFloat(currentMileage.toFixed(4))
      };
    }
  }
  return { date: "2026.04.15", data: MAX_DATA, mileage: 13.20 };
}

// --- PART 3: 程序化火星主体 ---
const coreRadius = 5.0;
let moonsData    = [];
let marsTerrainFeatures = []; // 全局变量存储地形特征
let surfacePoints = null; // 地表粒子对象

// 加载火星地标 GeoJSON
// 加载火星地标 GeoJSON
fetch('./mars_landmarks.geojson')
    .then(response => response.json())
    .then(data => {
        marsTerrainFeatures = data.features.map(feature => {
            const name = feature.properties.name;
            const [lon, lat] = feature.geometry.coordinates;
            
            // 转换为单位球面上的三维坐标
            const latRad = lat * (Math.PI / 180);
            const lonRad = lon * (Math.PI / 180);
            const x = Math.cos(latRad) * Math.cos(lonRad);
            const y = Math.cos(latRad) * Math.sin(lonRad);
            const z = Math.sin(latRad);

            let type = 'crater';
            if (name.includes('Mons') || name.includes('Tholus')) {
                type = 'mountain';
            } else if (name.includes('Planitia') || name.includes('Terra') || name.includes('Planum')) {
                type = 'valley';
            } else if (name.includes('Crater')) {
                type = 'crater';
            } else if (name.includes('Labyrinthus') || name.includes('Chasma') || name.includes('Mensae')) {
                type = 'ridge';
            }
            
            let influenceRadius = 0.1;
            if (name.includes('Olympus')) {
                 influenceRadius = 0.15;
            } else if (name.includes('Valles')) {
                 influenceRadius = 0.2;
            } else if (type === 'mountain') {
                 influenceRadius = 0.08;
            } else if (type === 'crater') {
                 influenceRadius = 0.05;
            } else if (type === 'valley') {
                 influenceRadius = 0.12;
            } else if (type === 'ridge') {
                 influenceRadius = 0.1;
            }

            return {
                center: new THREE.Vector3(x, y, z),
                radius: influenceRadius,
                type: type
            };
        });
        
        console.log('Loaded', marsTerrainFeatures.length, 'Mars landmark features');
        //  统一延迟 3 秒：地表+大气+卫星+数据 全部同步启动
        setTimeout(() => {
          createMarsSurface();
          createMarsAtmosphere();
          createMarsMoons();
        }, 3000);
    })
    .catch(error => {
        console.error('Failed to load mars_landmarks.geojson:', error);
        marsTerrainFeatures = [
            {center: new THREE.Vector3(0.707, 0, 0.707), radius: 0.15, type: 'mountain'},
            {center: new THREE.Vector3(-0.707, 0.5, -0.5), radius: 0.1, type: 'crater'},
            {center: new THREE.Vector3(0, 0.707, -0.707), radius: 0.12, type: 'valley'},
            {center: new THREE.Vector3(0.5, -0.5, 0.707), radius: 0.08, type: 'ridge'}
        ];
        //  降级方案也统一延迟 3 秒
        setTimeout(() => {
          createMarsSurface();
          createMarsAtmosphere();
          createMarsMoons();
        }, 3000);
    });

// --- A. 地表点云 (Surface: Dusty Rock)  数据联动核心 ---
function createMarsSurface()
{
    //  固定粒子数：105万（对应1050TB数据量）
    const surfaceParticles = MAX_MARS_PARTICLE;
    const surfacePos       = [];
    const surfaceColors    = [];
    const noiseGen         = new SimplexNoise('mars-craters-dust');
    const ridgeNoise       = new SimplexNoise('mars-ridge-network');

    const colBase  = new THREE.Color('#985c51');
    const colDark  = new THREE.Color('#6b433c');
    const colLight = new THREE.Color('#e0b28b');
    const colRust  = new THREE.Color('#c75f3f');

    let attempts = 0;
    const maxAttempts = surfaceParticles * 4;
    let placedCount = 0;

    while (placedCount < surfaceParticles && attempts < maxAttempts) {
        attempts++;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        let x = Math.sin(phi) * Math.cos(theta);
        let y = Math.sin(phi) * Math.sin(theta);
        let z = Math.cos(phi);

        const baseX = x * coreRadius;
        const baseY = y * coreRadius;
        const baseZ = z * coreRadius;

        let totalHeightMod = 0;

        let nBase   = noiseGen.noise3D(baseX * 3/coreRadius, baseY * 3/coreRadius, baseZ * 3/coreRadius) * 0.04;
        let nDetail = noiseGen.noise3D(baseX * 12/coreRadius, baseY * 12/coreRadius, baseZ * 12/coreRadius) * 0.018;
        let nFine   = noiseGen.noise3D(baseX * 24/coreRadius, baseY * 24/coreRadius, baseZ * 24/coreRadius) * 0.006;
        let nRidge  = ridgeNoise.noise3D(baseX * 10/coreRadius, baseY * 10/coreRadius, baseZ * 10/coreRadius) * 0.01;
        let nCrater = Math.pow(Math.abs(noiseGen.noise3D(baseX * 6/coreRadius, baseY * 6/coreRadius, baseZ * 6/coreRadius)), 2) * 0.35;

        totalHeightMod = nBase + nDetail + nFine + nRidge * 0.6 - nCrater * 0.16;

        const currentPointVec = new THREE.Vector3(x, y, z).normalize();
        marsTerrainFeatures.forEach(feature => {
            const distOnSphere = currentPointVec.angleTo(feature.center);
            if (distOnSphere < feature.radius) {
                const intensity = 1 - (distOnSphere / feature.radius);
                const effectiveIntensity = Math.pow(intensity, 3);
                switch (feature.type) {
                    case 'crater':
                        totalHeightMod -= effectiveIntensity * 0.22;
                        break;
                    case 'mountain':
                        totalHeightMod += effectiveIntensity * 0.03;
                        break;
                    case 'valley':
                        totalHeightMod -= effectiveIntensity * 0.14;
                        break;
                    case 'ridge':
                         totalHeightMod += effectiveIntensity * 0.01;
                        break;
                }
            }
        });

        const finalRadius = coreRadius + totalHeightMod;
        surfacePos.push(x * finalRadius, y * finalRadius, z * finalRadius);

        let c = new THREE.Color();
        const heightMod = totalHeightMod;

        if (heightMod > 0.02) {
            c.copy(colLight);
        } else if (heightMod < -0.02) {
            c.copy(colDark);
        } else {
            c.copy(colBase);
        }

        if (heightMod > 0.01) {
             const t = Math.max(0, Math.min(1, (heightMod - 0.01) * 15));
             const smoothT = t * t * t * (t * (t * 6 - 15) + 10);
             c.lerpHSL(colRust, smoothT);
        } else if (heightMod < -0.01) {
             const t = Math.max(0, Math.min(1, (-heightMod - 0.01) * 25));
             const smoothT = t * t * t * (t * (t * 6 - 15) + 10);
             c.lerpHSL(colDark, smoothT);
        }

        const localNoiseInfluence = 0.08;
        const localNoiseR = noiseGen.noise3D(baseX * 0.5, baseY * 0.5, baseZ * 0.5) * localNoiseInfluence;
        const localNoiseG = noiseGen.noise3D(baseX * 0.5 + 1000, baseY * 0.5, baseZ * 0.5) * localNoiseInfluence;
        const localNoiseB = noiseGen.noise3D(baseX * 0.5, baseY * 0.5 + 1000, baseZ * 0.5) * localNoiseInfluence;

        c.r = Math.max(0, Math.min(1, c.r + localNoiseR));
        c.g = Math.max(0, Math.min(1, c.g + localNoiseG));
        c.b = Math.max(0, Math.min(1, c.b + localNoiseB));

        const brightnessVariation = 0.88 + Math.random() * 0.15;
        c.multiplyScalar(brightnessVariation);

        surfaceColors.push(c.r, c.g, c.b);

        placedCount++;
    }

    console.log(`Placed ${placedCount} particles after ${attempts} attempts.`);

    const geo = new THREE.BufferGeometry();
    const mat = new THREE.PointsMaterial({
        size           : 0.055,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });
    surfacePoints = new THREE.Points(geo, mat);
    marsSurfaceGroup.add(surfacePoints);

    //  数据联动：分批加载粒子 + 同步更新数据面板
    let currentIndex = 0;
    let batchFrame = 0;
    let startTime = Date.now();
    const batchStart = 300;
    const batchSlope = 50;
    const batchMax = 4000;

    function addSurfaceParticles() {
        batchFrame += 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const batchSize = Math.min(batchMax * speedFactor, batchStart * speedFactor + batchFrame * batchSlope);
        const endIndex = Math.min(currentIndex + batchSize, surfacePos.length / 3);
        const posArray = surfacePos.slice(0, endIndex * 3);
        const colArray = surfaceColors.slice(0, endIndex * 3);

        geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

        currentIndex = endIndex;

        //  核心同步：粒子数 → 数据量/里程/时间 一键联动
        const dataInfo = getCurrentMarsData(currentIndex);
        window.currentMarsData = dataInfo.data;
        window.currentMarsMileage = dataInfo.mileage;
        
        // 更新UI面板
        document.getElementById('mars-time').innerText = dataInfo.date;
        document.getElementById('mars-mileage').innerText = dataInfo.mileage;
        document.getElementById('mars-data').innerText = dataInfo.data;
        document.getElementById('mars-particle').innerText = currentIndex.toLocaleString();

        if (currentIndex < surfacePos.length / 3)
            requestAnimationFrame(addSurfaceParticles);
    }

    addSurfaceParticles();

    const wireGeo = new THREE.WireframeGeometry(
        new THREE.SphereGeometry(coreRadius + 0.01, 32, 16)
    );
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#dd4f31',
        transparent: true,
        opacity    : 0.03
    });
    marsSurfaceGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

// --- B. 极稀薄大气 ---
function createMarsAtmosphere()
{
    const atmosParticles = 300000;
    const atmosPos       = [];
    const atmosColors    = [];

    const colHaze = new THREE.Color('#ffc840');
    const rBase   = coreRadius + 0.1;

    for (let i = 0; i < atmosParticles; i++)
    {
        const r     = rBase + Math.random() * 0.3;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        atmosPos.push(x, y, z);

        let c = colHaze.clone();
        c.multiplyScalar(0.5 + Math.random() * 0.5);

        atmosColors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();

    const mat = new THREE.PointsMaterial({
        size           : 0.06,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.08,
        sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    marsAtmosGroup.add(points);

    let currentIndex = 0;
    let batchFrame = 0;
    let startTime = Date.now();
    const batchStart = 300;
    const batchSlope = 50;
    const batchMax = 3500;

    function addAtmosParticles()
    {
        batchFrame += 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = batchStart * speedFactor;
        const adjustedBatchSlope = batchSlope * speedFactor;
        const adjustedBatchMax = batchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + batchFrame * adjustedBatchSlope);
        const endIndex = Math.min(currentIndex + batchSize, atmosPos.length / 3);
        const posArray = atmosPos.slice(0, endIndex * 3);
        const colArray = atmosColors.slice(0, endIndex * 3);

        geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

        currentIndex = endIndex;

        if (currentIndex < atmosPos.length / 3)
        {
            requestAnimationFrame(addAtmosParticles);
        }
    }

    addAtmosParticles();
}

// --- C. 卫星系统 ---
function createMarsMoons()
{
    const moonsConfig = [
        {
            name  : "Phobos",
            radius: 7.5,
            speed : 0.008,
            baseSize     : 0.25,
            scale        : {x: 1.3, y: 1.0, z: 0.8},
            color        : 0xcccccc,
            particleCount: 600
        },
        {
            name         : "Deimos",
            radius       : 12.0,
            speed        : 0.003,
            baseSize     : 0.18,
            scale        : {x: 0.9, y: 0.7, z: 0.7},
            color        : 0xaaaaaa,
            particleCount: 400
        }
    ];

    moonsConfig.forEach(config =>
    {
        const satOrbit      = new THREE.Group();
        satOrbit.rotation.x = Math.random() * 0.05;
        satOrbit.rotation.y = Math.random() * Math.PI * 2;
        marsMoonGroup.add(satOrbit);

        const orbitPoints = 128;
        const orbitGeo    = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, config.radius, config.radius, 0, 2 * Math.PI).getPoints(orbitPoints));
        const orbitLine   = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({
            color      : config.color,
            transparent: true,
            opacity    : 0.15,
            dashSize   : config.name === "Phobos" ? 0.5 : 1.0,
            gapSize    : config.name === "Phobos" ? 0.3 : 0.5
        }));
        orbitLine.computeLineDistances();
        orbitLine.rotation.x = Math.PI / 2;
        satOrbit.add(orbitLine);

        const moonBody = new THREE.Group();
        moonBody.position.set(config.radius, 0, 0);
        satOrbit.add(moonBody);

        const moonPos  = [];
        const moonCols = [];
        const moonGen  = new SimplexNoise('mars-moon-' + config.name);
        const mColBase = new THREE.Color(config.color);
        const mColDark = new THREE.Color(config.color).multiplyScalar(0.4);

        for (let i = 0; i < config.particleCount; i++)
        {
            const rBase = 1.0;
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);

            let x = rBase * Math.sin(phi) * Math.cos(theta);
            let y = rBase * Math.sin(phi) * Math.sin(theta);
            let z = rBase * Math.cos(phi);

            let n    = moonGen.noise3D(x * 2.0, y * 2.0, z * 2.0);
            let rMod = 1.0 + n * 0.15;

            x *= rMod * config.scale.x * config.baseSize;
            y *= rMod * config.scale.y * config.baseSize;
            z *= rMod * config.scale.z * config.baseSize;

            moonPos.push(x, y, z);

            let c = new THREE.Color();
            if (n < -0.2) {
                c.copy(mColDark);
            } else {
                c.copy(mColBase);
            }
            c.multiplyScalar(0.9 + Math.random() * 0.2);
            moonCols.push(c.r, c.g, c.b);
        }

        const moonPointsGeo = new THREE.BufferGeometry();
        moonPointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(moonPos, 3));
        moonPointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(moonCols, 3));

        const moonPointsMat = new THREE.PointsMaterial({
            size           : 0.035,
            vertexColors   : true,
            transparent    : true,
            opacity        : 1.0,
            sizeAttenuation: true
        });
        moonBody.add(new THREE.Points(moonPointsGeo, moonPointsMat));

        const wireGeoRaw = new THREE.IcosahedronGeometry(1.0, 1);
        wireGeoRaw.scale(config.scale.x * config.baseSize * 1.05, config.scale.y * config.baseSize * 1.05, config.scale.z * config.baseSize * 1.05);

        const wireGeo = new THREE.WireframeGeometry(wireGeoRaw);
        const wireMat = new THREE.LineBasicMaterial({
            color      : config.color,
            transparent: true,
            opacity    : 0.08
        });
        moonBody.add(new THREE.LineSegments(wireGeo, wireMat));

        moonsData.push({
            mesh    : moonBody,
            speed   : config.speed,
            radius  : config.radius,
            angle   : Math.random() * Math.PI * 2,
            isPhobos: config.name === "Phobos"
        });
    });
}

// ==========================================
// PART 5: 交互与动画循环
// ==========================================

initInteraction(group, INITIAL_ZOOM);

if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.2;
    InteractionState.targetRotationY = 0.0;
}
group.rotation.x = 0.2;
group.rotation.y = 0.0;

function animate()
{
    requestAnimationFrame(animate);

    marsSurfaceGroup.rotation.y += 0.0025;
    marsAtmosGroup.rotation.y += 0.003;

    moonsData.forEach(moon =>
    {
        moon.angle += moon.speed;
        moon.mesh.position.x = moon.radius * Math.cos(moon.angle);
        moon.mesh.position.z = moon.radius * Math.sin(moon.angle);

        if (moon.isPhobos)
        {
            moon.mesh.rotation.z -= 0.01;
            moon.mesh.rotation.y += 0.005;
        }
        else
        {
            moon.mesh.rotation.y += 0.002;
            moon.mesh.rotation.x += 0.003;
        }
    });

    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
    updatePlanetTelemetry(marsSurfaceGroup, tgtLabel, 1);

    renderer.render(scene, camera);
}

animate();