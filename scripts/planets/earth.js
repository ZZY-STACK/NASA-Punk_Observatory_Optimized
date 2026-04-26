// ==========================================
// NASA-Punk Project: SOL-III (EARTH)
// 质感升级：140万陆地粒子 + 加厚海洋云层 | 完美同步面板
// ==========================================

// --- PART 1: 基础观测背景 (SOL-III / Terra) ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100
});
sharedTopoBackground.resize();

// 预先创建全局变量，避免重复创建对象
let tempVector = new THREE.Vector3();
let tempColor = new THREE.Color();

// ==========================================
// PART 2: Three.js 3D 场景
// ==========================================
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

// [CONFIG] 初始相机距离
const INITIAL_ZOOM = 25;
camera.position.z  = INITIAL_ZOOM;

const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比以提高性能
document.getElementById('canvas-container').appendChild(renderer.domElement);

// UI 元素引用
const tgtLabel = document.querySelector('.monitor-label.label-bottom');

// 1. 全局容器
const group = new THREE.Group();
scene.add(group);

// 2. 倾角容器 (Earth Tilt ~23.44 deg)
const earthTiltGroup      = new THREE.Group();
group.add(earthTiltGroup);

// 3. 自转容器
const earthSystemGroup = new THREE.Group();
earthTiltGroup.add(earthSystemGroup);

// 4. LEO 轨道容器
const leoGroup = new THREE.Group();
earthTiltGroup.add(leoGroup);

// 5. 月球容器
const moonSystemGroup      = new THREE.Group();
moonSystemGroup.rotation.z = 5.14 * (Math.PI / 180);
group.add(moonSystemGroup);

// 地球轴倾斜（绕 x 轴，即赤道面相对于轨道平面的真实倾斜）
earthTiltGroup.rotation.x = 23.44 * (Math.PI / 180);

// ===================== 全局配置 =====================
const MAX_HOURS = 70000;         // 最大在轨小时
// 动态调整粒子数量（根据设备性能）
const MAX_LAND_PARTICLES = navigator.hardwareConcurrency > 4 ? 1400000 : 700000;
let currentLandParticleCount = 0; // 当前粒子数
let currentHours = 0; // 全局时间，从0开始
let earthLandGeo, earthLandPos, earthLandColors; // 地球粒子全局引用
// =====================================================

const LAND_MASK_WIDTH  = 1024;
const LAND_MASK_HEIGHT = 512;
let landMaskData = null;

// 年份分段数据 - 保持原始数据
const segments = [
    { value: 0,      year: "2002" },
    { value: 21,     year: "2003" },
    { value: 1000,   year: "2015" },
    { value: 1792,   year: "2016" },
    { value: 8416,   year: "2021" },
    { value: 17104,  year: "2022" },
    { value: 25840,  year: "2023" },
    { value: 34576,  year: "2024" },
    { value: 62008,  year: "2025" },
    { value: 70000,  year: "2026.04" }
];

// 获取当前年份 - 改进版本，特别处理2003-2015年间的平滑过渡
function getCurrentYear(val) {
    // 特别处理：如果等于最大小时数，强制返回最终年份
    if (val >= MAX_HOURS) {
        return "2026.04";
    }
    
    // 对于2003-2015年区间，进行插值计算，让年份平滑过渡
    if (val >= 21 && val <= 1000) {
        // 从2003年（21小时）到2015年（1000小时）之间平滑过渡
        const ratio = (val - 21) / (1000 - 21);
        const totalYears = 12; // 2003-2015共12年
        const interpolatedYear = 2003 + Math.floor(ratio * totalYears);
        return interpolatedYear.toString();
    }
    
    if (val > 1000 && val <= 1792) {
        // 2015-2016年
        const ratio = (val - 1000) / (1792 - 1000);
        if (ratio < 0.5) return "2015";
        else return "2016";
    }
    
    if (val > 1792 && val <= 8416) {
        // 2016-2021年 (5年)
        const ratio = (val - 1792) / (8416 - 1792);
        const years = ["2016", "2017", "2018", "2019", "2020", "2021"];
        const index = Math.min(Math.floor(ratio * years.length), years.length - 1);
        return years[index];
    }
    
    if (val > 8416 && val <= 17104) {
        // 2021-2022年
        const ratio = (val - 8416) / (17104 - 8416);
        if (ratio < 0.5) return "2021";
        else return "2022";
    }
    
    if (val > 17104 && val <= 25840) {
        // 2022-2023年
        const ratio = (val - 17104) / (25840 - 17104);
        if (ratio < 0.5) return "2022";
        else return "2023";
    }
    
    if (val > 25840 && val <= 34576) {
        // 2023-2024年
        const ratio = (val - 25840) / (34576 - 25840);
        if (ratio < 0.5) return "2023";
        else return "2024";
    }
    
    if (val > 34576 && val <= 62008) {
        // 2024-2025年
        const ratio = (val - 34576) / (62008 - 34576);
        if (ratio < 0.5) return "2024";
        else return "2025";
    }
    
    if (val > 62008 && val < MAX_HOURS) {
        // 2025-2026年
        const ratio = (val - 62008) / (MAX_HOURS - 62008);
        if (ratio < 0.8) return "2025";
        else return "2026";
    }
    
    // 按常规逻辑查找
    for (let i = segments.length - 1; i >= 0; i--) {
        if (val >= segments[i].value) return segments[i].year;
    }
    
    return "2002";
}

function projectGeoToMaskXY(lon, lat)
{
    const x = Math.floor(((lon + 180) / 360) * LAND_MASK_WIDTH);
    const y = Math.floor(((90 - lat) / 180) * LAND_MASK_HEIGHT);

    return {
        x: ((x % LAND_MASK_WIDTH) + LAND_MASK_WIDTH) % LAND_MASK_WIDTH,
        y: Math.min(LAND_MASK_HEIGHT - 1, Math.max(0, y))
    };
}

// 异步加载陆地掩码数据
async function loadLandMask()
{
    try
    {
        const response = await fetch('./ne_50m_land.geojson');
        const geojson  = await response.json();
        const canvas   = document.createElement('canvas');
        canvas.width   = LAND_MASK_WIDTH;
        canvas.height  = LAND_MASK_HEIGHT;
        const ctx      = canvas.getContext('2d');

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, LAND_MASK_WIDTH, LAND_MASK_HEIGHT);
        ctx.fillStyle = '#fff';

        function drawPolygon(coordinates)
        {
            coordinates.forEach(ring =>
            {
                for (let i = 0; i < ring.length; i++)
                {
                    const [lon, lat] = ring[i];
                    const point      = projectGeoToMaskXY(lon, lat);

                    if (i === 0)
                    {
                        ctx.beginPath();
                        ctx.moveTo(point.x, point.y);
                    }
                    else
                    {
                        ctx.lineTo(point.x, point.y);
                    }
                }

                ctx.closePath();
                ctx.fill();
            });
        }

        for (const feature of geojson.features || [])
        {
            const geometry = feature.geometry;
            if (!geometry) continue;

            if (geometry.type === 'Polygon')
            {
                drawPolygon(geometry.coordinates);
            }
            else if (geometry.type === 'MultiPolygon')
            {
                geometry.coordinates.forEach(drawPolygon);
            }
        }

        landMaskData = ctx.getImageData(0, 0, LAND_MASK_WIDTH, LAND_MASK_HEIGHT).data;
        console.log('Land mask loaded successfully');
    }
    catch (error)
    {
        console.warn('Earth land mask load failed:', error);
    }
}

function isLandCoord(lat, lon)
{
    if (!landMaskData) return false;

    const coord = projectGeoToMaskXY(lon, lat);
    const index = (coord.y * LAND_MASK_WIDTH + coord.x) * 4;
    return landMaskData[index] > 128;
}

// ===================== 数据驱动同步机制 - 平衡增长 =====================
let animationStartTime = null;

// 缓存DOM元素以提高性能
let dashboardElements = null;

function initializeDashboardElements() {
    if (!dashboardElements) {
        dashboardElements = {
            year: document.getElementById('year'),
            hours: document.getElementById('hours'),
            particle: document.getElementById('particle')
        };
    }
}

function updateDashboard() {
    if (!dashboardElements) {
        // 只在首次访问时初始化，避免重复DOM查询
        dashboardElements = {
            year: document.getElementById('year'),
            hours: document.getElementById('hours'),
            particle: document.getElementById('particle')
        };
    }
    
    if (dashboardElements.year) {
        dashboardElements.year.textContent = getCurrentYear(currentHours);
    }
    if (dashboardElements.hours) {
        dashboardElements.hours.textContent = currentHours.toLocaleString();
    }
    if (dashboardElements.particle) {
        dashboardElements.particle.textContent = currentLandParticleCount.toLocaleString();
    }
}

// 以小时为基准，根据小时数计算对应的粒子数量
function getParticleCountByHours(hours) {
    return Math.floor((hours / MAX_HOURS) * MAX_LAND_PARTICLES);
}

// 分阶段控制增长速率的函数 - 2002-2016阶段稍微放慢
function calculateProgressWithDetailedStages(rawProgress) {
    if (rawProgress <= 0.4) {
        // 2002-2016 (前40%时间): 比原来慢一些，增长到约15%
        const stageProgress = rawProgress / 0.4; // 映射到0-1
        
        if (stageProgress <= 0.1) {
            // 2002-2003: 增长到0.5%
            return stageProgress * 0.1 * 0.05;
        } else if (stageProgress <= 0.8) {
            // 2003-2015: 从0.5%增长到12%
            return 0.005 + (stageProgress - 0.1) * 0.7 * (0.115 / 0.7);
        } else {
            // 2015-2016: 从12%增长到15%
            return 0.12 + (stageProgress - 0.8) * 0.2 * 0.03;
        }
    } else {
        // 2016-2026 (后60%时间): 从15%增长到100%
        const remainingProgress = (rawProgress - 0.4) / 0.6; // 映射到0-1
        return 0.15 + remainingProgress * 0.85; // 从15%增长到100%
    }
}

function timeDrivenSync(timestamp) {
    // 只在第一次调用时设置开始时间
    if (animationStartTime === null) {
        animationStartTime = timestamp;
    }
    
    // 计算经过的时间（毫秒）
    const elapsed = timestamp - animationStartTime;
    
    // 设定总动画时间为20秒（适当延长动画时间）
    const totalDuration = 18000; // 20秒
    let rawProgress = Math.min(elapsed / totalDuration, 1);
    
    // 应用详细分阶段控制的增长速率
    const progress = calculateProgressWithDetailedStages(rawProgress);
    
    // 根据时间进度计算目标小时数
    const targetHours = Math.floor(MAX_HOURS * progress);
    
    // 根据小时数计算对应的粒子数量
    const targetParticleCount = getParticleCountByHours(targetHours);
    
    // 平滑增加粒子数量，减小增量
    if (currentLandParticleCount < targetParticleCount) {
        // 更平滑的增量计算
        const increment = Math.max(1000, Math.ceil((targetParticleCount - currentLandParticleCount) / 10));
        currentLandParticleCount = Math.min(currentLandParticleCount + increment, targetParticleCount);
    }
    
    // 平滑增加小时数
    if (currentHours < targetHours) {
        const hourIncrement = Math.ceil((targetHours - currentHours) / 5); // 减小增量
        currentHours = Math.min(currentHours + hourIncrement, targetHours);
    }
    
    // 同步更新粒子渲染
    if (earthLandPos && earthLandColors && earthLandGeo) {
        earthLandGeo.setDrawRange(0, currentLandParticleCount);
    }
    
    // 同步更新数据面板
    updateDashboard();
    
    // 如果动画未完成，继续执行
    if (rawProgress < 1) {
        requestAnimationFrame(timeDrivenSync);
    } else {
        // 动画完成后的处理 - 强制设置最终值
        currentHours = MAX_HOURS;
        currentLandParticleCount = MAX_LAND_PARTICLES;
        
        // 更新粒子渲染
        if (earthLandPos && earthLandColors && earthLandGeo) {
            earthLandGeo.setDrawRange(0, currentLandParticleCount);
        }
        
        // 强制更新数据面板到最终值
        updateDashboard();
        
        console.log('Particle generation complete: Earth visualization ready');
        console.log(`Final values - Hours: ${currentHours}, Particles: ${currentLandParticleCount}, Year: ${getCurrentYear(currentHours)}`);
    }
}

// --- A. 程序化地球 - 异步生成 ---
let earthGenerationPromise = null;

function createEarthAsync()
{
    return new Promise((resolve) => {
        // 使用更少的粒子进行初始加载，然后逐步增加
        const landParticles = MAX_LAND_PARTICLES;
        const landPos       = new Float32Array(landParticles * 3); // 使用TypedArray优化内存
        const landColors    = new Float32Array(landParticles * 3);
        const boundaryPos   = [];
        const boundaryCols  = [];
        const noiseGen      = new SimplexNoise('seed-terra-firma-v2');
        const useLandMask   = landMaskData !== null;

        const colLandBase = new THREE.Color('#7fbf77');
        const colLandHigh = new THREE.Color('#cde7a6');
        const colOcean    = new THREE.Color('#2a557a');
        const colPeak     = new THREE.Color('#f2f8d5');
        const colBoundary  = new THREE.Color('#b7e6a4');

        // 预生成所有粒子数据 - 分批处理避免阻塞
        const maxLandTries = landParticles * 6;
        let landCount = 0;
        let sampleTries = 0;
        const rBase = 5.0;
        
        // 分批处理，每次处理10000个粒子
        const batchSize = 10000;
        
        function processBatch() {
            const batchEnd = Math.min(landCount + batchSize, landParticles);
            let processedInBatch = 0;
            
            while (landCount < batchEnd && sampleTries < maxLandTries && processedInBatch < batchSize)
            {
                sampleTries++;
                const theta = Math.random() * Math.PI * 2;
                const phi   = Math.acos(2 * Math.random() - 1);

                const x = rBase * Math.sin(phi) * Math.cos(theta);
                const y = rBase * Math.sin(phi) * Math.sin(theta);
                const z = rBase * Math.cos(phi);

                const lat = Math.asin(z / rBase) * (180 / Math.PI);
                const lon = Math.atan2(y, x) * (180 / Math.PI);

                if (useLandMask && !isLandCoord(lat, lon))
                {
                    processedInBatch++;
                    continue;
                }

                let n = 0;
                n += noiseGen.noise3D(x * 0.15, y * 0.15, z * 0.15) * 1.2;
                n += noiseGen.noise3D(x * 0.6, y * 0.6, z * 0.6) * 0.25;

                if (useLandMask || n > 0.1)
                {
                    let h = (n - 0.1) * 1.2;
                    const reliefScale = 0.06;
                    const rMod = rBase + (Math.max(0, h) * reliefScale);
                    const scale = rMod / rBase;
                    
                    landPos[landCount * 3] = x * scale;
                    landPos[landCount * 3 + 1] = y * scale;
                    landPos[landCount * 3 + 2] = z * scale;

                    let c = tempColor; // 复用对象
                    if (h < 0.5)
                    {
                        c.copy(colLandBase).lerp(colLandHigh, h / 0.5);
                    }
                    else
                    {
                        c.copy(colLandHigh).lerp(colPeak, Math.min(1, (h - 0.5) * 2.0));
                    }
                    
                    landColors[landCount * 3] = c.r;
                    landColors[landCount * 3 + 1] = c.g;
                    landColors[landCount * 3 + 2] = c.b;
                    
                    landCount++;
                }
                
                processedInBatch++;
            }

            if (landCount < landParticles && sampleTries < maxLandTries) {
                // 继续下一批
                setTimeout(processBatch, 0); // 让出控制权，避免阻塞
            } else {
                // 生成完成，创建Three.js对象
                const geo = new THREE.BufferGeometry();
                const mat = new THREE.PointsMaterial({
                    size        : 0.045,
                    vertexColors: true,
                    transparent : true,
                    opacity     : 0.9
                });
                const points = new THREE.Points(geo, mat);
                earthSystemGroup.add(points);
                geo.setAttribute('position', new THREE.BufferAttribute(landPos, 3));
                geo.setAttribute('color', new THREE.BufferAttribute(landColors, 3));
                geo.setDrawRange(0, 0);

                const boundaryGeo = new THREE.BufferGeometry();
                const boundaryMat = new THREE.PointsMaterial({
                    size           : 0.055,
                    vertexColors   : true,
                    transparent    : true,
                    opacity        : 0.85,
                    blending       : THREE.AdditiveBlending,
                    depthWrite     : false
                });
                const boundaryPoints = new THREE.Points(boundaryGeo, boundaryMat);
                earthSystemGroup.add(boundaryPoints);

                if (boundaryPos.length > 0)
                {
                    boundaryGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(boundaryPos), 3));
                    boundaryGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(boundaryCols), 3));
                }

                // 海洋层
                const oceanGroup = new THREE.Group();
                earthSystemGroup.add(oceanGroup);

                function createOceanLayer()
                {
                    // 海洋粒子升级：30万→60万
                    const oceanParticles = 600000;
                    const oceanPos       = new Float32Array(oceanParticles * 3);
                    const oceanColors    = new Float32Array(oceanParticles * 3);
                    const oceanNoise     = new SimplexNoise('ocean-shell-v1');
                    const colOceanBase   = new THREE.Color('#1f4f7a');
                    const colOceanLight  = new THREE.Color('#6fb8ed');

                    for (let i = 0; i < oceanParticles; i++)
                    {
                        const r     = 4.95 + Math.random() * 0.04;
                        const theta = Math.random() * Math.PI * 2;
                        const phi   = Math.acos(2 * Math.random() - 1);
                        const x     = r * Math.sin(phi) * Math.cos(theta);
                        const y     = r * Math.sin(phi) * Math.sin(theta);
                        const z     = r * Math.cos(phi);

                        let n = oceanNoise.noise3D(x * 0.2, y * 0.2, z * 0.2);
                        n += 0.4 * oceanNoise.noise3D(x * 1.0, y * 1.0, z * 1.0);
                        n = (n + 1) / 2;

                        let c = new THREE.Color();
                        c.copy(colOceanBase).lerp(colOceanLight, Math.min(1, Math.max(0, n * 1.1)));
                        oceanPos[i * 3] = x;
                        oceanPos[i * 3 + 1] = y;
                        oceanPos[i * 3 + 2] = z;
                        oceanColors[i * 3] = c.r;
                        oceanColors[i * 3 + 1] = c.g;
                        oceanColors[i * 3 + 2] = c.b;
                    }

                    const oceanGeo = new THREE.BufferGeometry();
                    const oceanMat = new THREE.PointsMaterial({
                        size        : 0.04,
                        vertexColors: true,
                        transparent : true,
                        opacity     : 0.82
                    });
                    const oceanPoints = new THREE.Points(oceanGeo, oceanMat);
                    oceanGroup.add(oceanPoints);
                    oceanGeo.setAttribute('position', new THREE.BufferAttribute(oceanPos, 3));
                    oceanGeo.setAttribute('color', new THREE.BufferAttribute(oceanColors, 3));
                    oceanGeo.setDrawRange(0, 0);

                    let oceanIndex = 0;
                    let oceanFrame = 0;
                    const oceanBatchStart = 300;
                    const oceanBatchSlope = 10;
                    const oceanBatchMax = 700;

                    function addOceanParticles()
                    {
                        oceanFrame++;
                        const oceanBatch = Math.min(oceanBatchMax, oceanBatchStart + oceanFrame * oceanBatchSlope);
                        const endIndex = Math.min(oceanIndex + oceanBatch, oceanParticles);
                        oceanGeo.setDrawRange(0, endIndex);

                        oceanIndex = endIndex;

                        if (oceanIndex < oceanParticles)
                        {
                            requestAnimationFrame(addOceanParticles);
                        }
                    }

                    addOceanParticles();
                }

                // 直接创建海洋层（去掉延迟）
                createOceanLayer();

                // 地球网格 (彻底隐藏)
                const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.0, 24, 24));
                const wireMat = new THREE.LineBasicMaterial({
                    color: 0x3b4e6b,
                    visible: false
                });
                const wireframe = new THREE.LineSegments(wireGeo, wireMat);
                earthSystemGroup.add(wireframe);

                // ===================== 全局赋值 =====================
                earthLandGeo = geo;
                earthLandPos = landPos;
                earthLandColors = landColors;
                // =====================================================

                // 初始化粒子：从0开始
                currentLandParticleCount = 0;
                earthLandGeo.setDrawRange(0, 0);
                
                console.log('Earth generation completed');
                resolve(); // 完成promise
            }
        }
        
        // 开始处理第一批
        setTimeout(processBatch, 0);
    });
}

// 异步加载和初始化
async function initializeScene() {
    console.log('Starting scene initialization...');
    
    // 先加载陆地掩码
    await loadLandMask();
    console.log('Land mask loaded');
    
    // 异步生成地球
    await createEarthAsync();
    console.log('Earth created');
    
    // 直接创建其他元素（去掉所有延迟）
    createClouds();
    createLEOSatellites();
    createMoon();
    console.log('All elements created, starting animation...');
    
    // 立即启动动画
    requestAnimationFrame(timeDrivenSync);
}

// --- B. 云层 ---
const cloudGroup = new THREE.Group();
earthSystemGroup.add(cloudGroup);

function createClouds()
{
    // 云层粒子升级：60万→90万
    const cloudParticles = 900000;
    const cloudPos       = new Float32Array(cloudParticles * 3);
    const cloudGen       = new SimplexNoise('cloud-layer-v3');
    let validCount       = 0;

    for (let i = 0; i < cloudParticles; i++)
    {
        const r     = 5 + 0.2 + Math.random() * 0.1;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);

        let n = cloudGen.noise3D(x * 0.15, y * 0.1, z * 0.15);
        n += 0.4 * cloudGen.noise3D(x * 0.8, y * 0.8, z * 0.8);

        if (n > 0.3)
        {
            cloudPos[validCount * 3] = x;
            cloudPos[validCount * 3 + 1] = y;
            cloudPos[validCount * 3 + 2] = z;
            validCount++;
        }
    }

    const geo = new THREE.BufferGeometry();
    const mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.06, transparent: true, opacity: 0.35
    });
    const points = new THREE.Points(geo, mat);
    cloudGroup.add(points);
    geo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
    geo.setDrawRange(0, 0);

    let currentIndex = 0;
    let cloudFrame = 0;
    const cloudBatchStart = 150;
    const cloudBatchSlope = 4;
    const cloudBatchMax = 500;

    function addCloudParticles()
    {
        cloudFrame++;
        const batchSize = Math.min(cloudBatchMax, cloudBatchStart + cloudFrame * cloudBatchSlope);
        const endIndex = Math.min(currentIndex + batchSize, validCount);
        geo.setDrawRange(0, endIndex);

        currentIndex = endIndex;

        if (currentIndex < validCount)
        {
            requestAnimationFrame(addCloudParticles);
        }
    }

    addCloudParticles();
}


// --- C. LEO 卫星群 ---
const leoSats = [];

function createLEOSatellites()
{
    const colors       = [0xffffff, 0xe06236, 0x7da5c6, 0xffffff];
    const radii        = [6.0, 6.5, 5.8, 7.0];
    const speeds       = [0.005, -0.003, 0.006, 0.002];
    const inclinations = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 6];

    for (let i = 0; i < 4; i++)
    {
        const orbitContainer      = new THREE.Group();
        orbitContainer.rotation.z = inclinations[i];
        leoGroup.add(orbitContainer);

        const curve    = new THREE.EllipseCurve(0, 0, radii[i], radii[i], 0, 2 * Math.PI, false, 0);
        const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
        const line     = new THREE.Line(geometry, new THREE.LineDashedMaterial({
            color: colors[i], opacity: 0.15, transparent: true, dashSize: 0.3, gapSize: 0.3
        }));
        line.computeLineDistances();
        line.rotation.x = Math.PI / 2;
        orbitContainer.add(line);

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), new THREE.MeshBasicMaterial({color: colors[i]}));
        orbitContainer.add(mesh);
        leoSats.push({mesh: mesh, radius: radii[i], speed: speeds[i], angle: Math.random() * Math.PI * 2});
    }
}


// --- D. 月球 ---
const moonBodyGroup = new THREE.Group();
moonSystemGroup.add(moonBodyGroup);
let moonAngle    = 0;
const moonRadius = 8.5;

function createMoon()
{
    // 轨道线
    const curve     = new THREE.EllipseCurve(0, 0, moonRadius, moonRadius, 0, 2 * Math.PI, false, 0);
    const geometry  = new THREE.BufferGeometry().setFromPoints(curve.getPoints(128));
    const orbitLine = new THREE.Line(geometry, new THREE.LineDashedMaterial({
        color: 0xaaaaaa, opacity: 0.08, transparent: true, dashSize: 0.5, gapSize: 0.5
    }));
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 2;
    moonSystemGroup.add(orbitLine);

    // 月球点云
    const moonParticles = 1200;
    const mPos          = new Float32Array(moonParticles * 3);
    const mColors       = new Float32Array(moonParticles * 3);
    const moonGen       = new SimplexNoise('luna-v2-refined');

    const colMaria    = new THREE.Color('#1f242b');
    const colHigh     = new THREE.Color('#e6e8eb');
    const colRegolith = new THREE.Color('#7a7e85');

    for (let i = 0; i < moonParticles; i++)
    {
        const r     = 0.8;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);
        
        mPos[i * 3] = x;
        mPos[i * 3 + 1] = y;
        mPos[i * 3 + 2] = z;

        let n       = moonGen.noise3D(x * 2.5, y * 2.5, z * 2.5);
        let nDetail = moonGen.noise3D(x * 6.0, y * 6.0, z * 6.0) * 0.3;
        let val     = (n + nDetail + 1) / 2;
        let c       = tempColor; // 复用对象
        
        if (val < 0.45)
        {
            c.copy(colMaria).lerp(colRegolith, val / 0.45);
        }
        else
        {
            c.copy(colRegolith).lerp(colHigh, (val - 0.45) / 0.55);
        }
        
        mColors[i * 3] = c.r;
        mColors[i * 3 + 1] = c.g;
        mColors[i * 3 + 2] = c.b;
    }

    const moonGeo = new THREE.BufferGeometry();
    moonGeo.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
    moonGeo.setAttribute('color', new THREE.Float32BufferAttribute(mColors, 3));
    const moonPoints = new THREE.Points(moonGeo, new THREE.PointsMaterial({
        size: 0.045, vertexColors: true, transparent: true, opacity: 1.0
    }));
    moonBodyGroup.add(moonPoints);

    // 月球网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(0.8, 16, 16));
    const wireMat = new THREE.LineBasicMaterial({color: 0x5d6d7e, transparent: true, opacity: 0.15});
    moonBodyGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}


// ==========================================
// PART 4: 交互与动画 (Interaction & Animation)
// ==========================================

// 简化交互模块，避免依赖外部函数
function initInteraction(group, initialZoom) {
    // 基础交互逻辑
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    window.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };

        group.rotation.y += deltaMove.x * 0.005;
        group.rotation.x += deltaMove.y * 0.005;

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    window.addEventListener('wheel', (e) => {
        camera.position.z += e.deltaY * 0.01;
        camera.position.z = Math.max(10, Math.min(50, camera.position.z));
    });
}

function updateInteraction(group, camera) {
    // 空实现，避免依赖外部函数
}

// 初始化交互模块
initInteraction(group, INITIAL_ZOOM);

// [NEW] 初始相机倾角设置
group.rotation.x = -0.9;
group.rotation.y = 0.0;

function animate()
{
    requestAnimationFrame(animate);

    // 1. 地球自转
    earthSystemGroup.rotation.z += 0.0015;

    // 2. 云层差速
    cloudGroup.rotation.z += 0.0005;

    // 3. LEO 卫星动画
    leoSats.forEach(sat =>
    {
        sat.angle += sat.speed;
        sat.mesh.position.x = sat.radius * Math.cos(sat.angle);
        sat.mesh.position.z = sat.radius * Math.sin(sat.angle);
        sat.mesh.rotation.y += 0.02;
        sat.mesh.rotation.z = -sat.angle;
    });

    // 4. 月球公转 & 自转
    moonAngle += 0.0002;
    moonBodyGroup.position.x = moonRadius * Math.cos(moonAngle);
    moonBodyGroup.position.z = moonRadius * Math.sin(moonAngle);
    moonBodyGroup.rotation.y = moonAngle;

    updateInteraction(group, camera);

    renderer.render(scene, camera);
}

// 开始初始化
initializeScene().then(() => {
    animate();
});