// ============================================
// 敌人系统配置表
// ============================================

/**
 * 敌人类型定义表
 * 包含所有敌人的属性定义
 * 
 * 属性说明：
 * - name: 敌人名称
 * - hp: 初始生命值
 * - maxHp: 最大生命值
 * - attack: 攻击力
 * - defense: 防御力
 * - exp: 击败后获得的经验值
 * - gold: 击败后获得的金币
 * - color: 显示颜色（十六进制）
 * - speed: 移动速度
 * - radius: 碰撞半径
 */
const ENEMY_TYPES = [
    {
        name: '史莱姆',
        hp: 50,
        maxHp: 50,
        attack: 2,
        defense: 0,
        exp: 5,
        gold: 2,
        color: '#00ff00',
        speed: 0.6,
        radius: 10
    },
    {
        name: '哥布林',
        hp: 150,
        maxHp: 150,
        attack: 5,
        defense: 1,
        exp: 10,
        gold: 5,
        color: '#00aa00',
        speed: 0.8,
        radius: 12
    },
    {
        name: '骷髅',
        hp: 300,
        maxHp: 300,
        attack: 8,
        defense: 2,
        exp: 20,
        gold: 10,
        color: '#cccccc',
        speed: 0.9,
        radius: 13
    },
    {
        name: '暗影',
        hp: 600,
        maxHp: 600,
        attack: 10,
        defense: 2,
        exp: 28,
        gold: 15,
        color: '#6600cc',
        speed: 1.0,
        radius: 14
    },
    {
        name: '恶魔',
        hp: 1000,
        maxHp: 1000,
        attack: 12,
        defense: 3,
        exp: 35,
        gold: 20,
        color: '#ff0000',
        speed: 1.0,
        radius: 14
    }
];

// ============================================
// 敌人生成配置
// ============================================

/**
 * 根据距离（距离）计算敌人生成权重
 * 游戏初期生成弱敌，后期逐渐增加强敌
 */
const ENEMY_SPAWN_CONFIG = {
    // 敌人解锁距离阈值
    // 🧪 测试模式：快速解锁所有敌人类型
    unlockThresholds: [
        { distance: 0, maxTier: 0 },      // 0距离：只有史莱姆
        { distance: 20, maxTier: 1 },     // 20距离：解锁哥布林 (测试模式)
        { distance: 50, maxTier: 2 },     // 50距离：解锁骷髅 (测试模式)
        { distance: 70, maxTier: 3 },     // 70距离：解锁暗影 (测试模式)
        { distance: 100, maxTier: 4 }     // 100距离：解锁恶魔 (测试模式)
    ]

    // 📝 正式模式配置（取消注释以下配置，并注释上面的测试配置）
    // unlockThresholds: [
    //     { distance: 0, maxTier: 0 },      // 0距离：只有史莱姆
    //     { distance: 500, maxTier: 1 },    // 500距离：解锁哥布林
    //     { distance: 1500, maxTier: 2 },   // 1500距离：解锁骷髅
    //     { distance: 3000, maxTier: 3 },   // 3000距离：解锁暗影
    //     { distance: 5000, maxTier: 4 }    // 5000距离：解锁恶魔
    // ]
};

// ============================================
// 工具函数
// ============================================

/**
 * 根据索引获取敌人类型
 * @param {number} index - 敌人类型索引
 * @returns {object|null} 敌人类型对象
 */
function getEnemyType(index) {
    if (index >= 0 && index < ENEMY_TYPES.length) {
        return { ...ENEMY_TYPES[index] }; // 返回副本，避免修改原始数据
    }
    return null;
}

/**
 * 根据名称获取敌人类型
 * @param {string} name - 敌人名称
 * @returns {object|null} 敌人类型对象
 */
function getEnemyTypeByName(name) {
    const enemy = ENEMY_TYPES.find(e => e.name === name);
    return enemy ? { ...enemy } : null;
}

/**
 * 获取当前距离下可生成的敌人类型范围
 * @param {number} distance - 当前游戏距离
 * @returns {number} 最大可生成敌人等级（索引）
 */
function getMaxEnemyTier(distance) {
    for (let i = ENEMY_SPAWN_CONFIG.unlockThresholds.length - 1; i >= 0; i--) {
        if (distance >= ENEMY_SPAWN_CONFIG.unlockThresholds[i].distance) {
            return ENEMY_SPAWN_CONFIG.unlockThresholds[i].maxTier;
        }
    }
    return 0; // 默认只能生成史莱姆
}

/**
 * 根据当前距离随机选择一个敌人类型
 * @param {number} distance - 当前游戏距离
 * @returns {object} 随机选择的敌人类型对象
 */
function getRandomEnemyType(distance) {
    const maxTier = getMaxEnemyTier(distance);
    const randomIndex = Math.floor(Math.random() * (maxTier + 1));
    return getEnemyType(randomIndex);
}

/**
 * 获取所有敌人类型的数量
 * @returns {number} 敌人类型总数
 */
function getEnemyTypeCount() {
    return ENEMY_TYPES.length;
}

/**
 * 获取所有敌人类型列表（只读）
 * @returns {Array} 敌人类型数组的副本
 */
function getAllEnemyTypes() {
    return ENEMY_TYPES.map(e => ({ ...e }));
}

// ============================================
// 导出配置（浏览器环境）
// ============================================

if (typeof window !== 'undefined') {
    window.ENEMY_TYPES = ENEMY_TYPES;
    window.ENEMY_SPAWN_CONFIG = ENEMY_SPAWN_CONFIG;
    window.getEnemyType = getEnemyType;
    window.getEnemyTypeByName = getEnemyTypeByName;
    window.getMaxEnemyTier = getMaxEnemyTier;
    window.getRandomEnemyType = getRandomEnemyType;
    window.getEnemyTypeCount = getEnemyTypeCount;
    window.getAllEnemyTypes = getAllEnemyTypes;
}
