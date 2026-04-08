export const DND35Engine = {
  parseCostToGold: (costStr) => {
    if (!costStr) return 0;
    const lowerCost = String(costStr).toLowerCase();
    if (lowerCost.includes("grátis") || lowerCost.includes("nenhum")) return 0;

    const match = lowerCost.match(/([\d.,]+)\s*(po|pp|pc|pl)?/);
    if (!match) return 0;

    const cleanNum = match[1].replace(/\./g, "").replace(",", ".");
    let value = parseFloat(cleanNum) || 0;
    let coinType = match[2] || "po";

    switch (coinType) {
      case "pc":
        return value / 100;
      case "pp":
        return value / 10;
      case "pl":
        return value * 10;
      case "po":
      default:
        return value;
    }
  },
  // ==========================================
  // 1. ATRIBUTOS E MODIFICADORES
  // ==========================================

  getFinalStat: (char, statKey) => {
    if (!char) return 10;
    let total = char.baseStats?.[statKey] || 10;
    const bonus = char.selectedRace?.abilityBonuses?.[statKey] || 0;
    return total + bonus;
  },

  getModifier: (char, statKey) => {
    return Math.floor((DND35Engine.getFinalStat(char, statKey) - 10) / 2);
  },

  getSizeMod: (char) => {
    const size = char?.selectedRace?.size;
    if (size === "Pequeno") return 1;
    if (size === "Grande") return -1;
    return 0;
  },

  // ==========================================
  // 2. CAPACIDADE E CARGA (INVENTÁRIO)
  // ==========================================

  getCarryingCapacity: (char) => {
    if (!char) return { light: 0, medium: 0, heavy: 0 };
    const str = DND35Engine.getFinalStat(char, "str");
    const light = str <= 10 ? str * 3.3 : str * str * 0.33;
    return {
      light: Math.floor(light),
      medium: Math.floor(light * 2),
      heavy: Math.floor(light * 3),
    };
  },

  getTotalWeight: (char) => {
    if (!char) return 0;
    const inventory = char.inventory || [];
    const equipped = [char.mainHand, char.offHand, char.selectedArmor].filter(
      Boolean,
    );
    const allItems = [...inventory, ...equipped];
    return allItems.reduce((acc, item) => acc + (item.weight || 0), 0);
  },

  getEncumbrance: (char) => {
    const weight = DND35Engine.getTotalWeight(char);
    const caps = DND35Engine.getCarryingCapacity(char);
    if (weight <= caps.light) return "Leve";
    if (weight <= caps.medium) return "Média";
    return "Pesada";
  },

  // ==========================================
  // 3. DEFESA E MOBILIDADE
  // ==========================================

  getMaxDexModifier: (char) => {
    if (!char) return 99;
    let limit = 99;

    // Verifica limite dos itens equipados
    [char.mainHand, char.offHand, char.selectedArmor].forEach((item) => {
      if (item?.max_dex !== undefined) limit = Math.min(limit, item.max_dex);
    });

    // Verifica limite imposto pela carga
    const encumbrance = DND35Engine.getEncumbrance(char);
    if (encumbrance === "Média") limit = Math.min(limit, 3);
    if (encumbrance === "Pesada") limit = Math.min(limit, 1);

    return limit;
  },

  getAC: (char) => {
    if (!char) return 10;
    const maxDex = DND35Engine.getMaxDexModifier(char);
    const appliedDex = Math.min(DND35Engine.getModifier(char, "dex"), maxDex);

    const armorBonus =
      (char.selectedArmor?.ac_bonus || 0) +
      (char.mainHand?.ac_bonus || 0) +
      (char.offHand?.ac_bonus || 0);
    const naturalArmor = char.selectedRace?.naturalArmor || 0;

    return (
      10 + armorBonus + appliedDex + DND35Engine.getSizeMod(char) + naturalArmor
    );
  },

  getMovementReduction: (baseSpeed) => {
    if (baseSpeed >= 12) return 9;
    if (baseSpeed >= 9) return 6;
    if (baseSpeed >= 6) return 4.5;
    return baseSpeed;
  },

  getFinalSpeed: (char) => {
    if (!char) return 9;
    let speed = char.selectedRace?.speed || 9;

    // Bônus de classe (Ex: Bárbaro)
    if (char.selectedClass?.class_features?.fast_movement) {
      if (char.selectedArmor?.category !== "Pesada") {
        speed += 3;
      }
    }

    // Redução por carga ou armadura
    const encumbrance = DND35Engine.getEncumbrance(char);
    const armorType = char.selectedArmor?.category;

    if (
      encumbrance === "Média" ||
      encumbrance === "Pesada" ||
      armorType === "Média" ||
      armorType === "Pesada"
    ) {
      speed = DND35Engine.getMovementReduction(speed);
    }

    return speed;
  },

  // ==========================================
  // 4. COMBATE (ATAQUE, DANO E INICIATIVA)
  // ==========================================

  getInitiative: (char) => {
    if (!char) return 0;
    let total = DND35Engine.getModifier(char, "dex");

    // Varre talentos buscando bônus de iniciativa
    char.feats?.forEach((feat) => {
      if (feat.mechanic?.stat === "initiative") total += feat.mechanic.value;
    });
    return total;
  },

  getBABValue: (char) => {
    if (!char || !char.selectedClass) return 0;
    const level = char.level || 1;
    const progression = char.selectedClass.progression[Math.min(level - 1, 19)];
    return parseInt(progression?.bab?.split("/")[0]) || 0;
  },

  getTWFPenalty: (char) => {
    if (
      !char ||
      !char.mainHand ||
      !char.offHand ||
      char.offHand.type === "Escudo"
    ) {
      return { main: 0, off: 0 };
    }

    const hasFeat = char.feats?.some((f) => f.slug === "two_weapon_fighting");
    const isOffLight =
      char.offHand.size === "light" || char.offHand.category === "Leve";

    if (hasFeat)
      return isOffLight ? { main: -2, off: -2 } : { main: -4, off: -4 };
    return isOffLight ? { main: -6, off: -10 } : { main: -4, off: -10 };
  },

  getMainAtk: (char) => {
    if (!char || !char.mainHand) return 0;

    const statMod =
      char.mainHand.type_atk === "ranged"
        ? DND35Engine.getModifier(char, "dex")
        : DND35Engine.getModifier(char, "str");

    const itemPenalty =
      (char.mainHand.atk_penalty || 0) + (char.offHand?.atk_penalty || 0);

    return (
      DND35Engine.getBABValue(char) +
      statMod +
      DND35Engine.getSizeMod(char) +
      DND35Engine.getTWFPenalty(char).main +
      itemPenalty
    );
  },

  getWeaponDamage: (char, isMainHand) => {
    if (!char) return "-";
    const weapon = isMainHand ? char.mainHand : char.offHand;
    if (!weapon || weapon.type === "Escudo") return "-";

    const baseDamage =
      char.selectedRace?.size === "Pequeno"
        ? weapon.damage_small
        : weapon.damage_medium;
    const strMod = DND35Engine.getModifier(char, "str");
    let finalMod = strMod;

    if (isMainHand) {
      if (weapon.category === "Duas Mãos" && !char.offHand) {
        finalMod = Math.floor(strMod * 1.5);
      }
    } else {
      finalMod = Math.floor(strMod * 0.5);
    }

    const bonusSign = finalMod > 0 ? "+" : "";
    return `${baseDamage}${finalMod === 0 ? "" : bonusSign + finalMod}`;
  },

  // ==========================================
  // 5. TESTES DE RESISTÊNCIA (SAVES)
  // ==========================================

  getSaveTotal: (char, saveKey, attrKey) => {
    if (!char || !char.classes) return 0;
    let total = 0;

    // 1. Soma a base de todas as classes
    char.classes.forEach((c) => {
      if (c.classData && c.classData.progression) {
        const levelIndex = Math.max(0, Math.min(c.level - 1, 19));
        const baseSave = c.classData.progression[levelIndex]?.[saveKey] || "+0";
        total += parseInt(baseSave.replace("+", "")) || 0;
      }
    });

    // 2. Modificador do atributo
    total += DND35Engine.getModifier(char, attrKey);

    // 3. Bônus de Raça (se houver)
    char.selectedRace?.traits?.forEach((trait) => {
      const b = trait.bonuses;
      if (Array.isArray(b)) {
        b.forEach((sb) => {
          if (sb.save === "all" || sb.save === saveKey) total += sb.value;
        });
      } else if (b?.save === "all" || b?.save === saveKey) {
        total += b.value;
      }
    });

    // 4. NOVO: Bônus de Talentos (Feats)
    // Ex: Grande Fortitude (stat: "fortitude", value: 2)
    // O saveKey do D&D 3.5 geralmente é "fort", "ref" ou "will". Adaptando a chave do talento para a do motor:
    const featSaveMap = { fort: "fortitude", ref: "reflex", will: "will" };

    char.feats?.forEach((feat) => {
      if (
        feat.mechanic?.type === "bonus" &&
        feat.mechanic?.stat === featSaveMap[saveKey]
      ) {
        total += feat.mechanic.value;
      }
    });

    return total;
  },

  // ==========================================
  // 6. PERÍCIAS (SKILLS)
  // ==========================================

  getArmorCheckPenalty: (char) => {
    if (!char) return 0;
    const armorPen = char.selectedArmor?.check_penalty || 0;
    const shieldPen = char.offHand?.check_penalty || 0;
    return armorPen + shieldPen;
  },

  // NOVO: Calcula o nível total do personagem (Soma da Multiclasse)
  getCharacterLevel: (char) => {
    if (!char || !char.classes) return char?.level || 1;
    return char.classes.reduce((acc, curr) => acc + curr.level, 0) || 1;
  },

  // NOVO: Verifica se a perícia pertence a alguma das classes do personagem
  isClassSkill: (char, skillSlug) => {
    if (!char || !char.classes) return false;
    // O seu JSON de classe precisa ter uma lista "class_skills": ["spot", "climb", ...]
    return char.classes.some((c) =>
      c.classData?.class_skills?.includes(skillSlug),
    );
  },

  // NOVO: Calcula o limite máximo de graduações que o personagem pode ter
  getMaxSkillRanks: (char, skillSlug) => {
    const charLevel = DND35Engine.getCharacterLevel(char);
    const isClass = DND35Engine.isClassSkill(char, skillSlug);
    // Regra 3.5: Classe = Nível + 3 | Cruzada = (Nível + 3) / 2
    return isClass ? charLevel + 3 : Math.floor((charLevel + 3) / 2);
  },

  // NOVO: Lê os bônus de Raça e Talentos para a perícia
  getSkillMiscBonus: (char, skillSlug) => {
    let bonus = 0;

    // 1. Procura Bônus da Raça
    char.selectedRace?.traits?.forEach((trait) => {
      const b = trait.bonuses;
      if (Array.isArray(b)) {
        b.forEach((sb) => {
          if (sb.skill === skillSlug || sb.skill === "all") bonus += sb.value;
        });
      } else if (b?.skill === skillSlug || b?.skill === "all") {
        bonus += b.value;
      }
    });

    // 2. Procura Bônus de Talentos (Ex: Foco em Perícia)
    char.feats?.forEach((feat) => {
      if (
        feat.mechanic?.type === "skill" &&
        feat.mechanic?.target === skillSlug
      ) {
        bonus += feat.mechanic.value;
      }
    });

    return bonus;
  },

  getSkillTotal: (char, skillSlug, attrKey, appliesACP) => {
    if (!char) return 0;

    const statMod = DND35Engine.getModifier(char, attrKey);
    const ranks = char.skills?.[skillSlug] || 0;
    const acp = appliesACP ? DND35Engine.getArmorCheckPenalty(char) : 0;
    const miscBonus = DND35Engine.getSkillMiscBonus(char, skillSlug);

    const synergyBonus = DND35Engine.getSynergyBonus(char, skillSlug);

    return statMod + Math.floor(ranks) + acp + miscBonus + synergyBonus;
  },

  getSynergyBonus: (char, targetSkillSlug) => {
    if (!char || !char.skills) return 0;
    let bonus = 0;

    const synergies = {
      diplomacy: ["bluff", "sense_motive"],
      intimidate: ["bluff"],
      balance: ["tumble"],
      jump: ["tumble"],
      ride: ["handle_animal"],
      survival: ["search"],
      sleight_of_hand: ["bluff"],
    };

    const sources = synergies[targetSkillSlug];

    if (sources) {
      sources.forEach((sourceSlug) => {
        if ((char.skills[sourceSlug] || 0) >= 5) {
          bonus += 2;
        }
      });
    }
    return bonus;
  },

  // ==========================================
  // PONTOS DE VIDA (HP)
  // ==========================================

  getMaxHP: (char) => {
    if (!char || !char.classes) return 10;

    let baseHp = 0;
    const rolls = char.hpRolls || []; // Onde vamos salvar as escolhas do usuário
    let currentLevelIndex = 0;
    let isFirstLevel = true;

    // 1. Mapeia os dados de vida de cada nível pelas classes do personagem
    char.classes.forEach((c) => {
      const hitDieStr = c.classData?.hit_die?.toString() || "10";
      const hd = parseInt(hitDieStr.replace("d", "")) || 10;
      const avgHd = Math.floor(hd / 2) + 1;

      for (let i = 0; i < (c.level || 1); i++) {
        if (isFirstLevel) {
          // Nível 1: Regra oficial do 3.5 é valor MÁXIMO do dado.
          baseHp += hd;
          isFirstLevel = false;
        } else {
          // Níveis Seguintes: Lê a rolagem salva pelo usuário OU usa a média como fallback
          if (rolls[currentLevelIndex] !== undefined) {
            baseHp += rolls[currentLevelIndex];
          } else {
            baseHp += avgHd; // Fallback se o usuário ainda não tiver configurado
          }
        }
        currentLevelIndex++;
      }
    });

    // 2. Soma o Modificador de Constituição x Nível Total
    const totalLevel = DND35Engine.getCharacterLevel(char);
    const conMod = DND35Engine.getModifier(char, "con");
    let totalHp = baseHp + conMod * totalLevel;

    // 3. Soma bônus de Talentos (ex: Vitalidade / Toughness)
    char.feats?.forEach((feat) => {
      if (feat.mechanic?.type === "bonus" && feat.mechanic?.stat === "hp") {
        totalHp += feat.mechanic.value;
      }
    });

    return Math.max(totalHp, totalLevel);
  },
};
