// ==========================================
// NASA-Punk Project: SUN
// ==========================================

//  核心同步配置（1:1000  发射数→粒子数）
const MAX_LAUNCH = 657;
const MAX_SUN_PARTICLE = 657000;
const PARTICLE_PER_LAUNCH = 1000;

// 时间分段配置（与发射数严格绑定）
const segments = [
  { count: 0,   date: "1970" },
  { count: 100, date: "2007.06.01" },
  { count: 200, date: "2014.12.07" },
  { count: 300, date: "2019.03.10" },
  { count: 400, date: "2021.12.10" },
  { count: 500, date: "2023.12.10" },
  { count: 600, date: "2025.10.16" },
  { count: 657, date: "2025.12.31" }
];

// 全局共享发射数
window.currentCount = 0;

// 时间计算工具函数
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
  return "2025.12.31";
}

// --- PART 1: 基础观测背景 (Standard SOL-III Config) ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100,
    overlayFill: 'rgba(200, 35, 55, 0.03)'
});
sharedTopoBackground.resize();


// ==========================================
// PART 2: Three.js 3D 场景 (SOL [STAR])
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

const sunGroup = new THREE.Group();
group.add(sunGroup);


// --- A. 动态光球 (Photosphere) ---
let sunGeometry;
let sunParticles;
const sunNoiseGen = new SimplexNoise('sol-core-v1');
const timeStep    = 0.005;

function createDynamicSun()
{
    // 固定65.7万粒子
    const particleCount = MAX_SUN_PARTICLE;
    const originalPositions = new Float32Array(particleCount * 3);
    const baseColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++)
    {
        const r     = 6.0;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);

        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;

        const brightness = 0.8 + Math.random() * 0.4;
        baseColors[i * 3] = brightness;
        baseColors[i * 3 + 1] = brightness;
        baseColors[i * 3 + 2] = brightness;
    }

    sunGeometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3);
    const colorAttr = new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3);

    sunGeometry.setAttribute('position', positionAttr);
    sunGeometry.setAttribute('color', colorAttr);
    sunGeometry.setDrawRange(0, 0);
    sunGeometry.userData = {
        originalPositions: originalPositions,
        baseColors: baseColors,
        loadingComplete: false,
        particleCount: particleCount
    };

    const sunMat = new THREE.PointsMaterial({
        size        : 0.09,
        vertexColors: true,
        transparent : true,
        opacity     : 0.95,
        blending    : THREE.AdditiveBlending,
        depthWrite  : false
    });

    sunParticles = new THREE.Points(sunGeometry, sunMat);
    sunGroup.add(sunParticles);

    let sunIndex = 0;
    let sunFrame = 0;
    let startTime = Date.now();
    const sunBatchStart = 300;
    const sunBatchSlope = 40;
    const sunBatchMax = 2500;

    function addSunParticles()
    {
        sunFrame += 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedFactor = elapsed < 4 ? 0.2 : 1.0;
        const adjustedBatchStart = sunBatchStart * speedFactor;
        const adjustedBatchSlope = sunBatchSlope * speedFactor;
        const adjustedBatchMax = sunBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + sunFrame * adjustedBatchSlope);
        const endIndex = Math.min(sunIndex + batchSize, particleCount);

        positionAttr.copyArray(originalPositions.subarray(0, endIndex * 3));
        colorAttr.copyArray(baseColors.subarray(0, endIndex * 3));
        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        sunGeometry.setDrawRange(0, endIndex);

        sunIndex = endIndex;

        //  核心同步：粒子数 → 发射数 → 时间 一键同步
        const currentLaunchCount = Math.min(MAX_LAUNCH, Math.round(sunIndex / PARTICLE_PER_LAUNCH));
        window.currentCount = currentLaunchCount;
        document.getElementById('particle').innerText = sunIndex.toLocaleString();
        document.getElementById('launch').innerText = currentLaunchCount;
        document.getElementById('time').innerText = getCurrentDate(currentLaunchCount);

        if (sunIndex < particleCount)
        {
            requestAnimationFrame(addSunParticles);
        } else {
            sunGeometry.userData.loadingComplete = true;
            console.log("Sun particles loaded successfully.");
        }
    }

    addSunParticles();
}

createDynamicSun();


// --- A-2. 太阳核心 (Dense Core) ---
let coreParticles;

function createSunCore()
{
    const particleCount = 5000;
    const positions     = [];
    const colors        = [];

    const colorCoreHot   = new THREE.Color('#ffffff');
    const colorCoreInner = new THREE.Color('#ffb84d');

    for (let i = 0; i < particleCount; i++)
    {
        const r     = 4.0 + Math.random() * 1.5;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);

        positions.push(x, y, z);

        const c           = new THREE.Color();
        const normalizedR = (r - 4.0) / 1.5;
        c.copy(colorCoreHot).lerp(colorCoreInner, normalizedR);

        colors.push(c.r, c.g, c.b);
    }

    const coreGeo = new THREE.BufferGeometry();
    const positionAttr = new THREE.Float32BufferAttribute(new Float32Array(particleCount * 3), 3);
    const colorAttr = new THREE.Float32BufferAttribute(new Float32Array(particleCount * 3), 3);
    coreGeo.setAttribute('position', positionAttr);
    coreGeo.setAttribute('color', colorAttr);
    coreGeo.setDrawRange(0, 0);

    const coreMat = new THREE.PointsMaterial({
        size        : 0.12,
        vertexColors: true,
        transparent : true,
        opacity     : 0.85,
        blending    : THREE.AdditiveBlending
    });

    coreParticles = new THREE.Points(coreGeo, coreMat);
    sunGroup.add(coreParticles);

    let coreIndex = 0;
    let coreFrame = 0;
    let startTime = Date.now();
    const coreBatchStart = 300;
    const coreBatchSlope = 50;
    const coreBatchMax = 3500;

    function addCoreParticles()
    {
        coreFrame += 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = coreBatchStart * speedFactor;
        const adjustedBatchSlope = coreBatchSlope * speedFactor;
        const adjustedBatchMax = coreBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + coreFrame * adjustedBatchSlope);
        const endIndex = Math.min(coreIndex + batchSize, particleCount);

        positionAttr.array.set(positions.slice(0, endIndex * 3));
        colorAttr.array.set(colors.slice(0, endIndex * 3));
        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        coreGeo.setDrawRange(0, endIndex);

        coreIndex = endIndex;
        if (coreIndex < particleCount)
        {
            requestAnimationFrame(addCoreParticles);
        }
    }

    addCoreParticles();
}

createSunCore();


// --- B. 磁场环 (Magnetic Loops) ---
const magneticGroup = new THREE.Group();
sunGroup.add(magneticGroup);
const activeLoops = [];

function createMagneticLoops()
{
    const loopCount = 12;

    for (let i = 0; i < loopCount; i++)
    {
        const r      = 5.8;
        const theta1 = Math.random() * Math.PI * 2;
        const phi1   = Math.acos(2 * Math.random() - 1);
        const p1     = new THREE.Vector3().setFromSphericalCoords(r, phi1, theta1);
        const offset = new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
        const p2     = p1.clone().add(offset).normalize().multiplyScalar(r);
        const mid    = p1.clone().add(p2).multiplyScalar(0.5).normalize().multiplyScalar(r * (1.3 + Math.random() * 0.5));

        const curve       = new THREE.CubicBezierCurve3(p1, p1.clone().lerp(mid, 0.5), p2.clone().lerp(mid, 0.5), p2);
        const points      = curve.getPoints(60);
        const particleGeo = new THREE.BufferGeometry().setFromPoints(points);

        const rand    = Math.random();
        let loopColor = 0xe06236;
        if (rand > 0.6)
        {
            loopColor = 0xffb84d;
        }
        else if (rand < 0.3)
        {
            loopColor = 0xcc4400;
        }

        const particleMat = new THREE.PointsMaterial({
            color      : loopColor,
            size       : 0.05,
            transparent: true,
            opacity    : 0.6,
            blending   : THREE.AdditiveBlending
        });

        const mesh = new THREE.Points(particleGeo, particleMat);
        magneticGroup.add(mesh);
        activeLoops.push({
            mesh      : mesh,
            flowOffset: Math.random() * 100
        });
    }
}

createMagneticLoops();


// --- C. 动态日冕 (Dynamic Corona) ---
const coronaGroup = new THREE.Group();
sunGroup.add(coronaGroup);

function createCoronaSystem()
{
    const coronaParticles = 150000;
    const positions       = new Float32Array(coronaParticles * 3);
    const colors          = new Float32Array(coronaParticles * 3);
    const sizes           = new Float32Array(coronaParticles * 1);

    const colInner = new THREE.Color('#ffcc66');
    const colOuter = new THREE.Color('#cc4400');

    for (let i = 0; i < coronaParticles; i++)
    {
        const t = Math.pow(Math.random(), 1.5);
        const r = 6.1 + t * 3.5;

        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const normalizedDist = (r - 6.1) / 3.5;
        const c              = new THREE.Color().copy(colInner).lerp(colOuter, normalizedDist);
        c.multiplyScalar(0.8 + Math.random() * 0.6);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        sizes[i] = 0.3 * (1.0 - normalizedDist * 0.5);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute([], 1));

    const mat = new THREE.PointsMaterial({
        size        : 0.1,
        vertexColors: true,
        transparent : true,
        opacity     : 0.35,
        blending    : THREE.AdditiveBlending,
        depthWrite  : false
    });

    const mesh    = new THREE.Points(geo, mat);
    mesh.userData = {
        baseRadius: 5.1,
        maxRadius : 9.6,
        directions: [],
        speeds    : []
    };

    for (let i = 0; i < coronaParticles; i++)
    {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        const v = new THREE.Vector3(x, y, z).normalize();
        mesh.userData.directions.push(v);
        mesh.userData.speeds.push(0.002 + Math.random() * 0.008);
    }

    coronaGroup.add(mesh);

    let coronaIndex = 0;
    let coronaFrame = 0;
    const coronaBatchStart = 200;
    const coronaBatchSlope = 20;
    const coronaBatchMax = 1000;

    function addCoronaParticles()
    {
        coronaFrame++;
        const batchSize = Math.min(coronaBatchMax, coronaBatchStart + coronaFrame * coronaBatchSlope);
        const endIndex = Math.min(coronaIndex + batchSize, coronaParticles);

        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(0, endIndex * 3), 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors.slice(0, endIndex * 3), 3));
        geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes.slice(0, endIndex), 1));

        coronaIndex = endIndex;

        if (coronaIndex < coronaParticles)
        {
            requestAnimationFrame(addCoronaParticles);
        }
    }

    addCoronaParticles();
    return mesh;
}

const coronaMesh = createCoronaSystem();


// --- D. 标准双层网格 (Observation Grids) ---
const gridGroup = new THREE.Group();
sunGroup.add(gridGroup);

function createSunGrid()
{
    const geo1  = new THREE.WireframeGeometry(new THREE.SphereGeometry(6.0, 24, 24));
    const mat1  = new THREE.LineBasicMaterial({
        color      : 0xffb84d,
        transparent: true,
        opacity    : 0.15
    });
    const mesh1 = new THREE.LineSegments(geo1, mat1);
    gridGroup.add(mesh1);

    const geo2  = new THREE.WireframeGeometry(new THREE.SphereGeometry(6.5, 32, 32));
    const mat2  = new THREE.LineBasicMaterial({
        color      : 0xcc4400,
        transparent: true,
        opacity    : 0.05
    });
    const mesh2 = new THREE.LineSegments(geo2, mat2);
    gridGroup.add(mesh2);

    return {
        inner: mesh1,
        outer: mesh2
    };
}
const sunGrids = null;


// --- E. 日面喷发 (Solar Eruptions) --- 
const eruptionGroup = new THREE.Group();
sunGroup.add(eruptionGroup);
const maxEruptionParticles = 5000;
const eruptionGeo          = new THREE.BufferGeometry();
const eruptionPositions    = new Float32Array(maxEruptionParticles * 3);
const eruptionColors       = new Float32Array(maxEruptionParticles * 3);
const eruptionData         = [];

for (let i = 0; i < maxEruptionParticles; i++)
{
    eruptionPositions[i * 3]     = 0;
    eruptionPositions[i * 3 + 1] = 0;
    eruptionPositions[i * 3 + 2] = 0;
    const brightness = 0.8 + Math.random() * 0.6;
    eruptionColors[i * 3]        = brightness;
    eruptionColors[i * 3 + 1]    = brightness * 0.8;
    eruptionColors[i * 3 + 2]    = brightness * 0.6;
    eruptionData.push({
        active  : false,
        velocity: new THREE.Vector3(),
        life    : 0,
        maxLife : 0,
        startPos: new THREE.Vector3()
    });
}
eruptionGeo.setAttribute('position', new THREE.BufferAttribute(eruptionPositions, 3));
eruptionGeo.setAttribute('color', new THREE.BufferAttribute(eruptionColors, 3));
const eruptionMat  = new THREE.PointsMaterial({
    size        : 0.18,
    vertexColors: true,
    transparent : true,
    opacity     : 0.95,
    blending    : THREE.AdditiveBlending
});
const eruptionMesh = new THREE.Points(eruptionGeo, eruptionMat);
eruptionGroup.add(eruptionMesh);

function triggerEruption()
{
    const r        = 6.0;
    const theta    = Math.random() * Math.PI * 2;
    const phi      = Math.acos(2 * Math.random() - 1);
    const startPos = new THREE.Vector3().setFromSphericalCoords(r, phi, theta);
    const normal   = startPos.clone().normalize();

    let count       = 0;
    const batchSize = 100 + Math.floor(Math.random() * 80);

    for (let i = 0; i < maxEruptionParticles; i++)
    {
        if (!eruptionData[i].active)
        {
            eruptionData[i].active  = true;
            eruptionData[i].life    = 0;
            eruptionData[i].maxLife = 300 + Math.random() * 200;

            const offset = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.2);
            const pos    = startPos.clone().add(offset);

            eruptionPositions[i * 3]     = pos.x;
            eruptionPositions[i * 3 + 1] = pos.y;
            eruptionPositions[i * 3 + 2] = pos.z;
            eruptionData[i].startPos.copy(pos);

            const speed              = 0.05 + Math.random() * 0.06;
            const spread             = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.03);
            eruptionData[i].velocity = normal.clone().multiplyScalar(speed).add(spread);

            count++;
            if (count >= batchSize)
            {
                break;
            }
        }
    }
}
window.triggerEruption = triggerEruption;

initInteraction(group, INITIAL_ZOOM);

if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.0;
    InteractionState.targetRotationY = -Math.PI / 2;
}
group.rotation.x = 0.0;
group.rotation.y = -Math.PI / 2;

let time = 0;
let eruptionTimer = 0;

function animate()
{
    requestAnimationFrame(animate);

    const launchCount = window.currentCount || 0;
    const speedFactor = 0.5 + (launchCount / MAX_LAUNCH) * 1.5;
    const syncedTimeStep = timeStep * speedFactor;

    time += syncedTimeStep;
    eruptionTimer += syncedTimeStep;

    sunGroup.rotation.y += 0.001 * speedFactor;

    if (eruptionTimer > 0.5 / speedFactor) {
        if (Math.random() > 0.7 / speedFactor) {
            triggerEruption();
        }
        eruptionTimer = 0;
    }

    if (coreParticles)
    {
        coreParticles.rotation.y += 0.002 * speedFactor;
        const pulse = 1.0 + Math.sin(time * 3.0) * 0.005;
        coreParticles.scale.set(pulse, pulse, pulse);
    }

    if (sunGrids)
    {
        sunGrids.inner.rotation.y += 0.0005;
        sunGrids.outer.rotation.y -= 0.0005;
        sunGrids.outer.rotation.z += 0.0002;
    }

    //  还原原版动态配色逻辑（完全不变）
    if (sunParticles && sunGeometry)
    {
        const positions = sunGeometry.attributes.position.array;
        const colors    = sunGeometry.attributes.color.array;
        const origPos   = sunGeometry.userData.originalPositions;

        const colCore    = new THREE.Color('#ffffff');
        const colSurface = new THREE.Color('#ffb84d');
        const colEdge    = new THREE.Color('#cc4400');
        const colSpot    = new THREE.Color('#8a1c00');

        for (let i = 0; i < positions.length / 3; i++)
        {
            const x = origPos[i * 3];
            const y = origPos[i * 3 + 1];
            const z = origPos[i * 3 + 2];

            let n = sunNoiseGen.noise3D(x * 0.4, y * 0.4, z * 0.4 + time * 0.3);
            n += 0.5 * sunNoiseGen.noise3D(x * 1.5, y * 1.5, z * 1.5 - time * 0.5);

            const limbFactor = z / 6.0;
            const c          = new THREE.Color();

            if (n > 0.6)
            {
                c.copy(colCore);
            }
            else if (n > 0.0)
            {
                c.copy(colSurface).lerp(colCore, n);
            }
            else if (n > -0.5)
            {
                c.copy(colEdge).lerp(colSurface, (n + 0.5) * 2);
            }
            else
            {
                c.copy(colSpot).lerp(colEdge, (n + 1.0) * 2);
            }

            if (limbFactor < 0.5)
            {
                c.lerp(colSpot, (0.5 - limbFactor) * 1.5);
            }

            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;

            const pulse          = 1.0 + n * 0.05;
            positions[i * 3]     = x * pulse;
            positions[i * 3 + 1] = y * pulse;
            positions[i * 3 + 2] = z * pulse;
        }
        sunGeometry.attributes.position.needsUpdate = true;
        sunGeometry.attributes.color.needsUpdate    = true;
    }


    if (coronaMesh)
    {
        const positions  = coronaMesh.geometry.attributes.position.array;
        const speeds     = coronaMesh.userData.speeds;
        const directions = coronaMesh.userData.directions;
        const baseR      = coronaMesh.userData.baseRadius;
        const maxR       = coronaMesh.userData.maxRadius;

        for (let i = 0; i < positions.length / 3; i++)
        {
            let x = positions[i * 3];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];

            const dir = directions[i];

            const noiseX = sunNoiseGen.noise4D(x * 0.5, y * 0.5, z * 0.5, time * 0.5) * 0.03;
            const noiseY = sunNoiseGen.noise4D(y * 0.5, z * 0.5, x * 0.5, time * 0.5 + 100) * 0.03;
            const noiseZ = sunNoiseGen.noise4D(z * 0.5, x * 0.5, y * 0.5, time * 0.5 + 200) * 0.03;

            const speed = speeds[i] * (1.0 + Math.sin(time + i) * 0.3) * speedFactor;

            x += dir.x * speed + noiseX;
            y += dir.y * speed + noiseY;
            z += dir.z * speed + noiseZ;

            const len = Math.sqrt(x * x + y * y + z * z);
            if (len > maxR)
            {
                x = dir.x * baseR;
                y = dir.y * baseR;
                z = dir.z * baseR;
            }

            positions[i * 3]     = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        coronaMesh.geometry.attributes.position.needsUpdate = true;
    }

    activeLoops.forEach((loop) =>
    {
        loop.mesh.material.opacity = 0.4 + Math.sin(time * 2 + loop.flowOffset) * 0.2;
    });

    const pPos         = eruptionGeo.attributes.position.array;
    const pCol         = eruptionGeo.attributes.color.array;
    const colEruptHot  = new THREE.Color('#ffffff');
    const colEruptMid  = new THREE.Color('#ffcc00');
    const colEruptCool = new THREE.Color('#8a1c00');

    const slowMo = 0.15 * speedFactor;

    for (let i = 0; i < maxEruptionParticles; i++)
    {
        if (eruptionData[i].active)
        {
            pPos[i * 3] += eruptionData[i].velocity.x * slowMo;
            pPos[i * 3 + 1] += eruptionData[i].velocity.y * slowMo;
            pPos[i * 3 + 2] += eruptionData[i].velocity.z * slowMo;

            const cx          = pPos[i * 3];
            const cy          = pPos[i * 3 + 1];
            const cz          = pPos[i * 3 + 2];
            const currentDist = Math.sqrt(cx * cx + cy * cy + cz * cz);
            const dirToCenter = new THREE.Vector3(-cx, -cy, -cz).normalize();

            const noiseScale = 0.5;
            const nX         = sunNoiseGen.noise4D(cx * noiseScale, cy * noiseScale, cz * noiseScale, time) * 0.003;
            const nY         = sunNoiseGen.noise4D(cy * noiseScale, cz * noiseScale, cx * noiseScale, time + 100) * 0.003;
            const nZ         = sunNoiseGen.noise4D(cz * noiseScale, cx * noiseScale, cy * noiseScale, time + 200) * 0.003;

            eruptionData[i].velocity.x += nX * slowMo;
            eruptionData[i].velocity.y += nY * slowMo;
            eruptionData[i].velocity.z += nZ * slowMo;

            eruptionData[i].velocity.addScaledVector(dirToCenter, 0.002 * slowMo);
            eruptionData[i].velocity.multiplyScalar(1.0 - (0.003 * slowMo));

            eruptionData[i].life += 1.0 * slowMo;
            const progress = eruptionData[i].life / eruptionData[i].maxLife;

            const c = new THREE.Color();
            if (progress < 0.15)
            {
                c.copy(colEruptHot).lerp(colEruptMid, progress / 0.15);
            }
            else
            {
                c.copy(colEruptMid).lerp(colEruptCool, (progress - 0.15) / 0.85);
            }

            pCol[i * 3]     = c.r;
            pCol[i * 3 + 1] = c.g;
            pCol[i * 3 + 2] = c.b;

            if (eruptionData[i].life >= eruptionData[i].maxLife || currentDist < 5.8)
            {
                eruptionData[i].active = false;
                pPos[i * 3]            = 0;
                pPos[i * 3 + 1]        = 0;
                pPos[i * 3 + 2]        = 0;
            }
        }
    }
    eruptionGeo.attributes.position.needsUpdate = true;
    eruptionGeo.attributes.color.needsUpdate    = true;

    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
    updatePlanetTelemetry(sunGroup, tgtLabel, 1);

    renderer.render(scene, camera);
}

animate();