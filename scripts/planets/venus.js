// ==========================================
// NASA-Punk Project: SOL-II (VENUS) - 3秒延迟同步版
// ==========================================

// --- PART 1: 基础观测背景 (立即执行，无延迟) ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100
});
sharedTopoBackground.resize();


// ==========================================
// PART 2: Three.js 场景基础初始化 (立即执行，无延迟)
// ==========================================
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

let currentZoom    = 25;
const INITIAL_ZOOM = 25;
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

// 1. 倾角容器 (金星轴倾角极大 ~177度)
const planetTiltGroup      = new THREE.Group();
planetTiltGroup.rotation.z = 177 * (Math.PI / 180);
group.add(planetTiltGroup);

// 2. 自转容器 - CORE (地表，慢速自转)
const venusSurfaceGroup = new THREE.Group();
planetTiltGroup.add(venusSurfaceGroup);

// 3. 自转容器 - CLOUDS (大气，超自转)
const cloudGroup = new THREE.Group();
planetTiltGroup.add(cloudGroup);

// 全局变量定义
let cloudPoints;
const coreRadius = 5.0;
const TOTAL_PARTICLE = 740000;
const SURFACE_PARTICLE = 620000;
const CLOUD_PARTICLE = 120000;

let particleController = {
    surfaceGeo: null,
    cloudGeo: null,
    surfacePos: [],
    surfaceColors: [],
    cloudPos: [],
    cloudColors: [],
    currentSurface: 0,
    currentCloud: 0,
    isSurfaceReady: false,
    isCloudReady: false
};

// ==========================================
//  核心：3秒延迟启动函数（所有渲染逻辑包裹于此）
// ==========================================
function startVenusAnimation() {
    // --- A. 地表点云 (Inner Surface: Magma Chaos) ---
    function createVenusSurface()
    {
        const surfacePos       = new Float32Array(SURFACE_PARTICLE * 3);
        const surfaceColors    = new Float32Array(SURFACE_PARTICLE * 3);
        const noiseGen         = new SimplexNoise('venus-magma-chaos-rock');

        const colBase = new THREE.Color('#8b1a1a');
        const colHigh = new THREE.Color('#d9531e');
        const colPeak = new THREE.Color('#ffe0a0');

        for (let i = 0; i < SURFACE_PARTICLE; i++)
        {
            const r     = coreRadius;
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);

            let x = r * Math.sin(phi) * Math.cos(theta);
            let y = r * Math.sin(phi) * Math.sin(theta);
            let z = r * Math.cos(phi);

            let nChaos = 0;
            nChaos += noiseGen.noise3D(x * 1.5, y * 1.5, z * 1.5) * 0.8;
            nChaos += noiseGen.noise3D(x * 4.0, y * 4.0, z * 4.0) * 0.2;

            const heightMod = noiseGen.noise3D(x * 0.2, y * 0.2, z * 0.2) * 0.005;
            x *= (1 + heightMod / r);
            y *= (1 + heightMod / r);
            z *= (1 + heightMod / r);

            surfacePos[i * 3] = x;
            surfacePos[i * 3 + 1] = y;
            surfacePos[i * 3 + 2] = z;

            let c   = new THREE.Color();
            let val = (nChaos + 1) / 2;

            if (val < 0.5) {
                c.copy(colBase).lerp(colHigh, val * 2.0);
            } else {
                c.copy(colHigh).lerp(colPeak, (val - 0.5) * 2.0);
            }

            c.multiplyScalar(0.9 + Math.random() * 0.2);
            surfaceColors[i * 3] = c.r;
            surfaceColors[i * 3 + 1] = c.g;
            surfaceColors[i * 3 + 2] = c.b;
        }

        const geo = new THREE.BufferGeometry();
        const mat = new THREE.PointsMaterial({
            size           : 0.055,
            vertexColors   : true,
            transparent    : true,
            opacity        : 0.95,
            sizeAttenuation: true
        });
        const points = new THREE.Points(geo, mat);
        venusSurfaceGroup.add(points);

        particleController.surfaceGeo = geo;
        particleController.surfacePos = surfacePos;
        particleController.surfaceColors = surfaceColors;
    }

    // --- B. 大气点云 (Outer Atmosphere) ---
    function createVenusClouds()
    {
        const cloudPos       = new Float32Array(CLOUD_PARTICLE * 3);
        const cloudColors    = new Float32Array(CLOUD_PARTICLE * 3);
        const cloudGen       = new SimplexNoise('venus-atmosphere-sulphur');
        const colBase = new THREE.Color('#ffae20');
        let validCount = 0;

        for (let i = 0; i < CLOUD_PARTICLE; i++)
        {
            const r     = coreRadius + Math.random() * 0.4;
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            cloudPos[validCount * 3] = x;
            cloudPos[validCount * 3 + 1] = y;
            cloudPos[validCount * 3 + 2] = z;

            let c = colBase.clone();
            c.multiplyScalar(0.9 + Math.random() * 0.2);
            cloudColors[validCount * 3] = c.r;
            cloudColors[validCount * 3 + 1] = c.g;
            cloudColors[validCount * 3 + 2] = c.b;
            
            validCount++;
        }

        const geo = new THREE.BufferGeometry();
        const mat = new THREE.PointsMaterial({
            size           : 0.06,
            vertexColors   : true,
            transparent    : true,
            opacity        : 0.2,
            sizeAttenuation: true
        });

        cloudPoints = new THREE.Points(geo, mat);
        cloudGroup.add(cloudPoints);

        particleController.cloudGeo = geo;
        particleController.cloudPos = cloudPos.slice(0, validCount * 3);
        particleController.cloudColors = cloudColors.slice(0, validCount * 3);

        // 测量网格
        const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(coreRadius + 0.1, 24, 12));
        const wireMat = new THREE.LineBasicMaterial({
            color      : '#ffc140',
            transparent: true,
            opacity    : 0.05
        });
        planetTiltGroup.add(new THREE.LineSegments(wireGeo, wireMat));
    }

    // 数据联动粒子生成 - 逐步添加粒子
    function syncParticlesWithUI() {
        const particleEl = document.getElementById('particle');
        if (!particleEl) return;

        let current = parseInt(particleEl.innerText.replace(/,/g, '')) || 0;
        const max = TOTAL_PARTICLE;

        const surfaceTarget = Math.min(SURFACE_PARTICLE, Math.floor(current * (SURFACE_PARTICLE / max)));
        const cloudTarget = Math.min(CLOUD_PARTICLE, Math.floor(current * (CLOUD_PARTICLE / max)));

        // 逐步增加表面粒子
        if (particleController.currentSurface < surfaceTarget) {
            const increment = Math.min(2000, surfaceTarget - particleController.currentSurface); // 控制每帧增加的数量
            particleController.currentSurface = Math.min(particleController.currentSurface + increment, surfaceTarget);
            const end = particleController.currentSurface * 3;
            particleController.surfaceGeo.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(particleController.surfacePos.slice(0, end), 3)
            );
            particleController.surfaceGeo.setAttribute(
                'color',
                new THREE.Float32BufferAttribute(particleController.surfaceColors.slice(0, end), 3)
            );
        }

        // 逐步增加云层粒子
        if (particleController.currentCloud < cloudTarget) {
            const increment = Math.min(1000, cloudTarget - particleController.currentCloud); // 控制每帧增加的数量
            particleController.currentCloud = Math.min(particleController.currentCloud + increment, cloudTarget);
            const end = particleController.currentCloud * 3;
            particleController.cloudGeo.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(particleController.cloudPos.slice(0, end), 3)
            );
            particleController.cloudGeo.setAttribute(
                'color',
                new THREE.Float32BufferAttribute(particleController.cloudColors.slice(0, end), 3)
            );
        }

        requestAnimationFrame(syncParticlesWithUI);
    }

    // 初始化金星组件
    createVenusSurface();
    createVenusClouds();

    // 交互初始化
    initInteraction(group, INITIAL_ZOOM);
    if (typeof InteractionState !== 'undefined') {
        InteractionState.targetRotationX = -0.2;
        InteractionState.targetRotationY = 0.0;
    }
    group.rotation.x = -0.2;
    group.rotation.y = 0.0;

    // 动画循环
    function animate() {
        requestAnimationFrame(animate);

        venusSurfaceGroup.rotation.y -= 0.0002;
        cloudGroup.rotation.y -= 0.0015;

        if (cloudPoints && cloudPoints.geometry) {
            const time      = Date.now() * 0.00005;
            const colors    = cloudPoints.geometry.attributes.color.array;
            const positions = cloudPoints.geometry.attributes.position.array;
            const noiseGen  = new SimplexNoise('venus-atmosphere-flow');
            const colBase   = new THREE.Color('#ffae20');

            for (let i = 0; i < positions.length / 3; i++) {
                const x = positions[i * 3];
                const y = positions[i * 3 + 1];
                const z = positions[i * 3 + 2];
                const flowNoise = noiseGen.noise3D(x * 0.2 + time, y * 0.2 + time, z * 0.2 + time);
                const brightness = 1.0 + flowNoise * 0.25;
                const c = colBase.clone().multiplyScalar(brightness);

                colors[i * 3]     = c.r;
                colors[i * 3 + 1] = c.g;
                colors[i * 3 + 2] = c.b;
            }
            cloudPoints.geometry.attributes.color.needsUpdate = true;
        }

        currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
        updatePlanetTelemetry(cloudGroup, tgtLabel, 2);

        renderer.render(scene, camera);
    }

    // 启动联动与动画
    syncParticlesWithUI();
    animate();
}

// ==========================================
//  统一3秒延迟启动（和太阳/水星/数据面板同步）
// ==========================================
window.addEventListener('load', () => {
    setTimeout(startVenusAnimation, 3000);
});