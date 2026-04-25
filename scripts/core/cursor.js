/**
 * 夜航星号光标系统 - 纯引擎点专业版
 * 特点:
 * 1. 移除了飞船，只保留引擎点
 * 2. 引擎点改为亮银色
 * 3. 优化了呼吸动画效果
 * 4. 系统重命名为"夜航星号"
 * 
 * 使用说明:
 * 1. 将此文件添加到您的项目中
 * 2. 确保已引入 night-navigator.css
 * 3. 系统将自动初始化
 */
(function initNightNavigator(global) {
    if (global.NightNavigator) return;
    
    // 核心配置
    const CONFIG = {
        CURSOR_SIZE: 16,
        CURSOR_HALF_SIZE: 8,
        MAX_TRAIL_LENGTH: 10,
        TRAIL_PARTICLE_SIZE: 4,
        MAX_TRAIL_PARTICLE_SIZE: 16,
        VELOCITY_THRESHOLD: 0.8,
        DEVICE_SCORE: 5,
        BREATHING_DURATION: 4.5,
        BREATHING_INTENSITY: 1.0,
        SYSTEM_NAME: '夜航星号'
    };
    
    // 性能调节器
    const PerformanceTuner = {
        init() {
            this.deviceScore = this.calculateDeviceScore();
            CONFIG.DEVICE_SCORE = this.deviceScore;
            CONFIG.MAX_TRAIL_LENGTH = Math.min(15, Math.max(6, this.deviceScore * 0.8));
            CONFIG.TRAIL_PARTICLE_SIZE = 3 + (this.deviceScore * 0.2);
            CONFIG.MAX_TRAIL_PARTICLE_SIZE = Math.min(20, 15 + (this.deviceScore * 0.5));
            CONFIG.VELOCITY_THRESHOLD = this.deviceScore > 6 ? 0.8 : 1.2;
            
            // 根据设备调整呼吸强度
            CONFIG.BREATHING_INTENSITY = this.deviceScore > 6 ? 1.0 : 0.9;
            
            if (this.isMobile()) {
                CONFIG.MAX_TRAIL_LENGTH = 6;
                CONFIG.TRAIL_PARTICLE_SIZE = 4;
                CONFIG.MAX_TRAIL_PARTICLE_SIZE = 12;
                CONFIG.BREATHING_DURATION = 4.0;
            }
        },
        
        calculateDeviceScore() {
            let score = 5;
            if (navigator.deviceMemory) score += navigator.deviceMemory * 2;
            if (navigator.hardwareConcurrency) {
                score += Math.min(4, navigator.hardwareConcurrency - 2);
            }
            score += window.devicePixelRatio > 1.5 ? 3 : 0;
            return Math.min(10, Math.max(1, score));
        },
        
        isMobile() {
            return /Android|iPhone|iPad/i.test(navigator.userAgent);
        }
    };

    PerformanceTuner.init();
    
    // 持久化光标位置
    function saveCursorPosition(x, y) {
        // 存储最后位置 (带时间戳防止过期数据)
        const data = JSON.stringify({
            position: { x, y },
            timestamp: Date.now()
        });
        try {
            sessionStorage.setItem('night-navigator-position', data);
        } catch (e) {
            // 处理sessionStorage受限情况
            console.warn('无法存储光标位置:', e);
        }
    }
    
    // 智能初始化位置
    function getInitialPosition() {
        try {
            const data = sessionStorage.getItem('night-navigator-position');
            if (data) {
                const { position, timestamp } = JSON.parse(data);
                // 仅使用5秒内的位置数据 (防止过期数据)
                if (Date.now() - timestamp < 5000) {
                    return position;
                }
            }
        } catch (e) {
            console.error('位置数据解析失败:', e);
        }
        
        // 默认位置 (屏幕中心)
        return {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
    }
    
    // 创建光标元素 - 只保留引擎点
    function createCursorElements() {
        // 移除可能存在的旧元素
        document.querySelectorAll('.night-navigator, .cursor-trail-canvas').forEach(el => el.remove());
        
        // 创建光标元素
        const cursor = document.createElement('div');
        cursor.className = 'night-navigator';
        
        // 应用初始位置
        const initialPos = getInitialPosition();
        cursor.style.left = `${initialPos.x - CONFIG.CURSOR_HALF_SIZE}px`;
        cursor.style.top = `${initialPos.y - CONFIG.CURSOR_HALF_SIZE}px`;
        
        // 确保背景透明
        cursor.style.backgroundColor = 'transparent';
        cursor.style.background = 'none';
        cursor.style.outline = 'none';
        cursor.style.boxShadow = 'none';
        
        // 添加引擎光效
        const engineGlow = document.createElement('div');
        engineGlow.className = 'engine-glow';
        engineGlow.style.outline = 'none';
        
        // 组装结构
        cursor.appendChild(engineGlow);
        
        document.body.appendChild(cursor);
        
        console.log(`✅ ${CONFIG.SYSTEM_NAME}: 元素已创建 (纯引擎点)`);
        console.log(`   - 光标尺寸: ${CONFIG.CURSOR_SIZE}x${CONFIG.CURSOR_SIZE}`);
        console.log(`   - 初始位置: ${initialPos.x}, ${initialPos.y}`);
        
        return { cursor, trailCanvas: null };
    }
    
    // 创建Web Worker
    const cursorWorker = new Worker(URL.createObjectURL(new Blob([`
      let cursorPos = ${JSON.stringify(getInitialPosition())};
      let lastMoveTime = Date.now();
      let isMoving = false;
      let trailQueue = [];
      const MAX_TRAIL_LENGTH = ${CONFIG.MAX_TRAIL_LENGTH};
      const VELOCITY_THRESHOLD = ${CONFIG.VELOCITY_THRESHOLD};
      const BREATHING_DURATION = ${CONFIG.BREATHING_DURATION};
      const BREATHING_INTENSITY = ${CONFIG.BREATHING_INTENSITY};
      const MAX_TRAIL_PARTICLE_SIZE = ${CONFIG.MAX_TRAIL_PARTICLE_SIZE};
      let lastX = cursorPos.x, lastY = cursorPos.y;
      let breathPhase = 0;
      
      function getVelocity() {
        const now = Date.now();
        const dt = now - lastMoveTime;
        if (dt < 16) return 0;
        
        const dx = cursorPos.x - lastX;
        const dy = cursorPos.y - lastY;
        lastX = cursorPos.x;
        lastY = cursorPos.y;
        
        return Math.sqrt(dx*dx + dy*dy) / dt * 16;
      }
      
      function updateBreathing(now) {
        // 呼吸灯相位计算 (4.5秒周期)
        const cycleTime = BREATHING_DURATION * 1000;
        breathPhase = (now % cycleTime) / cycleTime;
        
        // 夜航星号呼吸曲线
        let intensity = 0;
        
        if (breathPhase < 0.35) {
          // 吸气阶段：平滑上升
          intensity = Math.pow(breathPhase / 0.35, 0.8) * 0.8;
        } else if (breathPhase < 0.65) {
          // 顶点保持：短暂稳定
          intensity = 0.8 + (breathPhase - 0.35) / 0.3 * 0.2;
        } else if (breathPhase < 0.9) {
          // 呼气阶段：平滑下降
          intensity = 1.0 - Math.pow((breathPhase - 0.65) / 0.25, 1.2) * 0.8;
        } else {
          // 短暂停顿
          intensity = 0.2 - (breathPhase - 0.9) / 0.1 * 0.2;
        }
        
        // 应用强度系数
        intensity = Math.max(0, Math.min(1, intensity * BREATHING_INTENSITY));
        
        return {
          scale: intensity,
          blur: intensity,
          brightness: intensity,
          saturation: intensity,
          opacity: intensity
        };
      }
      
      function process() {
        const now = Date.now();
        const idleTime = now - lastMoveTime;
        const velocity = getVelocity();
        
        // 状态更新
        if (velocity > VELOCITY_THRESHOLD) {
          if (!isMoving) {
            isMoving = true;
            self.postMessage({
              type: 'state',
              state: 'moving',
              velocity: velocity
            });
          }
        } else if (idleTime > 500 && isMoving) {
          isMoving = false;
          self.postMessage({
            type: 'state',
            state: 'idle'
          });
        }
        
        // 拖尾生成
        if (isMoving && velocity > 0.5) {
          // 限制粒子最大尺寸
          const particleSize = Math.min(
            MAX_TRAIL_PARTICLE_SIZE,
            ${CONFIG.TRAIL_PARTICLE_SIZE} * (1 + velocity * 0.2)
          );
          
          trailQueue.unshift({
            x: cursorPos.x,
            y: cursorPos.y,
            timestamp: now,
            size: particleSize
          });
          
          if (trailQueue.length > MAX_TRAIL_LENGTH) {
            trailQueue.pop();
          }
        }
        
        // 呼吸灯效果计算
        const breathing = updateBreathing(now);
        self.postMessage({
          type: 'breathing',
          scale: breathing.scale,
          blur: breathing.blur,
          brightness: breathing.brightness,
          saturation: breathing.saturation,
          opacity: breathing.opacity
        });
        
        setTimeout(process, 16);
      }
      
      self.onmessage = (e) => {
        if (e.data.type === 'move') {
          cursorPos = { x: e.data.x, y: e.data.y };
          lastMoveTime = Date.now();
          
          // 持久化位置
          self.postMessage({
            type: 'save-position',
            x: e.data.x,
            y: e.data.y
          });
        }
      };
      
      process();
    `], { type: 'application/javascript' })));
    
    // 初始化渲染系统
    function initRenderer() {
        const { cursor } = createCursorElements();
        
        // 设置Worker通信
        cursorWorker.onmessage = (e) => {
            switch(e.data.type) {
                case 'state':
                    if (e.data.state === 'moving') {
                        cursor.classList.add('cursor-moving');
                        cursor.style.setProperty('--velocity', e.data.velocity.toFixed(2));
                    } else {
                        cursor.classList.remove('cursor-moving');
                    }
                    break;
                    
                case 'breathing':
                    // 应用呼吸灯效果
                    cursor.style.setProperty('--breath-scale', e.data.scale);
                    cursor.style.setProperty('--breath-blur', e.data.blur);
                    cursor.style.setProperty('--breath-brightness', e.data.brightness);
                    cursor.style.setProperty('--breath-saturation', e.data.saturation);
                    cursor.style.setProperty('--breath-opacity', e.data.opacity);
                    break;
                    
                case 'save-position':
                    // 保存位置到sessionStorage
                    saveCursorPosition(e.data.x, e.data.y);
                    break;
            }
        };
        
        // 事件监听
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        // 恢复位置更新逻辑
        function handleMouseMove(e) {
            const x = e.clientX;
            const y = e.clientY;
            
            cursorWorker.postMessage({
                type: 'move',
                x: x,
                y: y
            });
            
            // 直接更新光标位置
            cursor.style.left = `${x - CONFIG.CURSOR_HALF_SIZE}px`;
            cursor.style.top = `${y - CONFIG.CURSOR_HALF_SIZE}px`;
        }
        
        function handleTouchMove(e) {
            e.preventDefault();
            const touch = e.touches[0];
            
            cursorWorker.postMessage({
                type: 'move',
                x: touch.clientX,
                y: touch.clientY
            });
            
            // 直接更新光标位置
            cursor.style.left = `${touch.clientX - CONFIG.CURSOR_HALF_SIZE}px`;
            cursor.style.top = `${touch.clientY - CONFIG.CURSOR_HALF_SIZE}px`;
        }
        
        return { cursor };
    }
    
    // DOM变化监控
    function setupDOMObserver(cursor) {
        const observer = new MutationObserver(() => {
            // 检查光标元素是否存在
            if (!document.body.contains(cursor)) {
                console.log(`${CONFIG.SYSTEM_NAME}: 光标元素被移除，重新创建`);
                const { cursor: newCursor } = createCursorElements();
                setupDOMObserver(newCursor);
                
                // 更新引用
                cursor = newCursor;
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        return observer;
    }
    
    // 强制隐藏原生光标
    function forceHideNativeCursor() {
        const style = document.createElement('style');
        style.id = 'night-navigator-styles';
        style.textContent = `
            * { cursor: none !important; }
            html, body { cursor: none !important; }
            .night-navigator, .cursor-trail-canvas {
                -webkit-tap-highlight-color: transparent;
            }
        `;
        document.head.insertBefore(style, document.head.firstChild);
    }
    
    // 初始化系统
    function initSystem() {
        forceHideNativeCursor();
        const { cursor } = initRenderer();
        
        // 设置DOM观察器
        const domObserver = setupDOMObserver(cursor);
        
        // 暴露调试接口
        global.NightNavigator = {
            worker: cursorWorker,
            config: CONFIG,
            // 呼吸灯调试工具
            breathing: {
                setIntensity: (intensity) => {
                    CONFIG.BREATHING_INTENSITY = Math.max(0.7, Math.min(1.2, intensity));
                    console.log(`[${CONFIG.SYSTEM_NAME}] 呼吸灯强度设置为: ${CONFIG.BREATHING_INTENSITY}`);
                },
                setDuration: (seconds) => {
                    CONFIG.BREATHING_DURATION = Math.max(3.0, Math.min(5.5, seconds));
                    console.log(`[${CONFIG.SYSTEM_NAME}] 呼吸灯周期设置为: ${CONFIG.BREATHING_DURATION}秒`);
                }
            },
            // 公开位置保存方法
            savePosition: saveCursorPosition
        };
        
        console.log(`🚀 ${CONFIG.SYSTEM_NAME} 系统已启动 | 版本: 1.0.0`);
    }
    
    // 页面加载完成启动
    if (document.readyState !== 'loading') {
        initSystem();
    } else {
        document.addEventListener('DOMContentLoaded', initSystem);
    }
    
})(window);