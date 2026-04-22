// ==========================================
// NASA-Punk Project: JUPITER
//  数据联动：中国深空探测累计飞行里程 → 木星粒子数
// ==========================================

//  核心同步配置
const MAX_MILEAGE = 6.5; // 最终累计飞行里程（亿公里）
const MAX_JUPITER_PARTICLE = 650000; // 6.5亿公里 → 65万粒子
const PARTICLE_PER_MILEAGE = 100000; // 1亿公里 = 100000粒子

//  中国深空探测官方时间分段（严格匹配LaTeX表格）
const jupiterSegments = [
  { mileage: 0.018, date: "2007.10.24" },
  { mileage: 0.038, date: "2013.12.14" },
  { mileage: 0.076, date: "2020.12.17" },
  { mileage: 4.876, date: "2021.05.15" },
  { mileage: 5.676, date: "2024.06.25" },
  { mileage: 6.500, date: "2026.04.15" }
];

// 全局共享数据
window.currentJupiterMileage = 0.018;

// --- PART 1: 基础观测背景 ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 800
});
sharedTopoBackground.resize();

// ==========================================
// PART 2: Three.js 场景初始化
// ==========================================
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

let currentZoom    = 38;
const INITIAL_ZOOM = 38;
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

// 场景层级结构
const group = new THREE.Group();
scene.add(group);

// 1. 倾角容器 (木星轴倾角 3.13度)
const jupiterTiltGroup      = new THREE.Group();
jupiterTiltGroup.rotation.z = 3.13 * (Math.PI / 180);
group.add(jupiterTiltGroup);

// 2. 自转容器 (用于木星本体)
const jupiterSpinGroup = new THREE.Group();
jupiterTiltGroup.add(jupiterSpinGroup);

// 3. 大红斑独立容器 (用于模拟独立漂移)
const redSpotGroup = new THREE.Group();
jupiterSpinGroup.add(redSpotGroup);

// 4. 卫星容器
const moonGroup = new THREE.Group();
jupiterTiltGroup.add(moonGroup);

// --- 数据联动工具函数 ---
function dateToTimestamp(str) {
  const [y, m, d] = str.split('.');
  return new Date(y, m - 1, d).getTime();
}

// 根据粒子数计算当前里程+时间
function getCurrentJupiterData(currentParticle) {
  const currentMileage = Math.min(MAX_MILEAGE, parseFloat((currentParticle / PARTICLE_PER_MILEAGE).toFixed(3)));
  for (let i = 0; i < jupiterSegments.length - 1; i++) {
    const s = jupiterSegments[i];
    const e = jupiterSegments[i + 1];
    if (currentMileage >= s.mileage && currentMileage <= e.mileage) {
      const rate = (currentMileage - s.mileage) / (e.mileage - s.mileage);
      const sTime = dateToTimestamp(s.date);
      const eTime = dateToTimestamp(e.date);
      const curTime = sTime + (eTime - sTime) * rate;
      const date = new Date(curTime);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return {
        date: `${y}.${m}.${d}`,
        mileage: currentMileage
      };
    }
  }
  return { date: "2026.04.15", mileage: MAX_MILEAGE };
}

// --- PART 3: 程序化木星主体 ---
let jupiterSurface, jupiterAtmos;
const ringUniforms = {
    uTime: { value: 0.0 }
};

function createJupiter()
{
    const noiseGen = new SimplexNoise('jupiter-ultimate-final');

    // ==========================================
    // Layer 1: 底层对流层（固定105万粒子）
    // ==========================================
    const particleCount = MAX_JUPITER_PARTICLE;
    const positions     = [];
    const colors        = [];

    const colZoneLight = new THREE.Color('#f0e2c2'); // 氨冰白
    const colZoneDark  = new THREE.Color('#d6c7a5'); // 奶油基底
    const colBeltBase  = new THREE.Color('#c28266'); // 浅赭石
    const colBeltDeep  = new THREE.Color('#8a3f2d'); // 氧化铁红
    const colPolar     = new THREE.Color('#787878'); // 极地灰

    for (let i = 0; i < particleCount; i++)
    {
        const r = 6.45 + Math.random() * 0.1;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions.push(x, y, z);

        let lat          = y / 6.5;
        let latNonLinear = Math.sign(lat) * Math.pow(Math.abs(lat), 1.4);
        let noiseBase = noiseGen.noise3D(x * 1.0, y * 0.3, z * 1.0);
        let signal    = Math.sin(latNonLinear * 12.0 + noiseBase * 1.2);

        let c    = new THREE.Color();
        let dist = Math.abs(lat);

        if (dist > 0.85) {
            c.copy(colZoneDark).lerp(colPolar, (dist - 0.85) * 4.0);
            c.multiplyScalar(0.9 + Math.random() * 0.2);
        } else {
            if (signal > 0.1) {
                let brightness = (dist < 0.15) ? 1.0 : signal;
                c.copy(colZoneDark).lerp(colZoneLight, brightness * 0.8);
                if (noiseBase > 0.6) c.lerp(colBeltBase, 0.15);
            } else {
                let depth = Math.abs(signal);
                if (dist > 0.15 && dist < 0.45) {
                    c.copy(colBeltBase).lerp(colBeltDeep, depth * 0.8 + 0.2);
                } else {
                    c.copy(colBeltBase).lerp(colBeltDeep, depth * 0.5);
                }
            }
        }

        let depthFactor = (r - 6.45) / 0.1;
        c.multiplyScalar(0.8 + depthFactor * 0.4);
        colors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    const mat = new THREE.PointsMaterial({
        size           : 0.07,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });

    jupiterSurface = new THREE.Points(geo, mat);
    jupiterSpinGroup.add(jupiterSurface);

    let jupiterSurfaceIndex = 0;
    let jupiterSurfaceFrame = 0;
    let startTime = Date.now();
    const jupiterSurfaceBatchStart = 300;
    const jupiterSurfaceBatchSlope = 50;
    const jupiterSurfaceBatchMax = 4000;

    function addJupiterSurfaceParticles()
    {
        jupiterSurfaceFrame += 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = jupiterSurfaceBatchStart * speedFactor;
        const adjustedBatchSlope = jupiterSurfaceBatchSlope * speedFactor;
        const adjustedBatchMax = jupiterSurfaceBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + jupiterSurfaceFrame * adjustedBatchSlope);
        const endIndex = Math.min(jupiterSurfaceIndex + batchSize, positions.length / 3);
        const posArray = positions.slice(0, endIndex * 3);
        const colArray = colors.slice(0, endIndex * 3);

        geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

        jupiterSurfaceIndex = endIndex;

        //  数据联动更新面板
        const dataInfo = getCurrentJupiterData(jupiterSurfaceIndex);
        window.currentJupiterMileage = dataInfo.mileage;
        document.getElementById('jupiter-time').innerText = dataInfo.date;
        document.getElementById('jupiter-mileage').innerText = dataInfo.mileage;
        document.getElementById('jupiter-particle').innerText = jupiterSurfaceIndex.toLocaleString();

        if (jupiterSurfaceIndex < positions.length / 3) {
            requestAnimationFrame(addJupiterSurfaceParticles);
        }
    }
    addJupiterSurfaceParticles();

    // ==========================================
    // Layer 2: 平流层薄雾
    // ==========================================
    const atmosCount = 120000;
    const atmosPos   = [];
    const atmosCol   = [];
    const colHaze = new THREE.Color('#ffffff');
    const colGold = new THREE.Color('#ffcc00');

    for (let i = 0; i < atmosCount; i++)
    {
        const r = 6.6 + Math.random() * 0.2;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        atmosPos.push(x, y, z);
        let c = colHaze.clone().lerp(colGold, 0.2);
        atmosCol.push(c.r, c.g, c.b);
    }

    const atmosGeo = new THREE.BufferGeometry();
    const atmosMat = new THREE.PointsMaterial({
        size           : 0.1,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.25,
        sizeAttenuation: true,
        blending       : THREE.AdditiveBlending,
        depthWrite     : false
    });

    jupiterAtmos = new THREE.Points(atmosGeo, atmosMat);
    jupiterSpinGroup.add(jupiterAtmos);

    let jupiterAtmosIndex = 0;
    let jupiterAtmosFrame = 0;
    let atmosStartTime = Date.now();
    const jupiterAtmosBatchStart = 300;
    const jupiterAtmosBatchSlope = 50;
    const jupiterAtmosBatchMax = 3500;

    function addJupiterAtmosParticles()
    {
        jupiterAtmosFrame += 1;
        const elapsed = (Date.now() - atmosStartTime) / 1000;
        const speedFactor = elapsed < 3 ? 0.1 : 1.0;
        const adjustedBatchStart = jupiterAtmosBatchStart * speedFactor;
        const adjustedBatchSlope = jupiterAtmosBatchSlope * speedFactor;
        const adjustedBatchMax = jupiterAtmosBatchMax * speedFactor;
        
        const batchSize = Math.min(adjustedBatchMax, adjustedBatchStart + jupiterAtmosFrame * adjustedBatchSlope);
        const endIndex = Math.min(jupiterAtmosIndex + batchSize, atmosPos.length / 3);
        const posArray = atmosPos.slice(0, endIndex * 3);
        const colArray = atmosCol.slice(0, endIndex * 3);

        atmosGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
        atmosGeo.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

        jupiterAtmosIndex = endIndex;
        if (jupiterAtmosIndex < atmosPos.length / 3) {
            requestAnimationFrame(addJupiterAtmosParticles);
        }
    }
    addJupiterAtmosParticles();

    // 坐标网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(6.6, 24, 12));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#c29b61',
        transparent: true,
        opacity    : 0.04
    });
    jupiterSpinGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

// --- PART 4: 独立动态大红斑 ---
let redSpotMesh;
function createGreatRedSpot() {
    redSpotGroup.clear();
    const particleCount = 3500;
    const positions     = [];
    const colors        = [];
    const particlesData = [];
    const noiseGen      = new SimplexNoise('grs-vortex-final');

    const colCore  = new THREE.Color('#8a3f2d');
    const colEye   = new THREE.Color('#c25e40');
    const colSwirl = new THREE.Color('#e3dccb');
    const colMerge = new THREE.Color('#8c4e38');

    const spotLat    = -22 * (Math.PI / 180);
    const spotLon    = 0.5;
    const width      = 1.6;
    const height     = 1.0;
    const radiusBase = 6.5;

    for (let i = 0; i < particleCount; i++) {
        const t     = Math.random();
        const dist  = Math.pow(t, 0.6);
        const angle = Math.random() * Math.PI * 2;
        if (dist > 0.8 && Math.random() > 0.4) continue;

        const dLat = Math.sin(angle) * dist * 0.22 * height;
        const dLon = Math.cos(angle) * dist * 0.22 * width;
        const finalLat = spotLat + dLat;
        const finalLon = spotLon + dLon;
        const heightOffset = Math.cos(dist * Math.PI / 2) * 0.06;
        const r            = radiusBase + heightOffset;

        const pX = r * Math.cos(finalLat) * Math.sin(finalLon);
        const pY = r * Math.sin(finalLat);
        const pZ = r * Math.cos(finalLat) * Math.cos(finalLon);

        positions.push(pX, pY, pZ);
        let c = new THREE.Color();
        let n = noiseGen.noise3D(pX * 2.0, pY * 2.0, pZ * 2.0);
        let spiral = Math.sin(dist * 10.0 + angle * 2.0 + n * 2.0);

        if (dist < 0.7) {
            c.copy(colCore).lerp(colEye, n * 0.5 + 0.5);
            if (spiral > 0.6) c.lerp(colSwirl, 0.4);
        } else {
            let mergeFactor = (dist - 0.7) / 0.3;
            c.copy(colCore).lerp(colMerge, mergeFactor);
            c.multiplyScalar(1.0 - mergeFactor * 0.3);
        }
        colors.push(c.r, c.g, c.b);
        particlesData.push({ dist, angle, speed: (1.0 - dist) * 0.02 + 0.005, baseLat: spotLat, baseLon: spotLon, width, height, rBase: radiusBase });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
        size           : 0.05,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.9,
        sizeAttenuation: true
    });
    redSpotMesh = new THREE.Points(geo, mat);
    redSpotMesh.userData = { particles: particlesData };
    redSpotGroup.add(redSpotMesh);
}

// --- PART 5: 极暗陨石带 ---
function createFaintRings() {
    const ringGroup = new THREE.Group();
    jupiterSpinGroup.add(ringGroup);
    const particleCount = 7000;
    const positions = [];
    const colors = [];
    const innerR = 14.2;
    const outerR = 16.8;
    const colRockDark  = new THREE.Color('#333333');
    const colRockBrown = new THREE.Color('#4a3c31');

    for (let i = 0; i < particleCount; i++) {
        const t = Math.random();
        const r = innerR + Math.pow(t,1.2) * (outerR-innerR);
        const angle = Math.random() * Math.PI * 2;
        const x = r * Math.cos(angle);
        const z = r * Math.sin(angle);
        const y = (Math.random()-0.5)*0.12;
        positions.push(x,y,z);
        let c = colRockDark.clone().lerp(colRockBrown, Math.random());
        c.multiplyScalar(0.8 + Math.random()*0.4);
        colors.push(c.r,c.g,c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
    const mat = new THREE.PointsMaterial({
        size:0.06, vertexColors:true, transparent:true, opacity:0.6,
        sizeAttenuation:true, depthWrite:false
    });
    ringGroup.add(new THREE.Points(geo,mat));
}

// --- PART 6: 卫星系统 ---
const moons = [];
function createMoon(config) {
    const { name, radius, speed, size, color, type } = config;
    const satOrbit = new THREE.Group();
    satOrbit.rotation.y = Math.random() * Math.PI * 2;
    satOrbit.rotation.x = (Math.random()-0.5) * (type==='Major'?0.02:0.2);
    moonGroup.add(satOrbit);

    const geo = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,radius,radius,0,2*Math.PI).getPoints(128));
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color, transparent:true, opacity:type==='Major'?0.25:0.08, dashSize:0.3, gapSize:0.2
    }));
    line.computeLineDistances();
    line.rotation.x = Math.PI/2;
    satOrbit.add(line);

    const moonMeshGroup = new THREE.Group();
    moonMeshGroup.position.set(radius,0,0);
    satOrbit.add(moonMeshGroup);

    if(type==='Major'){
        const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(size,8,8));
        const wireMat = new THREE.LineBasicMaterial({color, transparent:true, opacity:0.4});
        moonMeshGroup.add(new THREE.LineSegments(wireGeo,wireMat));
        const pCount=200,pPos=[],pCol=[];
        const mNoise = new SimplexNoise(name);
        const baseColor = new THREE.Color(color);
        const darkColor = baseColor.clone().multiplyScalar(0.5);
        for(let i=0;i<pCount;i++){
            const theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
            const r=size*0.95,x=r*Math.sin(phi)*Math.cos(theta),y=r*Math.sin(phi)*Math.sin(theta),z=r*Math.cos(phi);
            pPos.push(x,y,z);
            let n=mNoise.noise3D(x*5,y*5,z*5);
            let c=baseColor.clone();
            if(n<0)c.lerp(darkColor,-n);
            pCol.push(c.r,c.g,c.b);
        }
        const mGeo=new THREE.BufferGeometry();
        mGeo.setAttribute('position',new THREE.Float32BufferAttribute(pPos,3));
        mGeo.setAttribute('color',new THREE.Float32BufferAttribute(pCol,3));
        moonMeshGroup.add(new THREE.Points(mGeo,new THREE.PointsMaterial({size:0.05,vertexColors:true})));
    }else{
        const geo=new THREE.IcosahedronGeometry(size,0);
        const mat=new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:0.5});
        moonMeshGroup.add(new THREE.Mesh(geo,mat));
    }
    moons.push({group:satOrbit,meshGroup:moonMeshGroup,speed,radius,angle:Math.random()*Math.PI*2});
}

//  封装卫星创建函数（统一延迟调用）
function createAllMoons() {
  // 卫星配置
  createMoon({name:"Metis",radius:6.7,speed:0.035,size:0.04,color:0xaa5555,type:'Minor'});
  createMoon({name:"Adrastea",radius:6.8,speed:0.034,size:0.03,color:0xaa5555,type:'Minor'});
  createMoon({name:"Amalthea",radius:7.0,speed:0.030,size:0.06,color:0xcc6666,type:'Minor'});
  createMoon({name:"Thebe",radius:7.2,speed:0.028,size:0.05,color:0xaa5555,type:'Minor'});
  createMoon({name:"Io",radius:7.8,speed:0.015,size:0.25,color:0xffd700,type:'Major'});
  createMoon({name:"Europa",radius:10.5,speed:0.010,size:0.22,color:0xd0f0ff,type:'Major'});
  createMoon({name:"Ganymede",radius:13.5,speed:0.007,size:0.35,color:0xa09080,type:'Major'});
  createMoon({name:"Callisto",radius:18.0,speed:0.004,size:0.32,color:0x555555,type:'Major'});
  createMoon({name:"Himalia",radius:21.0,speed:0.002,size:0.05,color:0x888888,type:'Minor'});
  createMoon({name:"Elara",radius:23.0,speed:0.0018,size:0.04,color:0x888888,type:'Minor'});
}

// ==========================================
//  统一3秒延迟启动（包含卫星！）
// ==========================================
setTimeout(() => {
    createJupiter();
    createGreatRedSpot();
    createFaintRings();
    createAllMoons(); // 卫星同步延迟显示
}, 3000);

// --- PART 7: 交互与动画循环 ---
initInteraction(group, INITIAL_ZOOM);
if (typeof InteractionState !== 'undefined') {
    InteractionState.targetRotationX = 0.2;
    InteractionState.targetRotationY = 0.0;
}
group.rotation.x = 0.2;
group.rotation.y = 0.0;

function animate()
{
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    jupiterSpinGroup.rotation.y += 0.0025;
    if (redSpotGroup) {
        redSpotGroup.rotation.y -= 0.0004;
        redSpotGroup.rotation.x = Math.sin(time * 0.5) * 0.002;
    }

    moons.forEach(sat => {
        sat.angle += sat.speed;
        sat.meshGroup.position.x = sat.radius * Math.cos(sat.angle);
        sat.meshGroup.position.z = sat.radius * Math.sin(sat.angle);
        sat.meshGroup.rotation.y += 0.01;
    });

    if (redSpotMesh) {
        const positions = redSpotMesh.geometry.attributes.position.array;
        const data = redSpotMesh.userData.particles;
        for (let i=0;i<data.length;i++){
            const p=data[i]; p.angle += p.speed;
            const dLat=Math.sin(p.angle)*p.dist*0.22*p.height;
            const dLon=Math.cos(p.angle)*p.dist*0.22*p.width;
            const finalLat=p.baseLat+dLat,finalLon=p.baseLon+dLon;
            const heightOffset=Math.cos(p.dist*Math.PI/2)*0.06 + Math.sin(time*2+p.dist*5)*0.002;
            const r=p.rBase+heightOffset;
            const x=r*Math.cos(finalLat)*Math.sin(finalLon);
            const y=r*Math.sin(finalLat);
            const z=r*Math.cos(finalLat)*Math.cos(finalLon);
            positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
        }
        redSpotMesh.geometry.attributes.position.needsUpdate = true;
    }

    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
    updatePlanetTelemetry(jupiterSpinGroup, tgtLabel, 1);
    renderer.render(scene, camera);
}
animate();