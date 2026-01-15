// ============================================
// 武器合成配置表
// ============================================

/**
 * 武器ID与序号映射表
 * 每个武器都有唯一的ID和序号，用于合成系统
 */
const WEAPON_ID_MAP = {
    // === 基础武器 (序号 1-4) ===
    BASIC: { id: 'basic', name: '普通弹珠', tier: 1, order: 1 },
    SWIFT: { id: 'swift', name: '疾风', tier: 1, order: 2 },
    FROST: { id: 'frost', name: '冰霜', tier: 1, order: 3 },
    FIRE: { id: 'fire', name: '火焰', tier: 1, order: 4 },

    // === 高级武器 (序号 5-7) ===
    BLIZZARD: { id: 'blizzard', name: '暴风雪', tier: 2, order: 5 },
    INFERNO: { id: 'inferno', name: '炼狱', tier: 2, order: 6 },
    FROSTFIRE: { id: 'frostfire', name: '燃霜', tier: 2, order: 7 },

    // === 未来扩展槽位 (序号 8+) ===
    // 可以在这里添加更多武器
};

/**
 * 武器合成表
 * 
 * 数据结构说明：
 * {
 *   id: 合成配方唯一ID
 *   name: 配方名称（用于显示）
 *   materials: 所需材料武器的ID数组（必须精确匹配）
 *   result: 合成结果武器的ID
 *   description: 配方描述
 *   tier: 配方等级（1=基础合成，2=高级合成，3=终极合成）
 * }
 * 
 * 合成规则：
 * - 合成需要消耗materials中列出的所有武器
 * - 合成后会将materials中的武器从角色武器中移除
 * - 并将result武器添加到角色武器槽中
 * - 如果武器槽已满（4个），合成会失败
 */
const WEAPON_FUSION_TABLE = [
    // ============================================
    // 基础进化：双武器组合 → 高级武器
    // ============================================

    {
        id: 'fusion_blizzard',
        name: '暴风雪进化',
        materials: ['swift', 'frost'],      // 疾风 + 冰霜
        result: 'blizzard',                 // → 暴风雪
        description: '疾风的速度与冰霜的寒冷融合为暴风雪',
        tier: 1,
        icon: '🌨️'
    },

    {
        id: 'fusion_inferno',
        name: '炼狱进化',
        materials: ['swift', 'fire'],       // 疾风 + 火焰
        result: 'inferno',                  // → 炼狱
        description: '疾风的穿透与火焰的灼烧融合为炼狱',
        tier: 1,
        icon: '🔴'
    },

    {
        id: 'fusion_frostfire',
        name: '燃霜进化',
        materials: ['frost', 'fire'],       // 冰霜 + 火焰
        result: 'frostfire',                // → 燃霜
        description: '冰霜与火焰的矛盾融合为燃霜',
        tier: 1,
        icon: '💠'
    },

    {
        id: 'fusion_bomb',
        name: '炸弹进化',
        materials: ['steel', 'fire'],       // 钢铁 + 火焰
        result: 'bomb',                     // → 炸弹
        description: '钢铁的威力与火焰的爆炸融合为炸弹',
        tier: 1,
        icon: '💣'
    },

    {
        id: 'fusion_storm',
        name: '风暴进化',
        materials: ['swift', 'lightning'],  // 疾风 + 闪电
        result: 'storm',                    // → 风暴
        description: '疾风的穿透与闪电的连锁融合为风暴',
        tier: 1,
        icon: '⛈️'
    },

    {
        id: 'fusion_poison_mist',
        name: '毒雾进化',
        materials: ['swift', 'poison'],     // 疾风 + 剧毒
        result: 'poison_mist',              // → 毒雾
        description: '疾风的穿透与剧毒的毒素融合为毒雾',
        tier: 1,
        icon: '☁️'
    }
];

/**
 * 根据武器ID获取武器信息
 * @param {string} weaponId - 武器ID
 * @returns {object|null} 武器信息对象
 */
function getWeaponInfo(weaponId) {
    for (const key in WEAPON_ID_MAP) {
        if (WEAPON_ID_MAP[key].id === weaponId) {
            return WEAPON_ID_MAP[key];
        }
    }
    return null;
}

/**
 * 根据序号获取武器ID
 * @param {number} order - 武器序号
 * @returns {string|null} 武器ID
 */
function getWeaponIdByOrder(order) {
    for (const key in WEAPON_ID_MAP) {
        if (WEAPON_ID_MAP[key].order === order) {
            return WEAPON_ID_MAP[key].id;
        }
    }
    return null;
}

/**
 * 检查玩家当前可以进行的合成
 * @param {Array} playerWeapons - 玩家当前拥有的武器数组（包含武器对象，每个对象有 def: {id: ...} 属性）
 * @returns {Array} 可用的合成配方数组
 */
function getAvailableFusions(playerWeapons) {
    const availableFusions = [];

    // 获取玩家武器的ID列表
    const playerWeaponIds = playerWeapons.map(w => w.def.id);

    // 遍历所有合成配方
    for (const recipe of WEAPON_FUSION_TABLE) {
        // 检查玩家是否拥有所有所需材料
        const hasAllMaterials = recipe.materials.every(materialId => {
            return playerWeaponIds.includes(materialId);
        });

        if (hasAllMaterials) {
            // 检查合成后武器槽是否会溢出
            // 计算：当前武器数 - 消耗材料数 + 1（新武器） <= 4
            const afterFusionCount = playerWeapons.length - recipe.materials.length + 1;

            if (afterFusionCount <= 4) {
                availableFusions.push(recipe);
            }
        }
    }

    return availableFusions;
}

/**
 * 执行武器合成
 * @param {Array} playerWeapons - 玩家当前武器数组（会被修改）
 * @param {object} recipe - 合成配方对象
 * @param {object} WEAPONS - 武器定义表（从game.js传入）
 * @returns {object} 合成结果 {success: boolean, message: string, newWeapon: object}
 */
function performFusion(playerWeapons, recipe, WEAPONS) {
    // 再次验证材料是否充足
    const playerWeaponIds = playerWeapons.map(w => w.def.id);
    const hasAllMaterials = recipe.materials.every(materialId => {
        return playerWeaponIds.includes(materialId);
    });

    if (!hasAllMaterials) {
        return { success: false, message: '材料不足', newWeapon: null };
    }

    // 移除材料武器
    const materialsToRemove = [...recipe.materials];
    for (let i = playerWeapons.length - 1; i >= 0; i--) {
        const weaponId = playerWeapons[i].def.id;
        const materialIndex = materialsToRemove.indexOf(weaponId);

        if (materialIndex !== -1) {
            // 找到需要移除的材料
            playerWeapons.splice(i, 1);
            materialsToRemove.splice(materialIndex, 1);

            // 如果所有材料都已移除，提前退出
            if (materialsToRemove.length === 0) break;
        }
    }

    // 获取结果武器定义
    const resultWeaponKey = Object.keys(WEAPONS).find(
        key => WEAPONS[key].id === recipe.result
    );

    if (!resultWeaponKey) {
        return { success: false, message: '合成结果武器不存在', newWeapon: null };
    }

    const resultWeaponDef = WEAPONS[resultWeaponKey];

    // 添加新武器
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
// 导出配置（如果使用模块化）
// ============================================

// 如果在浏览器环境中使用，将配置挂载到全局
if (typeof window !== 'undefined') {
    window.WEAPON_ID_MAP = WEAPON_ID_MAP;
    window.WEAPON_FUSION_TABLE = WEAPON_FUSION_TABLE;
    window.getWeaponInfo = getWeaponInfo;
    window.getWeaponIdByOrder = getWeaponIdByOrder;
    window.getAvailableFusions = getAvailableFusions;
    window.performFusion = performFusion;
}
