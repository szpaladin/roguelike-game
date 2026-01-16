// ============================================
// 武器系统配置表
// ============================================

/**
 * 武器定义表
 * 包含所有武器的属性定义
 */
const WEAPONS = {
    // === 基础武器 ===
    BASIC: {
        id: 'basic',
        name: '普通弹珠',
        damage: 1,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#ffff00',
        lifetime: 120,
        piercing: false
    },

    FIRE: {
        id: 'fire',
        name: '火焰',
        damage: 1.0,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#ff6600',
        lifetime: 120,
        piercing: false,
        burnDuration: 300,
        burnDamagePerFrame: 5 / 60
    },

    FROST: {
        id: 'frost',
        name: '冰霜',
        damage: 1.0,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#00ccff',
        lifetime: 120,
        piercing: false,
        freezeChance: 0.3,
        freezeDuration: 120,
        vulnerability: 0.25
    },

    SWIFT: {
        id: 'swift',
        name: '疾风',
        damage: 0.6,
        interval: 20,
        speed: 12,
        radius: 4,
        color: '#00ff00',
        lifetime: 120,
        piercing: true
    },

    VAMPIRE: {
        id: 'vampire',
        name: '吸血',
        damage: 1.0,
        interval: 30,
        speed: 6,
        radius: 4,
        color: '#8b0000',
        lifetime: 120,
        piercing: false,
        lifeStealChance: 0.06,
        lifeStealAmount: 1
    },

    POISON: {
        id: 'poison',
        name: '剧毒',
        damage: 0.5,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#00ff00',
        lifetime: 120,
        piercing: false,
        poisonDuration: 900,
        poisonDamagePerStack: 3 / 60
    },

    STEEL: {
        id: 'steel',
        name: '钢铁',
        damage: 3.0,
        interval: 90,
        speed: 6,
        radius: 6,
        color: '#c0c0c0',
        lifetime: 100,
        piercing: false
    },

    DARK: {
        id: 'dark',
        name: '黑暗',
        damage: 2.0,
        interval: 60,
        speed: 5,
        radius: 5,
        color: '#4b0082',
        lifetime: 150,
        piercing: false
    },

    LIGHTNING: {
        id: 'lightning',
        name: '闪电',
        damage: 1.0,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#ffff00',
        lifetime: 120,
        piercing: false,
        chainCount: 3,
        chainRange: 150,
        chainCooldown: 10
    },

    LIGHT: {
        id: 'light',
        name: '光芒',
        damage: 1.0,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#ffffaa',
        lifetime: 120,
        piercing: false,
        blindChance: 0.5,
        blindDuration: 180
    },

    // === 新武器：岩石 ===
    ROCK: {
        id: 'rock',
        name: '岩石',
        damage: 0.8,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#8B4513',  // 棕色
        lifetime: 120,
        piercing: false,
        // AOE 伤害配置
        aoeRadius: 80,      // AOE 范围半径
        aoeDamage: 0.8      // AOE 伤害倍率（与主伤害相同）
    },

    // === 新武器：幽灵 ===
    GHOST: {
        id: 'ghost',
        name: '幽灵',
        damage: 1.0,
        interval: 30,
        speed: 12,          // 快速
        radius: 4,
        color: '#1E3A8A',   // 深蓝色
        lifetime: 120,
        piercing: true      // 穿透多个敌人
    },

    // === 新武器：射线 ===
    RAY: {
        id: 'ray',
        name: '射线',
        damage: 0.8,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#FFA500',   // 橙黄色
        lifetime: 120,
        piercing: false,
        // 射线机制配置
        rayRange: 300,      // 寻找目标的最大范围
        rayLength: 600,     // 射线延长的最大长度
        rayWidth: 10        // 射线判定宽度
    },

    // === 新武器：细胞 ===
    CELL: {
        id: 'cell',
        name: '细胞',
        damage: 0.8,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#20B2AA',   // 青绿色 (LightSeaGreen)
        lifetime: 120,
        piercing: false,
        // 分裂机制配置
        canSplit: true,
        splitCount: 2,      // 分裂出的子弹数量
        splitRange: 200     // 寻找分裂目标的范围
    },

    // === 进化武器 ===
    BOMB: {
        id: 'bomb',
        name: '炸弹',
        damage: 3.0,
        interval: 90,
        speed: 8,
        radius: 6,
        color: '#ff4500',
        lifetime: 120,
        piercing: false,
        explosionRadius: 100,
        explosionDamage: 2.0
    },

    STORM: {
        id: 'storm',
        name: '风暴',
        damage: 0.75,
        interval: 20,
        speed: 12,
        radius: 12,
        color: '#ffff00',
        lifetime: 120,
        piercing: true,
        chainCount: 3,
        chainRange: 150,
        chainCooldown: 10
    },

    POISON_MIST: {
        id: 'poison_mist',
        name: '毒雾',
        damage: 0.75,
        interval: 30,
        speed: 10,
        radius: 12,
        color: '#00ff00',
        lifetime: 120,
        piercing: true,
        poisonDuration: 900,
        poisonDamagePerStack: 3 / 60
    },

    BLIZZARD: {
        id: 'blizzard',
        name: '暴风雪',
        damage: 0.75,
        interval: 20,
        speed: 12,
        radius: 12,
        color: '#00ccff',
        lifetime: 120,
        piercing: true,
        freezeChance: 0.5,
        freezeDuration: 180,
        vulnerability: 0.25
    },

    INFERNO: {
        id: 'inferno',
        name: '炼狱',
        damage: 1.0,
        interval: 30,
        speed: 10,
        radius: 12,
        color: '#cc0000',
        lifetime: 120,
        piercing: true,
        burnDuration: 300,
        burnDamagePerFrame: 5 / 60
    },

    FROSTFIRE: {
        id: 'frostfire',
        name: '燃霜',
        damage: 1.0,
        interval: 30,
        speed: 8,
        radius: 4,
        color: '#00ccff',
        lifetime: 120,
        piercing: false,
        burnDuration: 1200,
        burnDamagePerFrame: 10 / 60,
        burnColor: '#00ccff',
        vulnerability: 0.25
    }
};

// ============================================
// 武器合成配置表
// ============================================

/**
 * 武器ID与序号映射表
 * 每个武器都有唯一的ID和序号，用于合成系统
 */
const WEAPON_ID_MAP = {
    // === 基础武器 (序号 1-11) ===
    BASIC: { id: 'basic', name: '普通弹珠', tier: 0, order: 0 },
    FIRE: { id: 'fire', name: '火焰', tier: 1, order: 1 },
    FROST: { id: 'frost', name: '冰霜', tier: 1, order: 2 },
    SWIFT: { id: 'swift', name: '疾风', tier: 1, order: 3 },
    VAMPIRE: { id: 'vampire', name: '吸血', tier: 1, order: 4 },
    POISON: { id: 'poison', name: '剧毒', tier: 1, order: 5 },
    STEEL: { id: 'steel', name: '钢铁', tier: 1, order: 6 },
    DARK: { id: 'dark', name: '黑暗', tier: 1, order: 7 },
    LIGHTNING: { id: 'lightning', name: '闪电', tier: 1, order: 8 },
    LIGHT: { id: 'light', name: '光芒', tier: 1, order: 9 },
    ROCK: { id: 'rock', name: '岩石', tier: 1, order: 10 },
    GHOST: { id: 'ghost', name: '幽灵', tier: 1, order: 11 },
    RAY: { id: 'ray', name: '射线', tier: 1, order: 12 },
    CELL: { id: 'cell', name: '细胞', tier: 1, order: 13 },

    // === 进化武器 ===
    BLIZZARD: { id: 'blizzard', name: '暴风雪', tier: 2, order: 13 },
    INFERNO: { id: 'inferno', name: '炼狱', tier: 2, order: 14 },
    FROSTFIRE: { id: 'frostfire', name: '燃霜', tier: 2, order: 15 },
    BOMB: { id: 'bomb', name: '炸弹', tier: 2, order: 16 },
    STORM: { id: 'storm', name: '风暴', tier: 2, order: 17 },
    POISON_MIST: { id: 'poison_mist', name: '毒雾', tier: 2, order: 18 }
};

/**
 * 武器合成表
 */
const WEAPON_FUSION_TABLE = [
    {
        id: 'fusion_blizzard',
        name: '暴风雪进化',
        materials: ['swift', 'frost'],
        result: 'blizzard',
        description: '疾风的速度与冰霜的寒冷融合为暴风雪',
        tier: 1,
        icon: '🌨️'
    },
    {
        id: 'fusion_inferno',
        name: '炼狱进化',
        materials: ['swift', 'fire'],
        result: 'inferno',
        description: '疾风的穿透与火焰的灼烧融合为炼狱',
        tier: 1,
        icon: '🔴'
    },
    {
        id: 'fusion_frostfire',
        name: '燃霜进化',
        materials: ['frost', 'fire'],
        result: 'frostfire',
        description: '冰霜与火焰的矛盾融合为燃霜',
        tier: 1,
        icon: '💠'
    },
    {
        id: 'fusion_bomb',
        name: '炸弹进化',
        materials: ['steel', 'fire'],
        result: 'bomb',
        description: '钢铁的威力与火焰的爆炸融合为炸弹',
        tier: 1,
        icon: '💣'
    },
    {
        id: 'fusion_storm',
        name: '风暴进化',
        materials: ['swift', 'lightning'],
        result: 'storm',
        description: '疾风的穿透与闪电的连锁融合为风暴',
        tier: 1,
        icon: '⛈️'
    },
    {
        id: 'fusion_poison_mist',
        name: '毒雾进化',
        materials: ['swift', 'poison'],
        result: 'poison_mist',
        description: '疾风的穿透与剧毒的毒素融合为毒雾',
        tier: 1,
        icon: '☁️'
    }
];

// ============================================
// 工具函数
// ============================================

function getWeaponInfo(weaponId) {
    for (const key in WEAPON_ID_MAP) {
        if (WEAPON_ID_MAP[key].id === weaponId) {
            return WEAPON_ID_MAP[key];
        }
    }
    return null;
}

function getWeaponIdByOrder(order) {
    for (const key in WEAPON_ID_MAP) {
        if (WEAPON_ID_MAP[key].order === order) {
            return WEAPON_ID_MAP[key].id;
        }
    }
    return null;
}

function getAvailableFusions(playerWeapons) {
    const availableFusions = [];
    const playerWeaponIds = playerWeapons.map(w => w.def.id);

    for (const recipe of WEAPON_FUSION_TABLE) {
        const hasAllMaterials = recipe.materials.every(materialId => {
            return playerWeaponIds.includes(materialId);
        });

        if (hasAllMaterials) {
            const afterFusionCount = playerWeapons.length - recipe.materials.length + 1;
            if (afterFusionCount <= 4) {
                availableFusions.push(recipe);
            }
        }
    }

    return availableFusions;
}

function performFusion(playerWeapons, recipe) {
    const playerWeaponIds = playerWeapons.map(w => w.def.id);
    const hasAllMaterials = recipe.materials.every(materialId => {
        return playerWeaponIds.includes(materialId);
    });

    if (!hasAllMaterials) {
        return { success: false, message: '材料不足', newWeapon: null };
    }

    const materialsToRemove = [...recipe.materials];
    for (let i = playerWeapons.length - 1; i >= 0; i--) {
        const weaponId = playerWeapons[i].def.id;
        const materialIndex = materialsToRemove.indexOf(weaponId);

        if (materialIndex !== -1) {
            playerWeapons.splice(i, 1);
            materialsToRemove.splice(materialIndex, 1);
            if (materialsToRemove.length === 0) break;
        }
    }

    const resultWeaponKey = Object.keys(WEAPONS).find(
        key => WEAPONS[key].id === recipe.result
    );

    if (!resultWeaponKey) {
        return { success: false, message: '合成结果武器不存在', newWeapon: null };
    }

    const resultWeaponDef = WEAPONS[resultWeaponKey];

    const newWeapon = {
        def: resultWeaponDef,
        name: resultWeaponDef.name,
        color: resultWeaponDef.color,
        cooldown: 0
    };

    playerWeapons.push(newWeapon);

    return {
        success: true,
        message: `成功合成 ${resultWeaponDef.name}！`,
        newWeapon: newWeapon
    };
}

// ============================================
// 导出配置（浏览器环境）
// ============================================

if (typeof window !== 'undefined') {
    window.WEAPONS = WEAPONS;
    window.WEAPON_ID_MAP = WEAPON_ID_MAP;
    window.WEAPON_FUSION_TABLE = WEAPON_FUSION_TABLE;
    window.getWeaponInfo = getWeaponInfo;
    window.getWeaponIdByOrder = getWeaponIdByOrder;
    window.getAvailableFusions = getAvailableFusions;
    window.performFusion = performFusion;
}
