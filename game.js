// 弹幕射击游戏（类似打飞机，无限滚动）

(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);

  // 游戏参数
  const TILE_SIZE = isMobile ? 20 : 30;
  const CHUNK_SIZE = 20; // 地图块大小（瓦片数）
  const MAP_WIDTH = CHUNK_SIZE; // 地图宽度（瓦片数）

  // 动态设置canvas尺寸
  function resizeCanvas() {
    const container = document.querySelector('.map-container');
    const maxWidth = Math.min(window.innerWidth - 40, isMobile ? window.innerWidth - 20 : 600);
    const maxHeight = isMobile ? window.innerHeight * 0.4 : 600;
    const size = Math.min(maxWidth, maxHeight);
    canvas.width = size;
    canvas.height = size;
  }

  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  // 游戏状态
  const state = {
    mapChunks: [], // 地图块数组 [{ y: 瓦片Y坐标, tiles: 二维数组 }]
    player: {
      x: 0,  // 像素坐标（相对地图）
      y: 0,  // 像素坐标（相对地图）
      radius: 12,  // 碰撞半径
      speed: 3,  // 移动速度（像素/帧）
      hp: 100,
      maxHp: 100,
      level: 1,
      exp: 0,
      expToNext: 10,
      attack: 5,
      defense: 2,
      skillPoints: 0,
      gold: 0,
      lastChestDistance: 0,
      nextChestDistance: 10 + Math.random() * 40,
      weapons: [
        {
          def: window.WEAPONS.CELL,
          name: window.WEAPONS.CELL.name,
          color: window.WEAPONS.CELL.color,
          cooldown: 0
        }
      ],  // 武器数组
      lastDamageTime: 0,  // 上次受伤时间（用于无敌时间）
      invulnerableTime: 60  // 无敌时间（帧数）
    },
    entities: [],
    bullets: [],  // 子弹数组
    lifeStealParticles: [],  // 吸血粒子数组
    lightningEffects: [],  // 闪电特效数组
    explosionEffects: [],  // 爆炸特效数组
    scrollY: 0,  // 滚动位置（像素，向下为正）
    autoScrollSpeed: 0.8,  // 自动滚动速度（像素/帧）
    running: true,
    paused: false, // 是否由于升级弹窗暂停
    keys: {},
    gameTime: 0,  // 游戏时间（帧数）
    lastSpawnY: 0,  // 上次生成敌人的Y坐标
    spawnInterval: 200,  // 每多少像素生成一次敌人
    lastChunkY: -CHUNK_SIZE  // 最后一个地图块的Y坐标（瓦片单位）
  };

  // 地图类型
  const TILE = {
    WALL: 0,
    FLOOR: 1
  };

  // 实体类型
  const ENTITY = {
    PLAYER: 'player',
    ENEMY: 'enemy',
    CHEST: 'chest'
  };

  // 敌人类型（从 enemy_config.js 加载）
  const ENEMY_TYPES = window.ENEMY_TYPES;

  // 武器定义（从 weapon_fusion_config.js 加载）
  const WEAPONS = window.WEAPONS;

  // 日志系统
  function log(message, type = 'normal') {
    const logContent = document.getElementById('log-content');
    if (!logContent) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
    while (logContent.children.length > 30) {
      logContent.removeChild(logContent.firstChild);
    }
  }

  // 更新武器UI
  function updateWeaponUI() {
    const grid = document.getElementById('weapon-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';

      const weapon = state.player.weapons[i];
      if (weapon) {
        slot.className += ' active';
        const icon = getWeaponIcon(weapon.def.id);
        slot.innerHTML = `
          <div class="weapon-icon-display">${icon}</div>
          <div class="weapon-name-display">${weapon.name}</div>
        `;
        slot.style.borderColor = weapon.color;
      } else {
        slot.innerHTML = '<span style="opacity:0.3">+</span>';
      }
      grid.appendChild(slot);
    }
  }

  // 更新UI
  function updateUI() {
    const hb = document.getElementById('health-fill');
    if (hb) hb.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
    const ht = document.getElementById('health-text');
    if (ht) ht.textContent = `${Math.floor(state.player.hp)}/${state.player.maxHp}`;
    const lvl = document.getElementById('level');
    if (lvl) lvl.textContent = state.player.level;
    const eb = document.getElementById('exp-fill');
    if (eb) eb.style.width = `${(state.player.exp / state.player.expToNext) * 100}%`;
    const et = document.getElementById('exp');
    if (et) et.textContent = `${state.player.exp}/${state.player.expToNext}`;
    const atk = document.getElementById('attack');
    if (atk) atk.textContent = state.player.attack;
    const def = document.getElementById('defense');
    if (def) def.textContent = state.player.defense;
    const gld = document.getElementById('gold');
    if (gld) gld.textContent = state.player.gold;
    const flr = document.getElementById('floor');
    if (flr) flr.textContent = Math.floor(state.scrollY / TILE_SIZE);
    const sp = document.getElementById('skill-points');
    if (sp) sp.textContent = state.player.skillPoints;

    const skillUI = document.getElementById('skill-point-ui');
    const skillCountUI = document.getElementById('skill-count-ui');
    if (skillUI && skillCountUI) {
      if (state.player.skillPoints > 0) {
        skillUI.style.display = 'flex';
        skillCountUI.textContent = `(${state.player.skillPoints})`;
      } else {
        skillUI.style.display = 'none';
      }
    }
    updateWeaponUI();
  }

  // 检查点是否在地板内
  function isPointInFloor(px, py) {
    const tileY = Math.floor(py / TILE_SIZE);
    const tileX = Math.floor(px / TILE_SIZE);
    const chunkIndex = Math.floor(tileY / CHUNK_SIZE);
    for (const chunk of state.mapChunks) {
      if (Math.floor(chunk.y / CHUNK_SIZE) === chunkIndex) {
        const localY = tileY - chunk.y;
        if (localY >= 0 && localY < CHUNK_SIZE && tileX >= 0 && tileX < MAP_WIDTH) {
          return chunk.tiles[localY] && chunk.tiles[localY][tileX] === TILE.FLOOR;
        }
      }
    }
    return false;
  }

  // 圆形碰撞检测
  function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy) < (r1 + r2);
  }

  // 生成地图块
  function generateChunk(y) {
    const tiles = Array(CHUNK_SIZE).fill(null).map(() => Array(MAP_WIDTH).fill(TILE.FLOOR));
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        if (tx < 2 || tx >= MAP_WIDTH - 2) {
          if (Math.random() > 0.3) tiles[ty][tx] = TILE.WALL;
        } else if (Math.random() < 0.1) {
          tiles[ty][tx] = TILE.WALL;
        }
      }
    }
    return { y: y * CHUNK_SIZE, tiles: tiles };
  }

  // 初始化地图
  function initMap() {
    state.mapChunks = [];
    for (let i = -2; i <= 0; i++) state.mapChunks.push(generateChunk(i));
    state.lastChunkY = 0;
    state.player.x = (MAP_WIDTH / 2) * TILE_SIZE;
    state.player.y = canvas.height * 0.3;
  }

  // 确保地图块足够
  function ensureMapChunks() {
    const { h: H } = { h: canvas.height };
    const visibleBottomTile = Math.floor((state.scrollY + H) / TILE_SIZE) + 2;
    while (state.lastChunkY * CHUNK_SIZE < visibleBottomTile) {
      state.lastChunkY++;
      state.mapChunks.push(generateChunk(state.lastChunkY));
    }
    const visibleTopTile = Math.floor(state.scrollY / TILE_SIZE);
    const removeBeforeTile = visibleTopTile - CHUNK_SIZE * 3;
    state.mapChunks = state.mapChunks.filter(chunk => chunk.y + CHUNK_SIZE >= removeBeforeTile);
  }

  // 生成宝箱
  function spawnChest() {
    const { h: H } = { h: canvas.height };
    const spawnY = state.scrollY + H + 200;
    const x = (2 + Math.random() * (MAP_WIDTH - 4)) * TILE_SIZE;
    state.entities.push({
      type: ENTITY.CHEST,
      x,
      y: spawnY,
      radius: 15,
      color: '#ffd700',
      id: Date.now()
    });
    log('前方出现了宝箱！', 'important');
  }

  // 生成敌人
  function spawnEnemies() {
    const { h: H } = { h: canvas.height };
    const spawnY = state.scrollY + H + 100;
    if (spawnY - state.lastSpawnY >= state.spawnInterval) {
      state.lastSpawnY = spawnY;
      const enemyCount = 2 + Math.floor(Math.random() * 3);
      // 获取当前距离，用于解锁敌人类型
      const currentDistance = Math.floor(state.scrollY / TILE_SIZE);

      for (let i = 0; i < enemyCount; i++) {
        const x = (2 + Math.random() * (MAP_WIDTH - 4)) * TILE_SIZE;
        const y = spawnY + Math.random() * 200;

        // 使用新的距离解锁机制生成敌人
        const enemyType = window.getRandomEnemyType
          ? window.getRandomEnemyType(currentDistance)
          : ENEMY_TYPES[Math.min(
            Math.floor(Math.random() * (1 + state.player.level / 3)),
            ENEMY_TYPES.length - 1
          )];

        state.entities.push({
          type: ENTITY.ENEMY,
          x, y, ...enemyType,
          hp: enemyType.maxHp,
          poisonStacks: 0, poisonDuration: 0,
          frozen: false, frozenTime: 0,
          burning: false, burnTime: 0, burnDamage: 0, burnColor: null,
          vulnerable: false, vulnerableAmount: 0,
          blinded: false, blindedTime: 0
        });
      }
    }
  }

  // 更新玩家
  function updatePlayer() {
    if (!state.running || state.paused) return;
    let dx = 0, dy = 0;
    if (state.keys['w'] || state.keys['arrowup']) dy -= 1;
    if (state.keys['s'] || state.keys['arrowdown']) dy += 1;
    if (state.keys['a'] || state.keys['arrowleft']) dx -= 1;
    if (state.keys['d'] || state.keys['arrowright']) dx += 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    const nx = state.player.x + dx * state.player.speed;
    const ny = state.player.y + dy * state.player.speed;
    if (nx >= state.player.radius && nx < MAP_WIDTH * TILE_SIZE - state.player.radius) {
      if (isPointInFloor(nx, state.scrollY + ny) || ny < canvas.height * 0.1) state.player.x = nx;
    }
    if (ny >= 0 && ny < canvas.height * 0.8) state.player.y = ny;
    if (state.player.lastDamageTime > 0) state.player.lastDamageTime--;
    state.player.weapons.forEach(w => { if (w.cooldown > 0) w.cooldown--; });
  }

  // 更新滚动
  function updateScroll() {
    if (state.paused) return;
    state.scrollY += state.autoScrollSpeed;
    const dist = Math.floor(state.scrollY / TILE_SIZE);
    if (dist - state.player.lastChestDistance >= state.player.nextChestDistance) {
      state.player.lastChestDistance = dist;
      state.player.nextChestDistance = 10 + Math.random() * 40;
      spawnChest();
    }
  }

  // 自动射击
  function autoShoot() {
    if (state.paused) return;
    const playerWorldY = state.scrollY + state.player.y;
    let nearest = null, minDist = Infinity;
    for (const e of state.entities) {
      if (e.type === ENTITY.ENEMY && e.hp > 0) {
        const dx = e.x - state.player.x, dy = e.y - playerWorldY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist && d > 0) { minDist = d; nearest = e; }
      }
    }
    if (nearest) {
      let shotsFiredThisFrame = 0;
      state.player.weapons.forEach((w, i) => {
        if (w.cooldown <= 0) {
          // 连发 staggering: 每帧限制发射一件武器，后续就位武器延迟1帧发射
          if (shotsFiredThisFrame > 0) {
            w.cooldown = 1;
            return;
          }

          const dx = nearest.x - state.player.x, dy = nearest.y - playerWorldY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // 散射角度调小 (约 3 度)
          const spread = (i - (state.player.weapons.length - 1) / 2) * 0.05;
          const angle = Math.atan2(dy, dx) + spread;

          const vx = Math.cos(angle) * w.def.speed;
          const vy = Math.sin(angle) * w.def.speed;

          // 🔧 自动继承武器定义的所有属性，然后覆盖需要特殊处理的属性
          // 这样未来添加新武器机制时，不需要手动在这里添加属性继承
          state.bullets.push({
            // 1. 先展开所有武器定义属性（自动继承所有新属性）
            ...w.def,

            // 2. 覆盖需要特殊计算的属性
            x: state.player.x,
            y: playerWorldY,
            vx: vx,
            vy: vy,
            damage: state.player.attack * w.def.damage  // 伤害需要乘以玩家攻击力
          });
          w.cooldown = w.def.interval;
          shotsFiredThisFrame++;
        }
      });
    }
  }

  // 更新子弹
  function updateBullets() {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx; b.y += b.vy; b.lifetime--;
      if (b.x < 0 || b.x >= MAP_WIDTH * TILE_SIZE || b.y < state.scrollY - 200 || b.y > state.scrollY + canvas.height + 500 || b.lifetime <= 0) {
        state.bullets.splice(i, 1); continue;
      }
      let hit = false;
      for (const e of state.entities) {
        if (e.type === ENTITY.ENEMY && e.hp > 0) {
          if (circleCollision(b.x, b.y, b.radius || 4, e.x, e.y, e.radius)) {
            let dmg = Math.max(1, b.damage - e.defense);
            let vuln = (e.vulnerable ? e.vulnerableAmount : 0) + (e.frozen ? 0.1 : 0);
            e.hp -= dmg * (1 + vuln);
            if (b.freezeChance > 0 && Math.random() < b.freezeChance) { e.frozen = true; e.frozenTime = b.freezeDuration; }
            if (b.burnDuration > 0) { e.burning = true; e.burnTime = b.burnDuration; e.burnDamage = b.burnDamagePerFrame; e.burnColor = b.burnColor; }
            if (b.vulnerability > 0) { e.vulnerable = true; e.vulnerableAmount = b.vulnerability; }
            // 致盲效果
            if (b.blindChance > 0 && Math.random() < b.blindChance) {
              e.blinded = true;
              e.blindedTime = b.blindDuration;
            }
            // 中毒效果（叠加层数）
            if (b.poisonDuration > 0) {
              if (!e.poisonStacks) e.poisonStacks = 0;
              if (e.poisonStacks < 100) {
                e.poisonStacks++;
                e.poisonDuration = b.poisonDuration;
                e.poisonDamagePerStack = b.poisonDamagePerStack;
              } else {
                e.poisonDuration = b.poisonDuration; // 刷新持续时间
              }
            }
            // 吸血效果
            if (b.lifeStealChance > 0 && Math.random() < b.lifeStealChance) {
              state.player.hp = Math.min(state.player.maxHp, state.player.hp + b.lifeStealAmount);
              log(`吸血回复了 ${b.lifeStealAmount} 点生命！`, 'heal');
              updateUI();
              // 生成单个吸血粒子特效（从敌人位置飞向玩家）
              const playerWorldY = state.scrollY + state.player.y;
              state.lifeStealParticles.push({
                x: e.x,
                y: e.y,
                targetX: state.player.x,
                targetY: playerWorldY,
                life: 25,
                trail: []
              });
            }
            // 闪电连锁效果
            if (b.chainCount > 0) {
              const chainTargets = [];
              const hitEnemies = new Set([e]); // 已击中的敌人
              let currentSource = e;

              for (let chain = 0; chain < b.chainCount; chain++) {
                let nearestEnemy = null;
                let minDist = Infinity;

                // 查找距离当前源最近的未击中敌人
                for (const target of state.entities) {
                  if (target.type === ENTITY.ENEMY && target.hp > 0 && !hitEnemies.has(target)) {
                    const dx = target.x - currentSource.x;
                    const dy = target.y - currentSource.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < b.chainRange && dist < minDist) {
                      minDist = dist;
                      nearestEnemy = target;
                    }
                  }
                }

                if (nearestEnemy) {
                  // 造成伤害
                  let dmg = Math.max(1, b.damage - nearestEnemy.defense);
                  let vuln = (nearestEnemy.vulnerable ? nearestEnemy.vulnerableAmount : 0) + (nearestEnemy.frozen ? 0.1 : 0);
                  nearestEnemy.hp -= dmg * (1 + vuln);

                  // 记录连锁目标用于视觉特效
                  chainTargets.push({ from: currentSource, to: nearestEnemy });

                  if (nearestEnemy.hp <= 0) {
                    log(`${nearestEnemy.name} 被闪电击败了！获得 ${nearestEnemy.exp} 经验，${nearestEnemy.gold} 金币。`, 'important');
                    state.player.exp += nearestEnemy.exp; state.player.gold += nearestEnemy.gold;
                    checkLevelUp(); updateUI();
                  }

                  hitEnemies.add(nearestEnemy);
                  currentSource = nearestEnemy;
                } else {
                  break; // 没有更多目标，停止连锁
                }
              }

              // 生成闪电特效
              if (chainTargets.length > 0) {
                state.lightningEffects.push({
                  chains: chainTargets,
                  life: 15
                });
              }
            }
            // 爆炸AOE效果
            if (b.explosionRadius > 0) {
              // 生成爆炸特效
              state.explosionEffects.push({
                x: e.x,
                y: e.y,
                radius: 0,
                maxRadius: b.explosionRadius,
                life: 20
              });

              // 对范围内所有敌人造成伤害
              for (const target of state.entities) {
                if (target.type === ENTITY.ENEMY && target.hp > 0) {
                  const dx = target.x - e.x;
                  const dy = target.y - e.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  if (dist < b.explosionRadius) {
                    let dmg = Math.max(1, state.player.attack * b.explosionDamage - target.defense);
                    let vuln = (target.vulnerable ? target.vulnerableAmount : 0) + (target.frozen ? 0.1 : 0);
                    target.hp -= dmg * (1 + vuln);

                    if (target.hp <= 0) {
                      log(`${target.name} 被炸死了！获得 ${target.exp} 经验，${target.gold} 金币。`, 'important');
                      state.player.exp += target.exp; state.player.gold += target.gold;
                      checkLevelUp(); updateUI();
                    }
                  }
                }
              }
            }

            // 岩石武器的 AOE 伤害机制
            if (b.aoeRadius > 0) {
              // 生成碎土特效
              state.explosionEffects.push({
                x: e.x,
                y: e.y,
                radius: 0,
                maxRadius: b.aoeRadius,
                life: 15,
                color: '#8B4513', // 棕色
                type: 'earth'  // 标记为碎土特效
              });

              // 对范围内所有敌人造成 AOE 伤害
              for (const target of state.entities) {
                if (target.type === ENTITY.ENEMY && target.hp > 0) {
                  const dx = target.x - e.x;
                  const dy = target.y - e.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  if (dist < b.aoeRadius) {
                    let aoeDmg = Math.max(1, state.player.attack * b.aoeDamage - target.defense);
                    let vuln = (target.vulnerable ? target.vulnerableAmount : 0) + (target.frozen ? 0.1 : 0);
                    target.hp -= aoeDmg * (1 + vuln);

                    if (target.hp <= 0 && target !== e) {
                      log(`${target.name} 被岩石的碎片击败了！获得 ${target.exp} 经验，${target.gold} 金币。`, 'important');
                      state.player.exp += target.exp; state.player.gold += target.gold;
                      checkLevelUp(); updateUI();
                    }
                  }
                }
              }
            }

            // 射线武器的射线伤害机制
            if (b.rayRange && b.rayRange > 0) {
              let rayDirX, rayDirY;

              // 寻找范围内最近的敌人作为射线目标
              let closestTarget = null;
              let closestDist = Infinity;

              for (const target of state.entities) {
                if (target.type === ENTITY.ENEMY && target.hp > 0 && target !== e) {
                  const dx = target.x - e.x;
                  const dy = target.y - e.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  if (dist < b.rayRange && dist < closestDist) {
                    closestTarget = target;
                    closestDist = dist;
                  }
                }
              }

              // 确定射线方向
              if (closestTarget) {
                // 有目标：从击中点指向目标敌人
                const rayDx = closestTarget.x - e.x;
                const rayDy = closestTarget.y - e.y;
                const rayLen = Math.sqrt(rayDx * rayDx + rayDy * rayDy);
                rayDirX = rayDx / rayLen;
                rayDirY = rayDy / rayLen;
              } else {
                // 无目标：随机选择一个方向
                const randomAngle = Math.random() * Math.PI * 2;
                rayDirX = Math.cos(randomAngle);
                rayDirY = Math.sin(randomAngle);
              }

              // 生成双向射线视觉特效（正向和反向）
              state.explosionEffects.push({
                x: e.x - rayDirX * b.rayLength,  // 反向起点
                y: e.y - rayDirY * b.rayLength,
                endX: e.x + rayDirX * b.rayLength,  // 正向终点
                endY: e.y + rayDirY * b.rayLength,
                life: 10,
                color: '#FFA500',
                type: 'ray'  // 标记为射线特效
              });

              // 对射线路径上的所有敌人造成伤害（双向）
              for (const target of state.entities) {
                if (target.type === ENTITY.ENEMY && target.hp > 0) {
                  // 计算点到射线的距离
                  const px = target.x - e.x;
                  const py = target.y - e.y;
                  const dot = px * rayDirX + py * rayDirY;

                  // 伤害射线范围内的所有敌人（正向和反向，总长度为2*rayLength）
                  if (Math.abs(dot) < b.rayLength) {
                    const perpX = px - dot * rayDirX;
                    const perpY = py - dot * rayDirY;
                    const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);

                    // 如果敌人在射线宽度范围内
                    if (perpDist < b.rayWidth) {
                      let rayDmg = Math.max(1, state.player.attack * b.damage - target.defense);
                      let vuln = (target.vulnerable ? target.vulnerableAmount : 0) + (target.frozen ? 0.1 : 0);
                      target.hp -= rayDmg * (1 + vuln);

                      if (target.hp <= 0 && target !== e) {
                        log(`${target.name} 被射线击穿了！获得 ${target.exp} 经验，${target.gold} 金币。`, 'important');
                        state.player.exp += target.exp;
                        state.player.gold += target.gold;
                        checkLevelUp();
                        updateUI();
                      }
                    }
                  }
                }
              }
            }

            // 细胞武器的分裂机制
            if (b.canSplit && b.splitCount > 0 && b.splitRange > 0) {
              // 寻找分裂目标（与当前击中的敌人不同）
              const splitTargets = [];
              for (const target of state.entities) {
                if (target.type === ENTITY.ENEMY && target.hp > 0 && target !== e) {
                  const dx = target.x - e.x;
                  const dy = target.y - e.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  if (dist < b.splitRange) {
                    splitTargets.push({ enemy: target, distance: dist });
                  }
                }
              }

              // 按距离排序，选择最近的目标
              splitTargets.sort((a, b) => a.distance - b.distance);
              const selectedTargets = splitTargets.slice(0, Math.min(b.splitCount, splitTargets.length));

              // 为每个目标生成分裂子弹
              selectedTargets.forEach(({ enemy }) => {
                const dx = enemy.x - e.x;
                const dy = enemy.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                // 关键修复：让分裂子弹从被击中敌人外围偏移生成
                // 偏移距离 = 被击中敌人的半径 + 子弹半径 + 额外安全距离
                const offsetDistance = e.radius + b.radius + 5;
                const startX = e.x + Math.cos(angle) * offsetDistance;
                const startY = e.y + Math.sin(angle) * offsetDistance;


                // 🔧 分裂子弹继承父弹的所有属性
                state.bullets.push({
                  // 1. 先继承父弹的所有属性
                  ...b,

                  // 2. 覆盖需要特殊设置的属性
                  x: startX,
                  y: startY,
                  vx: Math.cos(angle) * b.speed,
                  vy: Math.sin(angle) * b.speed,
                  lifetime: 120,  // 重置生命周期
                  piercing: false,
                  canSplit: false,  // 分裂子弹不会再次分裂
                  splitCount: 0,
                  aoeRadius: 0,
                  aoeDamage: 0
                });
              });
            }

            if (e.hp <= 0) {
              log(`击败了 ${e.name}！获得 ${e.exp} 经验，${e.gold} 金币。`, 'important');
              state.player.exp += e.exp; state.player.gold += e.gold;
              checkLevelUp(); updateUI();
            }
            if (!b.piercing) { hit = true; break; }
          }
        }
      }
      if (hit) state.bullets.splice(i, 1);
    }
  }

  // 更新爆炸特效
  function updateExplosionEffects() {
    for (let i = state.explosionEffects.length - 1; i >= 0; i--) {
      const effect = state.explosionEffects[i];
      effect.life--;
      effect.radius = effect.maxRadius * (1 - effect.life / 20);

      if (effect.life <= 0) {
        state.explosionEffects.splice(i, 1);
      }
    }
  }

  // 更新闪电特效
  function updateLightningEffects() {
    for (let i = state.lightningEffects.length - 1; i >= 0; i--) {
      const effect = state.lightningEffects[i];
      effect.life--;
      if (effect.life <= 0) {
        state.lightningEffects.splice(i, 1);
      }
    }
  }

  // 更新吸血粒子
  function updateLifeStealParticles() {
    for (let i = state.lifeStealParticles.length - 1; i >= 0; i--) {
      const p = state.lifeStealParticles[i];
      p.life--;

      if (p.life <= 0) {
        state.lifeStealParticles.splice(i, 1);
        continue;
      }

      // 记录轨迹（拖尾效果）
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 6) p.trail.shift();

      // 朝玩家移动
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        state.lifeStealParticles.splice(i, 1);
        continue;
      }

      const speed = 8;
      p.x += (dx / dist) * speed;
      p.y += (dy / dist) * speed;
    }
  }

  // 更新敌人
  function updateEnemies() {
    const playerWorldY = state.scrollY + state.player.y;
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const e = state.entities[i];

      // 更新宝箱锁定CD
      if (e.type === ENTITY.CHEST && e.interactionCooldown > 0) {
        e.interactionCooldown--;
      }

      if (e.type === ENTITY.ENEMY) {
        if (e.hp <= 0 || e.y < state.scrollY - 300) { state.entities.splice(i, 1); continue; }
        if (e.frozen && e.frozenTime > 0) { if (--e.frozenTime <= 0) e.frozen = false; }
        if (e.burning && e.burnTime > 0) {
          let dot = e.burnDamage * (1 + (e.vulnerable ? e.vulnerableAmount : 0) + (e.frozen ? 0.1 : 0));
          e.hp -= dot;
          if (--e.burnTime <= 0) { e.burning = false; e.vulnerable = false; }
          if (e.hp <= 0) {
            log(`${e.name} 被烧死了！获得 ${e.exp} 经验，${e.gold} 金币。`, 'important');
            state.player.exp += e.exp; state.player.gold += e.gold;
            checkLevelUp(); updateUI(); state.entities.splice(i, 1); continue;
          }
        }
        // 中毒DoT
        if (e.poisonStacks > 0 && e.poisonDuration > 0) {
          let poisonDot = e.poisonDamagePerStack * e.poisonStacks;
          e.hp -= poisonDot;
          if (--e.poisonDuration <= 0) { e.poisonStacks = 0; }
          if (e.hp <= 0) {
            log(`${e.name} 被毒死了！获得 ${e.exp} 经验，${e.gold} 金币。`, 'important');
            state.player.exp += e.exp; state.player.gold += e.gold;
            checkLevelUp(); updateUI(); state.entities.splice(i, 1); continue;
          }
        }
        // 致盲DoT（时间递减）
        if (e.blinded && e.blindedTime > 0) {
          if (--e.blindedTime <= 0) { e.blinded = false; }
        }
        if (!e.frozen && !state.paused) {
          const dx = state.player.x - e.x, dy = playerWorldY - e.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0) {
            e.x += (dx / d) * e.speed; e.y += (dy / d) * e.speed;
          }
        }
      }
      if (circleCollision(e.x, e.y, e.radius, state.player.x, playerWorldY, state.player.radius)) {
        if (e.type === ENTITY.CHEST) {
          if (!e.interactionCooldown || e.interactionCooldown <= 0) {
            openChestMenu(e);
          }
        }
        // 致盲敌人无法造成伤害
        else if (!e.blinded && state.player.lastDamageTime <= 0) {
          const dmg = Math.max(1, e.attack - state.player.defense);
          state.player.hp -= dmg; state.player.lastDamageTime = state.player.invulnerableTime;
          log(`${e.name} 对你造成了 ${dmg} 点伤害！`, 'damage'); updateUI();
          if (state.player.hp <= 0) gameOver();
        }
      }
    }
  }

  function checkLevelUp() {
    while (state.player.exp >= state.player.expToNext) {
      const p = state.player.hp / state.player.maxHp;
      state.player.level++; state.player.exp -= state.player.expToNext;
      state.player.expToNext = Math.floor(state.player.expToNext * 1.5);
      state.player.maxHp += 10; state.player.hp = Math.floor(state.player.maxHp * p);
      state.player.attack += 2; state.player.defense += 1; state.player.skillPoints += 1;
      log(`升级了！现在是 ${state.player.level} 级！获得 1 点技能点。`, 'important');
    }
  }

  function openUpgradeMenu() {
    if (state.player.skillPoints <= 0 || state.paused) return;
    state.paused = true;
    refreshUpgradeOptions();
    document.getElementById('upgrade-overlay').style.display = 'flex';
  }

  function refreshUpgradeOptions() {
    const options = generateUpgradeOptions();
    if (options.length === 0) {
      closeUpgradeMenu();
      return;
    }
    const title = document.getElementById('upgrade-title');
    if (title) title.textContent = `选择一项升级 (${state.player.skillPoints}点可用)`;
    const cont = document.getElementById('upgrade-options');
    if (cont) {
      cont.innerHTML = '';
      options.forEach(def => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `<div class="weapon-icon-box"><span class="weapon-icon">${getWeaponIcon(def.id)}</span></div><div class="weapon-name">${def.name}</div><div class="status-text">全新!</div>`;
        card.onclick = () => selectUpgrade(def);
        cont.appendChild(card);
      });
    }
  }

  function generateUpgradeOptions() {
    // 如果武器栏已满（4个），返回空数组
    if (state.player.weapons.length >= 4) {
      return [];
    }
    const pool = [WEAPONS.SWIFT, WEAPONS.FIRE, WEAPONS.FROST, WEAPONS.VAMPIRE, WEAPONS.POISON, WEAPONS.STEEL, WEAPONS.DARK, WEAPONS.LIGHTNING, WEAPONS.LIGHT].filter(w => !state.player.weapons.some(pw => pw.def.id === w.id));
    return pool.sort(() => Math.random() - 0.5).slice(0, 4);
  }

  function selectUpgrade(def) {
    // 基础校验：必须有技能点，武器栏未满，且不能拥有重复武器
    if (state.player.skillPoints <= 0) return;
    if (state.player.weapons.length >= 4) {
      log('武器栏已满！无法再获得新武器。', 'damage');
      closeUpgradeMenu();
      return;
    }
    if (state.player.weapons.some(pw => pw.def.id === def.id)) return;

    state.player.weapons.push({ def, name: def.name, color: def.color, cooldown: 0 });
    state.player.skillPoints--;

    log(`获得了新武器：${def.name}！`, 'important');
    log(`使用了 1 点技能点，剩余 ${state.player.skillPoints} 点。`, 'normal');

    // 立即清空选项，防止连点
    const cont = document.getElementById('upgrade-options');
    if (cont) cont.innerHTML = '';

    // 检查是否武器栏已满（刚选的这个可能让栏位满了）
    if (state.player.weapons.length >= 4) {
      log('武器栏已满！', 'normal');
      closeUpgradeMenu();
      updateUI();
      return;
    }

    if (state.player.skillPoints > 0 && generateUpgradeOptions().length > 0) {
      // 延迟刷新，给玩家一点反馈时间
      setTimeout(() => {
        refreshUpgradeOptions();
        updateUI();
      }, 100);
    } else {
      closeUpgradeMenu();
      updateUI();
    }
  }

  function closeUpgradeMenu() { state.paused = false; document.getElementById('upgrade-overlay').style.display = 'none'; }

  function getWeaponIcon(id) {
    switch (id) {
      case 'basic': return '⚪';
      case 'swift': return '🍃';
      case 'fire': return '🔥';
      case 'frost': return '❄️';
      case 'vampire': return '🩸';
      case 'poison': return '☠️';
      case 'steel': return '🔩';
      case 'dark': return '🌑';
      case 'lightning': return '⚡';
      case 'light': return '✨';
      case 'rock': return '🪨';  // 岩石武器
      case 'ghost': return '👻';  // 幽灵武器
      case 'cell': return '🦠';  // 细胞武器
      case 'bomb': return '💣';
      case 'storm': return '⛈️';
      case 'poison_mist': return '☁️';
      case 'blizzard': return '🌨️';
      case 'inferno': return '🔴';
      case 'frostfire': return '💠';
      default: return '⚔️';
    }
  }

  let currentActiveChest = null;
  function openChestMenu(chest) {
    if (state.paused) return;
    currentActiveChest = chest;
    state.paused = true;

    // 检测是否有可用的进化配方
    const availableFusions = getAvailableFusions(state.player.weapons);
    const fusionOption = document.querySelector('.reward-card[onclick*="fusion"]');

    if (fusionOption) {
      if (availableFusions.length > 0) {
        // 有可用进化，显示选项
        fusionOption.style.display = 'flex';
      } else {
        // 没有可用进化，隐藏选项
        fusionOption.style.display = 'none';
      }
    }

    document.getElementById('chest-overlay').style.display = 'flex';
  }

  window.selectChestReward = function (type) {
    if (type === 'gold') {
      state.player.gold += 1000;
      log('从宝箱中获得了 1000 金币！', 'important');
      closeChestMenu(true);
    } else if (type === 'fusion') {
      // 打开进化菜单
      openFusionMenu();
    }
  };

  function closeChestMenu(consume) {
    state.paused = false; document.getElementById('chest-overlay').style.display = 'none';
    if (currentActiveChest) {
      if (consume) {
        const idx = state.entities.indexOf(currentActiveChest);
        if (idx > -1) state.entities.splice(idx, 1);
      } else {
        // 如果是快捷关闭，给该宝箱设置1秒的再次触发CD（60帧）
        currentActiveChest.interactionCooldown = 60;
      }
    }
    currentActiveChest = null; updateUI();
  }

  // ============================================
  // 武器进化系统
  // ============================================
  // 进化武器选择
  function openFusionMenu() {
    // 检测可用的进化配方
    const availableFusions = getAvailableFusions(state.player.weapons);

    if (availableFusions.length === 0) {
      log('当前武器无法进化，需要特定组合的武器！', 'normal');
      return;
    }

    // 立即消耗宝箱（因为这是二选一，选择进化就意味着放弃其他奖励）
    if (currentActiveChest) {
      const idx = state.entities.indexOf(currentActiveChest);
      if (idx > -1) state.entities.splice(idx, 1);
      currentActiveChest = null;
    }

    // 关闭宝箱菜单
    closeChestMenu(false);

    // 保持游戏暂停状态
    state.paused = true;

    // 显示进化选项
    showFusionOptions(availableFusions);
    document.getElementById('fusion-overlay').style.display = 'flex';
  }

  function showFusionOptions(fusionRecipes) {
    const container = document.getElementById('fusion-options');
    container.innerHTML = '';

    fusionRecipes.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'fusion-card';

      // 材料图标（使用+号连接）
      const materialsHTML = recipe.materials.map(matId => {
        const icon = getWeaponIcon(matId);
        return `<span class="fusion-material-icon">${icon}</span>`;
      }).join('<span class="fusion-plus">+</span>');

      // 结果图标
      const resultIcon = getWeaponIcon(recipe.result);
      const resultWeaponKey = Object.keys(WEAPONS).find(key => WEAPONS[key].id === recipe.result);
      const resultName = resultWeaponKey ? WEAPONS[resultWeaponKey].name : '未知';

      card.innerHTML = `
        <div class="fusion-materials">${materialsHTML}</div>
        <div class="fusion-result">
          <div class="fusion-result-icon">${resultIcon}</div>
          <div class="fusion-result-name">${resultName}</div>
        </div>
        <div class="fusion-description">${recipe.description}</div>
      `;

      card.onclick = () => selectFusion(recipe);
      container.appendChild(card);
    });
  }

  function selectFusion(recipe) {
    // 执行进化
    const result = performFusion(state.player.weapons, recipe);

    if (result.success) {
      log(result.message, 'important');
      log(`消耗武器：${recipe.materials.map(id => {
        const key = Object.keys(WEAPONS).find(k => WEAPONS[k].id === id);
        return WEAPONS[key] ? WEAPONS[key].name : id;
      }).join(', ')}`, 'normal');

      updateWeaponUI();
      closeFusionMenu();
    } else {
      log(`进化失败：${result.message}`, 'damage');
    }
  }

  function closeFusionMenu() {
    document.getElementById('fusion-overlay').style.display = 'none';
    // 只在关闭弹窗时才恢复游戏
    state.paused = false;
  }

  function gameOver() {
    state.running = false;
    const distance = Math.floor(state.scrollY / TILE_SIZE);
    document.getElementById('death-text').textContent = `你倒下了！等级 ${state.player.level}，行进了 ${distance} 格，获得了 ${state.player.gold} 金币。`;
    document.getElementById('death-overlay').style.display = 'flex';
  }

  function restart() {
    state.player = {
      x: 0, y: 0, radius: 12, speed: 3, hp: 100, maxHp: 100, level: 1, exp: 0, expToNext: 10,
      attack: 5, defense: 2, skillPoints: 0, gold: 0, lastChestDistance: 0, nextChestDistance: 10 + Math.random() * 40,
      weapons: [{ def: WEAPONS.CELL, name: WEAPONS.CELL.name, color: WEAPONS.CELL.color, cooldown: 0 }],
      lastDamageTime: 0, invulnerableTime: 60
    };
    state.bullets = []; state.entities = []; state.lifeStealParticles = []; state.lightningEffects = []; state.explosionEffects = []; state.scrollY = 0; state.lastSpawnY = 0; state.lastChunkY = -CHUNK_SIZE;
    state.running = true; document.getElementById('death-overlay').style.display = 'none';
    document.getElementById('log-content').innerHTML = ''; initMap(); updateUI();
  }

  function draw() {
    const { width: W, height: H } = canvas;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, W, H);

    const startTileY = Math.floor(state.scrollY / TILE_SIZE);
    const endTileY = Math.floor((state.scrollY + H) / TILE_SIZE) + 1;
    state.mapChunks.forEach(chunk => {
      if (chunk.y + CHUNK_SIZE >= startTileY && chunk.y <= endTileY) {
        for (let ty = 0; ty < CHUNK_SIZE; ty++) {
          for (let tx = 0; tx < MAP_WIDTH; tx++) {
            const sy = (chunk.y + ty) * TILE_SIZE - state.scrollY;
            if (sy > -TILE_SIZE && sy < H) {
              ctx.fillStyle = chunk.tiles[ty][tx] === TILE.WALL ? '#333' : '#2a2a2a';
              ctx.fillRect(tx * TILE_SIZE, sy, TILE_SIZE, TILE_SIZE);
              if (chunk.tiles[ty][tx] === TILE.WALL) { ctx.strokeStyle = '#555'; ctx.strokeRect(tx * TILE_SIZE, sy, TILE_SIZE, TILE_SIZE); }
            }
          }
        }
      }
    });

    // 绘制爆炸特效
    state.explosionEffects.forEach(effect => {
      const screenY = effect.y - state.scrollY;

      if (effect.type === 'earth') {
        // 碎土特效（岩石武器）
        const alpha = effect.life / 15;
        const gradient = ctx.createRadialGradient(effect.x, screenY, 0, effect.x, screenY, effect.radius);
        gradient.addColorStop(0, `rgba(139, 69, 19, ${alpha * 0.9})`);   // 深棕色
        gradient.addColorStop(0.5, `rgba(160, 82, 45, ${alpha * 0.6})`);  // 中等棕色
        gradient.addColorStop(1, `rgba(139, 69, 19, 0)`);                 // 透明
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(effect.x, screenY, effect.radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制碎土粒子（四散）
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2;
          const dist = effect.radius * 0.8;
          const px = effect.x + Math.cos(angle) * dist;
          const py = screenY + Math.sin(angle) * dist;

          ctx.fillStyle = `rgba(101, 67, 33, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // 绘制外环
        ctx.strokeStyle = `rgba(139, 69, 19, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.x, screenY, effect.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === 'ray') {
        // 射线激光特效
        const alpha = effect.life / 10;
        const endScreenY = effect.endY - state.scrollY;

        // 绘制激光核心（亮橙色实线）
        ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(effect.x, screenY);
        ctx.lineTo(effect.endX, endScreenY);
        ctx.stroke();

        // 绘制激光外发光（橙黄色柔和外围）
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(255, 165, 0, ${alpha * 0.8})`;
        ctx.strokeStyle = `rgba(255, 165, 0, ${alpha * 0.6})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(effect.x, screenY);
        ctx.lineTo(effect.endX, endScreenY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 绘制内部白光核心（模拟强光）
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(effect.x, screenY);
        ctx.lineTo(effect.endX, endScreenY);
        ctx.stroke();

        // 绘制起点和终点的光晕
        const pointGradient1 = ctx.createRadialGradient(effect.x, screenY, 0, effect.x, screenY, 12);
        pointGradient1.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        pointGradient1.addColorStop(0.5, `rgba(255, 165, 0, ${alpha * 0.6})`);
        pointGradient1.addColorStop(1, 'rgba(255, 165, 0, 0)');
        ctx.fillStyle = pointGradient1;
        ctx.beginPath();
        ctx.arc(effect.x, screenY, 12, 0, Math.PI * 2);
        ctx.fill();

        const pointGradient2 = ctx.createRadialGradient(effect.endX, endScreenY, 0, effect.endX, endScreenY, 12);
        pointGradient2.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        pointGradient2.addColorStop(0.5, `rgba(255, 165, 0, ${alpha * 0.6})`);
        pointGradient2.addColorStop(1, 'rgba(255, 165, 0, 0)');
        ctx.fillStyle = pointGradient2;
        ctx.beginPath();
        ctx.arc(effect.endX, endScreenY, 12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 普通爆炸特效
        const alpha = effect.life / 20;
        const gradient = ctx.createRadialGradient(effect.x, screenY, 0, effect.x, screenY, effect.radius);
        gradient.addColorStop(0, `rgba(255, 150, 0, ${alpha * 0.8})`);
        gradient.addColorStop(0.5, `rgba(255, 69, 0, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(effect.x, screenY, effect.radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制爆炸外环
        ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, screenY, effect.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // 绘制闪电特效
    state.lightningEffects.forEach(effect => {
      effect.chains.forEach(chain => {
        const fromX = chain.from.x;
        const fromY = chain.from.y - state.scrollY;
        const toX = chain.to.x;
        const toY = chain.to.y - state.scrollY;

        // 绘制闪电路径（曲折效果）
        const segments = 5;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);

        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const x = fromX + (toX - fromX) * t + (Math.random() - 0.5) * 15;
          const y = fromY + (toY - fromY) * t + (Math.random() - 0.5) * 15;
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 外发光效果
        ctx.strokeStyle = 'rgba(255, 255, 100, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();
      });
    });

    // 绘制吸血粒子
    state.lifeStealParticles.forEach(p => {
      const screenY = p.y - state.scrollY;

      // 绘制拖尾（更细更透明）
      if (p.trail.length > 1) {
        ctx.strokeStyle = '#ff000020';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        p.trail.forEach((pt, idx) => {
          const ty = pt.y - state.scrollY;
          if (idx === 0) {
            ctx.moveTo(pt.x, ty);
          } else {
            ctx.lineTo(pt.x, ty);
          }
        });
        ctx.stroke();
      }

      // 绘制粒子本体（更小更柔和）
      const gradient = ctx.createRadialGradient(p.x, screenY, 0, p.x, screenY, 4);
      gradient.addColorStop(0, 'rgba(255, 100, 100, 0.7)');
      gradient.addColorStop(0.6, 'rgba(200, 50, 50, 0.4)');
      gradient.addColorStop(1, 'rgba(139, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, screenY, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 绘制子弹（转换为屏幕坐标）
    state.bullets.forEach(bullet => {
      const screenY = bullet.y - state.scrollY;
      const screenX = bullet.x;

      if (screenY > -20 && screenY < H + 20 && screenX > -20 && screenX < W + 20) {
        const isBlizzard = bullet.color === '#4da6ff';
        const isInferno = bullet.color === '#cc0000';
        const isFrostfire = bullet.color === '#00ccff';
        const isLight = bullet.color === '#ffffaa';
        const isBomb = bullet.color === '#ff4500';
        const isStorm = bullet.color === '#4169e1';
        const isPoisonMist = bullet.color === '#00ff00' && bullet.piercing;
        const radius = bullet.radius || 4;
        const time = state.gameTime;

        if (isBlizzard) {
          const bTime = time * 0.05;
          ctx.fillStyle = 'rgba(10, 20, 40, 0.8)';
          ctx.beginPath(); ctx.arc(screenX, screenY, radius * 0.3, 0, Math.PI * 2); ctx.fill();
          const particleCount = 12;
          for (let layer = 0; layer < 2; layer++) {
            const layerRadius = radius * (0.6 + layer * 0.4);
            for (let i = 0; i < particleCount; i++) {
              const angle = (Math.PI * 2 / particleCount) * i + bTime * (1 + layer);
              const px = screenX + Math.cos(angle) * layerRadius;
              const py = screenY + Math.sin(angle) * layerRadius;
              ctx.fillStyle = ['#fff', '#0ff', '#4da6ff'][i % 3];
              ctx.fillRect(px - 1, py - 1, 2, 2);
            }
          }
          const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 1.5);
          gradient.addColorStop(0, 'rgba(77, 166, 255, 0.4)');
          gradient.addColorStop(1, 'rgba(0, 100, 200, 0)');
          ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(screenX, screenY, radius * 1.5, 0, Math.PI * 2); ctx.fill();
        } else if (isInferno) {
          const iTime = time * 0.1;
          for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i + iTime;
            const dist = radius * (0.5 + Math.random() * 0.5);
            ctx.fillStyle = `rgba(255, ${100 + Math.random() * 155}, 0, 0.6)`;
            ctx.fillRect(screenX + Math.cos(angle) * dist - 2, screenY + Math.sin(angle) * dist - 2, 4, 4);
          }
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(screenX, screenY, radius * 0.3, 0, Math.PI * 2); ctx.fill();
          const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 1.8);
          gradient.addColorStop(0, 'rgba(255, 50, 0, 0.5)');
          gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
          ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(screenX, screenY, radius * 1.8, 0, Math.PI * 2); ctx.fill();
        } else if (isFrostfire) {
          const fTime = time * 0.08;
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i + fTime;
            const dist = radius * (0.6 + Math.sin(fTime + i) * 0.3);
            ctx.fillStyle = i % 2 === 0 ? '#00ccff' : '#fff';
            ctx.fillRect(screenX + Math.cos(angle) * dist - 1.5, screenY + Math.sin(angle) * dist - 1.5, 3, 3);
          }
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(screenX, screenY, radius * 0.4, 0, Math.PI * 2); ctx.fill();
          const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 1.6);
          gradient.addColorStop(0, 'rgba(0, 200, 255, 0.4)');
          gradient.addColorStop(1, 'rgba(0, 50, 255, 0)');
          ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(screenX, screenY, radius * 1.6, 0, Math.PI * 2); ctx.fill();
        } else if (isLight) {
          // 光芒武器：发光特效
          const lTime = time * 0.1;
          // 外发光光晕
          const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 2.5);
          gradient.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
          gradient.addColorStop(0.5, 'rgba(255, 255, 170, 0.3)');
          gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath(); ctx.arc(screenX, screenY, radius * 2.5, 0, Math.PI * 2); ctx.fill();
          // 核心
          ctx.fillStyle = '#ffffee';
          ctx.beginPath(); ctx.arc(screenX, screenY, radius, 0, Math.PI * 2); ctx.fill();
          // 闪烁粒子
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + lTime;
            const px = screenX + Math.cos(angle) * radius * 1.5;
            const py = screenY + Math.sin(angle) * radius * 1.5;
            ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
          }
        } else if (isBomb) {
          // 炸弹武器：圆形炸弹+引线
          // 绘制炸弹本体
          ctx.fillStyle = '#ff4500';
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fill();
          // 绘制高光
          ctx.fillStyle = '#ff6347';
          ctx.beginPath();
          ctx.arc(screenX - 2, screenY - 2, radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          // 绘制引线
          ctx.strokeStyle = '#8b4513';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - radius);
          ctx.lineTo(screenX, screenY - radius - 5);
          ctx.stroke();
          // 引线火花
          if (Math.random() > 0.5) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(screenX, screenY - radius - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (isStorm) {
          // 风暴武器：乌云+闪电效果
          const sTime = time * 0.08;
          // 乌云效果
          ctx.fillStyle = 'rgba(65, 105, 225, 0.6)';
          ctx.beginPath(); ctx.arc(screenX, screenY, radius, 0, Math.PI * 2); ctx.fill();
          // 闪电粒子
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + sTime;
            const dist = radius * (0.7 + Math.sin(sTime + i) * 0.3);
            ctx.fillStyle = i % 2 === 0 ? '#ffff00' : '#fff';
            ctx.fillRect(screenX + Math.cos(angle) * dist - 1.5, screenY + Math.sin(angle) * dist - 1.5, 3, 3);
          }
          // 外发光
          const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 1.8);
          gradient.addColorStop(0, 'rgba(100, 149, 237, 0.4)');
          gradient.addColorStop(1, 'rgba(65, 105, 225, 0)');
          ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(screenX, screenY, radius * 1.8, 0, Math.PI * 2); ctx.fill();
        } else if (isPoisonMist) {
          // 毒雾武器：绿色云雾+骷髅标识
          const pTime = time * 0.1;

          // 底部浓密绿色云雾效果
          for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 / 16) * i + pTime;
            const dist = radius * (0.6 + Math.sin(pTime * 2 + i) * 0.3);
            const px = screenX + Math.cos(angle) * dist;
            const py = screenY + Math.sin(angle) * dist;
            const cloudSize = radius * (0.25 + Math.random() * 0.15);
            ctx.fillStyle = `rgba(0, 255, 0, ${0.4 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, py, cloudSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // 中心绿色云团
          const cloudGradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 0.8);
          cloudGradient.addColorStop(0, 'rgba(0, 255, 0, 0.7)');
          cloudGradient.addColorStop(0.6, 'rgba(0, 200, 0, 0.5)');
          cloudGradient.addColorStop(1, 'rgba(0, 150, 0, 0.2)');
          ctx.fillStyle = cloudGradient;
          ctx.beginPath(); ctx.arc(screenX, screenY, radius * 0.8, 0, Math.PI * 2); ctx.fill();

          // 上方骷髅标识
          ctx.fillStyle = '#00ff00';
          ctx.font = `${radius * 1.5}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#00ff00';
          ctx.shadowBlur = 5;
          ctx.fillText('☠', screenX, screenY - radius * 0.3);
          ctx.shadowBlur = 0;

          // 外层绿色发光
          const outerGradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 2.2);
          outerGradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
          outerGradient.addColorStop(0.5, 'rgba(0, 200, 0, 0.15)');
          outerGradient.addColorStop(1, 'rgba(0, 150, 0, 0)');
          ctx.fillStyle = outerGradient; ctx.beginPath(); ctx.arc(screenX, screenY, radius * 2.2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = bullet.color || '#ffff00';
          ctx.beginPath(); ctx.arc(screenX, screenY, radius, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath(); ctx.arc(screenX, screenY, radius * 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    });


    state.entities.forEach(e => {
      const sx = e.x, sy = e.y - state.scrollY;
      if (sy > -50 && sy < H + 50) {
        if (e.type === ENTITY.CHEST) {
          ctx.fillStyle = '#cd7f32'; ctx.fillRect(sx - 15, sy - 10, 30, 20);
          ctx.fillStyle = '#ffd700'; ctx.fillRect(sx - 4, sy - 4, 8, 8);
          ctx.strokeStyle = '#5d4037'; ctx.strokeRect(sx - 15, sy - 10, 30, 20);
          ctx.shadowBlur = 5 + Math.sin(state.gameTime * 0.1) * 5; ctx.shadowColor = '#ffd700';
          ctx.strokeStyle = `rgba(255, 215, 0, 0.5)`; ctx.strokeRect(sx - 17, sy - 12, 34, 24); ctx.shadowBlur = 0;
        } else {
          // 绘制敌人
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
          ctx.fill();

          // 绘制血条
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(sx - e.radius, sy - e.radius - 8, e.radius * 2, 3);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(sx - e.radius, sy - e.radius - 8, e.radius * 2 * (e.hp / e.maxHp), 3);

          if (e.frozen) {
            // 冰冻特效：深蓝遮罩 + 冰刺
            ctx.fillStyle = 'rgba(0, 150, 255, 0.5)';
            ctx.beginPath(); ctx.arc(sx, sy, e.radius + 2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI * 2 / 6) * i + state.gameTime * 0.02;
              ctx.beginPath();
              ctx.moveTo(sx + Math.cos(angle) * e.radius, sy + Math.sin(angle) * e.radius);
              ctx.lineTo(sx + Math.cos(angle) * (e.radius + 6), sy + Math.sin(angle) * (e.radius + 6));
              ctx.stroke();
            }
          }

          if (e.burning) {
            // 燃烧特效：粒子火焰
            const fTime = state.gameTime * 0.15;
            const bCol = e.burnColor || '#ff6600';
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 / 8) * i + fTime;
              const h = 5 + Math.sin(fTime + i) * 5;
              const bx = sx + Math.cos(angle) * e.radius * 0.8;
              const by = sy + Math.sin(angle) * e.radius * 0.8;
              ctx.fillStyle = bCol;
              ctx.beginPath();
              ctx.moveTo(bx - 2, by);
              ctx.lineTo(bx + 2, by);
              ctx.lineTo(bx, by - h);
              ctx.fill();
            }
            // 核心光晕
            ctx.fillStyle = bCol + '44'; // 25% 不透明度
            ctx.beginPath(); ctx.arc(sx, sy, e.radius * 1.3, 0, Math.PI * 2); ctx.fill();
          }

          if (e.poisonStacks > 0) {
            // 中毒特效：绿色半透明遮罩
            const poisonAlpha = Math.min(0.6, 0.2 + e.poisonStacks * 0.004); // 层数越多越明显
            ctx.fillStyle = `rgba(0, 255, 0, ${poisonAlpha})`;
            ctx.beginPath(); ctx.arc(sx, sy, e.radius + 2, 0, Math.PI * 2); ctx.fill();
          }

          if (e.blinded) {
            // 致盲标识：敌人上方显示禁止符号
            const iconY = sy - e.radius - 8;
            // 绘制红色圆圈
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx, iconY, 7, 0, Math.PI * 2);
            ctx.stroke();
            // 绘制斜线
            ctx.beginPath();
            ctx.moveTo(sx - 5, iconY - 5);
            ctx.lineTo(sx + 5, iconY + 5);
            ctx.stroke();
            // 绘制眼睛图标（更小）
            ctx.font = '10px Arial';
            ctx.fillStyle = '#ffffaa';
            ctx.textAlign = 'center';
            ctx.fillText('👁️', sx, iconY + 3);
          }
        }
      }
    });

    const isInvul = state.player.lastDamageTime > 0;
    if (!isInvul || Math.floor(state.gameTime / 5) % 2 === 0) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00aaff';
      ctx.fillStyle = '#00aaff';
      ctx.beginPath(); ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    // 绘制移动边界黑雾（在屏幕60%高度以下，提示玩家向下移动会死）
    const boundaryY = H * 0.6;
    const fogGradient = ctx.createLinearGradient(0, boundaryY, 0, H);
    fogGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fogGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, boundaryY, W, H - boundaryY);
  }

  function gameLoop() {
    if (state.running) {
      state.gameTime++;
      updateScroll(); ensureMapChunks(); spawnEnemies(); updatePlayer();
      autoShoot(); updateBullets(); updateEnemies(); updateLifeStealParticles(); updateLightningEffects(); updateExplosionEffects();
    }
    draw(); requestAnimationFrame(gameLoop);
  }

  document.addEventListener('keydown', e => {
    state.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'e') openUpgradeMenu();
    if (e.key === 'Escape') {
      closeUpgradeMenu();
      closeChestMenu(false);
      closeFusionMenu();
    }
  });
  document.addEventListener('keyup', e => state.keys[e.key.toLowerCase()] = false);

  document.getElementById('restart-btn').onclick = restart;
  document.getElementById('fusion-close').onclick = closeFusionMenu;

  function init() {
    initMap(); updateUI();
    log('测试模式：每 10-50 距离出现一个宝箱。', 'important');
    gameLoop();
  }
  init();
})();
