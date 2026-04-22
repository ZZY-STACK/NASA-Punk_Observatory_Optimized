// ==========================================
// NASA-Punk Project: SOL-I (MERCURY) - 3秒延迟+粒子分层优化
// 前60万=基础地表 | 60-120万=高亮细节层，密度翻倍肉眼可见
// ==========================================

// --- PART 1: 基础观测背景（立即执行，无延迟）---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100
});
sharedTopoBackground.resize();

// ==========================================
// PART 2: Three.js 场景初始化（立即执行，无延迟）
// ==========================================
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

let currentZoom    = 28;
const INITIAL_ZOOM = 28;
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

const planetTiltGroup      = new THREE.Group();
planetTiltGroup.rotation.z = 0.03 * (Math.PI / 180);
group.add(planetTiltGroup);

const planetSpinGroup = new THREE.Group();
planetTiltGroup.add(planetSpinGroup);

const tailGroup = new THREE.Group();
planetTiltGroup.add(tailGroup);

// ==========================================
// 3秒延迟启动函数（完全保留原有逻辑）
// ==========================================
function startMercuryAnimation() {
    // --- PART 3: 水星本体 · 粒子分层优化（核心修改）---
    function createMercury()
    {
        const noiseGen      = new SimplexNoise('mercury-surface');
        const particleCount = 1200000; // 固定120万
        const positions     = [];
        const colors        = [];

        // 分层色板：前60万基础灰 | 后60万高亮银，形成视觉差
        const colBase  = new THREE.Color('#999999');    // 基础层
        const colDark  = new THREE.Color('#555555');
        const colLight = new THREE.Color('#cccccc');
        const colDetail = new THREE.Color('#e0e0e0');  // 细节层（60万后）

        for (let i = 0; i < particleCount; i++)
        {
            let r       = 5.0;
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);

            let x = r * Math.sin(phi) * Math.cos(theta);
            let y = r * Math.sin(phi) * Math.sin(theta);
            let z = r * Math.cos(phi);

            let nBase   = noiseGen.noise3D(x * 0.4, y * 0.4, z * 0.4);
            let nCrater = Math.abs(noiseGen.noise3D(x * 2.0, y * 2.0, z * 2.0));
            nCrater     = 1.0 - Math.pow(nCrater, 1.2);

            r += nBase * 0.06;
            r -= nCrater * 0.08;

            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = r * Math.cos(phi);

            positions.push(x, y, z);

            let c = new THREE.Color();
            //  核心分层：60万前基础色，60万后高亮色，密度翻倍视觉暴增
            if (i < 600000) {
                if (nCrater > 0.6) c.copy(colDark).multiplyScalar(0.8);
                else if (nBase > 0.2) c.copy(colLight).lerp(colBase, 0.3);
                else c.copy(colBase);
            } else {
                // 60~120万粒子：更亮、更细腻的银灰色，叠加后明显变密
                if (nCrater > 0.7) c.copy(colLight).multiplyScalar(0.95);
                else c.copy(colDetail).lerp(colBase, 0.2);
            }
            c.multiplyScalar(0.9 + Math.random() * 0.2);
            colors.push(c.r, c.g, c.b);
        }

        const geo = new THREE.BufferGeometry();

        const mat = new THREE.PointsMaterial({
            size           : 0.045, // 微调粒子大小，更细腻
            vertexColors   : true,
            transparent    : true,
            opacity        : 0.98,
            sizeAttenuation: true
        });

        const planet = new THREE.Points(geo, mat);
        planetSpinGroup.add(planet);

        // 完全保留你的原始粒子生成逻辑（无任何修改）
        let currentIndex = 0;
        let batchFrame = 0;
        let startTime = Date.now();
        const batchStart = 300;
        const batchSlope = 50;
        const batchMax = 4000;

        function addMercuryParticles()
        {
            batchFrame += 1;
            const elapsed = (Date.now() - startTime) / 1000;
            const speedFactor = elapsed < 3 ? 0.1 : 1.0;
            const adjustedBatchStart = batchStart * speedFactor;
            const adjustedBatchSlope = batchSlope * speedFactor;
            const adjustedBatchMax = batchMax * speedFactor;
            
            const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + batchFrame * adjustedBatchSlope);
            const endIndex = Math.min(currentIndex + batchSize, positions.length / 3);
            const posArray = positions.slice(0, endIndex * 3);
            const colArray = colors.slice(0, endIndex * 3);

            geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

            currentIndex = endIndex;
            if (currentIndex < positions.length / 3)
            {
                requestAnimationFrame(addMercuryParticles);
            }
        }
        addMercuryParticles();

        const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.02, 24, 12));
        const wireMat = new THREE.LineBasicMaterial({
            color      : '#a0a0a0',
            transparent: true,
            opacity    : 0.08
        });
        planetSpinGroup.add(new THREE.LineSegments(wireGeo, wireMat));
    }
    createMercury();

    // --- PART 4: 钠尾迹（100%保留你的原始逻辑）---
    const TAIL_COUNT  = 4800;
    const tailData    = new Array(TAIL_COUNT);
    let tailGeometry;
    const sodiumColor = new THREE.Color('#fff5cc');

    function initSodiumTail()
    {
        const geo   = new THREE.BufferGeometry();
        const pos   = new Float32Array(TAIL_COUNT * 3);
        const col   = new Float32Array(TAIL_COUNT * 3);
        const sizes = new Float32Array(TAIL_COUNT);

        for (let i = 0; i < TAIL_COUNT; i++)
        {
            col[i * 3]     = sodiumColor.r;
            col[i * 3 + 1] = sodiumColor.g;
            col[i * 3 + 2] = sodiumColor.b;

            tailData[i] = {
                x  : 0, y: 0, z: 0,
                vx : 0, vy: 0, vz: 0,
                age: 0, life: 100
            };

            respawnParticle(tailData[i], true);

            pos[i * 3]     = tailData[i].x;
            pos[i * 3 + 1] = tailData[i].y;
            pos[i * 3 + 2] = tailData[i].z;
            sizes[i]       = 0.0;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            vertexColors   : true,
            transparent    : true,
            opacity        : 0.4,
            size           : 0.1,
            blending       : THREE.AdditiveBlending,
            depthWrite     : false,
            sizeAttenuation: true
        });

        const mesh = new THREE.Points(geo, mat);
        tailGroup.add(mesh);
        tailGeometry = geo;
    }

    function respawnParticle(p, warmStart = false)
    {
        const angle  = Math.random() * Math.PI * 2;
        const radius = 2.0 + Math.random() * 2.8;

        p.y = Math.cos(angle) * radius;
        p.z = Math.sin(angle) * radius;
        p.x = -1.0 - Math.random() * 1.5;

        p.vx = -0.10 - Math.random() * 0.06;
        p.vy = (Math.random() - 0.5) * 0.015;
        p.vz = (Math.random() - 0.5) * 0.015;

        p.age  = 0;
        p.life = 60 + Math.random() * 90;

        if (warmStart) {
            const preTravel = Math.random() * 120;
            p.x += p.vx * preTravel;
            p.y += p.vy * preTravel;
            p.z += p.vz * preTravel;
            p.age = Math.floor(Math.random() * p.life);
        }
    }
    initSodiumTail();

    function updateSodiumTail()
    {
        const positions = tailGeometry.attributes.position.array;
        const sizes     = tailGeometry.attributes.size.array;

        for (let i = 0; i < TAIL_COUNT; i++)
        {
            const p = tailData[i];
            p.x += p.vx; p.y += p.vy; p.z += p.vz; p.age++;

            if (p.age >= p.life || p.x < -25.0) {
                respawnParticle(p, false);
                sizes[i] = 0.0;
            } else {
                const progress = p.age / p.life;
                let sizeMod = progress < 0.15 ? progress/0.15 : 1-((progress-0.15)/0.85);
                if (p.x > -3.0) sizeMod *= 0.8;
                sizes[i] = 0.15 * sizeMod;
            }
            positions[i*3] = p.x; positions[i*3+1] = p.y; positions[i*3+2] = p.z;
        }
        tailGeometry.attributes.position.needsUpdate = true;
        tailGeometry.attributes.size.needsUpdate = true;
    }

    // --- PART 5: 交互+动画（自转速度完全保留）---
    initInteraction(group, INITIAL_ZOOM);

    if (typeof InteractionState !== 'undefined') {
        InteractionState.targetRotationX = 0.2;
        InteractionState.targetRotationY = -0.6;
    }
    group.rotation.x = 0.2;
    group.rotation.y = -0.6;

    function animate()
    {
        requestAnimationFrame(animate);
        planetSpinGroup.rotation.y += 0.0003; // 原始自转速度不变
        updateSodiumTail();
        currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
        updatePlanetTelemetry(planetSpinGroup, tgtLabel, 1);
        renderer.render(scene, camera);
    }
    animate();
}

// 3秒延迟启动（完全保留）
window.addEventListener('load', () => {
    setTimeout(startMercuryAnimation, 3000);
});