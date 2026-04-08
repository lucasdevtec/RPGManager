import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  ScrollView,
  Keyboard,
  Modal, // Adicionado para o Modal de Itens Customizados
} from "react-native";
import { useRouter } from "expo-router";
import { useCharacterStore } from "../../stores/charStore";
import uuid from "react-native-uuid";
import FeedbackModal from "../../components/FeedbackModal";
import { parseCostToGold } from "../../engines/d&d35";
import CLASSES_DATA from "../../data/D&D3.5/classes.json";
import RACAS_DATA from "../../data/D&D3.5/racas.json";
import SKILLS_DATA from "../../data/D&D3.5/pericias.json";
import FEATS_DATA from "../../data/D&D3.5/talentos.json";
import ITEMS_DATA from "../../data/D&D3.5/items.json";
import ARMORS_DATA from "../../data/D&D3.5/armaduras.json"; // NOVO
import WEAPONS_DATA from "../../data/D&D3.5/armas.json"; // NOVO
import SPELLS_DATA from "../../data/D&D3.5/magias.json";

export default function CreateCharacter() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const createCharacter = useCharacterStore((state) => state.createCharacter);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const [feedback, setFeedback] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error",
  });

  const [characterData, setCharacterData] = useState({
    id: uuid.v4(),
    name: "",
    system: "D&D 3.5",
    level: 1,
    selectedRace: null,
    classes: [],
    age: "",
    height: "",
    weight: "",
    alignment: "",
    backstory: "",
    baseStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skills: {},
    feats: [],
    hpRolls: [],
    gold: "", // NOVO: Dinheiro Inicial
    inventory: [],
    mainHand: null,
    selectedArmor: null,
    spells: [],
  });

  // Novos Estados para Pesquisa
  const [searchItem, setSearchItem] = useState("");
  const [searchArmor, setSearchArmor] = useState("");
  const [searchWeapon, setSearchWeapon] = useState("");
  const [searchSpell, setSearchSpell] = useState("");

  // Novos Estados para Modal de Item Personalizado
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customItemType, setCustomItemType] = useState("item"); // 'item', 'armor', 'weapon'
  const [customItemData, setCustomItemData] = useState({
    name: "",
    cost: "",
    weight: "",
    description: "",
    ac_bonus: "", // Específico de Armadura
    damage: "",
    damage_type: "", // Específico de Arma
  });

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const calculateRemainingGold = () => {
    const initialGoldStr = String(characterData.gold || "0")
      .replace(/\./g, "")
      .replace(",", ".");
    const initialGold = parseFloat(initialGoldStr) || 0;
    let spent = 0;

    characterData.inventory.forEach((item) => {
      spent += parseCostToGold(item.cost);
    });

    return initialGold - spent;
  };

  const updateData = (key, value) =>
    setCharacterData((prev) => ({ ...prev, [key]: value }));
  const showAlert = (title, message, type = "error") =>
    setFeedback({ visible: true, title, message, type });

  // --- Funções Omitidas para brevidade, MANTENHA AS SUAS ORIGINAIS AQUI ---
  // (Mantenha as funções changeStatBtn, changeStatInput, isClassSkill, calculateTotalSkillPoints, calculateSpentPoints, changeSkillRank, checkPrerequisites iguais ao código anterior)
  const STAT_LABELS = {
    str: "Força",
    dex: "Destreza",
    con: "Constituição",
    int: "Inteligência",
    wis: "Sabedoria",
    cha: "Carisma",
  };

  const changeStatBtn = (statKey, amount) => {
    const currentValue = parseInt(characterData.baseStats[statKey]) || 0;
    const newValue = currentValue + amount;
    if (newValue >= 0 && newValue <= 40)
      updateData("baseStats", {
        ...characterData.baseStats,
        [statKey]: newValue,
      });
  };
  const changeStatInput = (statKey, text) => {
    if (text === "") {
      updateData("baseStats", { ...characterData.baseStats, [statKey]: "" });
      return;
    }
    const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num))
      updateData("baseStats", { ...characterData.baseStats, [statKey]: num });
  };
  const isClassSkill = (skillName) =>
    characterData.classes[0]?.classData?.class_skills?.includes(skillName);
  const calculateTotalSkillPoints = () => {
    if (characterData.classes.length === 0) return 0;
    const intBase = parseInt(characterData.baseStats.int) || 10;
    const intRace = characterData.selectedRace?.abilityBonuses?.int || 0;
    const intMod = Math.floor((intBase + intRace - 10) / 2);
    let total =
      ((characterData.classes[0].classData.skill_points?.base || 2) + intMod) *
      4;
    if (total < 4) total = 4;
    if (
      characterData.selectedRace?.name === "Humano" ||
      characterData.selectedRace?.slug === "human"
    )
      total += 4;
    return total;
  };
  const calculateSpentPoints = () => {
    let spent = 0;
    Object.keys(characterData.skills).forEach((slug) => {
      const ranks = characterData.skills[slug];
      const skillData = SKILLS_DATA.find((s) => s.slug === slug);
      if (skillData && ranks > 0)
        spent += ranks * (isClassSkill(skillData.name) ? 1 : 2);
    });
    return spent;
  };
  const changeSkillRank = (skill, amount) => {
    const currentRanks = characterData.skills[skill.slug] || 0;
    const isClass = isClassSkill(skill.name);
    const newRanks = currentRanks + amount;
    if (newRanks < 0 || newRanks > (isClass ? 4 : 2)) return;
    if (
      amount > 0 &&
      calculateSpentPoints() + (isClass ? 1 : 2) > calculateTotalSkillPoints()
    ) {
      return showAlert(
        "Sem pontos!",
        "Você não tem pontos suficientes.",
        "error",
      );
    }
    updateData("skills", { ...characterData.skills, [skill.slug]: newRanks });
  };
  const checkPrerequisites = (feat) => {
    if (!feat.prerequisites || feat.prerequisites.length === 0) return true;
    for (let req of feat.prerequisites) {
      const statMatch = req.match(
        /(Força|Destreza|Constituição|Inteligência|Sabedoria|Carisma)\s+(\d+)/i,
      );
      if (statMatch) {
        const statMap = {
          força: "str",
          destreza: "dex",
          constituição: "con",
          inteligência: "int",
          sabedoria: "wis",
          carisma: "cha",
        };
        const statKey = statMap[statMatch[1].toLowerCase()];
        const reqValue = parseInt(statMatch[2], 10);
        if (
          (parseInt(characterData.baseStats[statKey]) || 10) +
            (characterData.selectedRace?.abilityBonuses?.[statKey] || 0) <
          reqValue
        )
          return false;
        continue;
      }
      const babMatch = req.match(/BBA\s*\+?(\d+)/i);
      if (
        babMatch &&
        (parseInt(
          (characterData.classes[0]?.classData?.progression[0]?.bab || "+0")
            .replace("+", "")
            .split("/")[0],
        ) || 0) < parseInt(babMatch[1], 10)
      )
        return false;
      const reqFeatName = req.toLowerCase().trim();
      if (
        FEATS_DATA.some((f) => f.name.toLowerCase() === reqFeatName) &&
        !characterData.feats.some((f) => f.name.toLowerCase() === reqFeatName)
      )
        return false;
    }
    return true;
  };

  // --- Funções de Inventário e Customização ---
  const toggleItem = (item) => {
    const hasItem = characterData.inventory.some((i) => i.slug === item.slug);
    if (hasItem)
      updateData(
        "inventory",
        characterData.inventory.filter((i) => i.slug !== item.slug),
      );
    else updateData("inventory", [...characterData.inventory, item]);
  };

  const openCustomModal = (type) => {
    setCustomItemType(type);
    setCustomItemData({
      name: "",
      cost: "",
      weight: "",
      description: "",
      ac_bonus: "",
      damage: "",
      damage_type: "",
    });
    setCustomModalVisible(true);
  };

  const saveCustomItem = () => {
    if (!customItemData.name)
      return showAlert("Atenção", "O item precisa de um nome.");

    const newItem = {
      ...customItemData,
      slug: `custom-${uuid.v4()}`,
      isCustom: true,
      type:
        customItemType === "weapon"
          ? "Arma"
          : customItemType === "armor"
            ? "Armadura"
            : "Geral",
    };

    updateData("inventory", [...characterData.inventory, newItem]);
    setCustomModalVisible(false);
    showAlert(
      "Sucesso!",
      `${newItem.name} foi adicionado à sua mochila.`,
      "success",
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      // (MANTENHA OS PASSOS 1 a 7 IGUAIS AO CÓDIGO ANTERIOR. Vou omitir aqui para não estourar o limite de caracteres, basta colar os seus cases 1 a 7 aqui)
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 1: Escolha sua Raça</Text>
            <FlatList
              data={RACAS_DATA}
              keyExtractor={(item) => item.slug}
              renderItem={({ item }) => {
                const isSelected =
                  characterData.selectedRace?.slug === item.slug;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardActive,
                    ]}
                    onPress={() => updateData("selectedRace", item)}
                  >
                    <Text style={styles.optionName}>{item.name}</Text>
                    <Text style={styles.optionSub}>
                      Tamanho: {item.size} • Desloc.: {item.speed}m
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 2: Escolha sua Classe</Text>
            <FlatList
              data={CLASSES_DATA}
              keyExtractor={(item) => item.slug}
              renderItem={({ item }) => {
                const isSelected =
                  characterData.classes?.[0]?.slug === item.slug;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardActive,
                    ]}
                    onPress={() =>
                      updateData("classes", [
                        { slug: item.slug, level: 1, classData: item },
                      ])
                    }
                  >
                    <Text style={styles.optionName}>{item.name}</Text>
                    <Text style={styles.optionSub}>DV: {item.hit_die}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      case 3:
        return (
          <ScrollView
            style={styles.stepContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>Passo 3: Informações Básicas</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome *"
              placeholderTextColor="#888"
              value={characterData.name}
              onChangeText={(text) => updateData("name", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Alinhamento *"
              placeholderTextColor="#888"
              value={characterData.alignment}
              onChangeText={(text) => updateData("alignment", text)}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                placeholder="Idade"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={characterData.age}
                onChangeText={(text) => updateData("age", text)}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                placeholder="Altura"
                placeholderTextColor="#888"
                value={characterData.height}
                onChangeText={(text) => updateData("height", text)}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Peso"
                placeholderTextColor="#888"
                value={characterData.weight}
                onChangeText={(text) => updateData("weight", text)}
              />
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxLabel}>Tamanho (da Raça):</Text>
              <Text style={styles.infoBoxValue}>
                {characterData.selectedRace?.size || "N/A"}
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Prelúdio (História...)"
              placeholderTextColor="#888"
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              value={characterData.backstory}
              onChangeText={(text) => updateData("backstory", text)}
            />
          </ScrollView>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 4: Atributos</Text>
            <FlatList
              data={Object.keys(characterData.baseStats)}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: statKey }) => {
                const baseValue = characterData.baseStats[statKey];
                const raceMod =
                  characterData.selectedRace?.abilityBonuses?.[statKey] || 0;
                const finalValue = (parseInt(baseValue) || 0) + raceMod;
                const modifier = Math.floor((finalValue - 10) / 2);
                return (
                  <View style={styles.statRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statName}>
                        {STAT_LABELS[statKey]}
                      </Text>
                      {raceMod !== 0 && (
                        <Text
                          style={[
                            styles.raceBonusText,
                            { color: raceMod > 0 ? "#4caf50" : "#ff5252" },
                          ]}
                        >
                          Raça: {raceMod > 0 ? `+${raceMod}` : raceMod}
                        </Text>
                      )}
                    </View>
                    <View style={styles.statControls}>
                      <TouchableOpacity
                        style={styles.statBtn}
                        onPress={() => changeStatBtn(statKey, -1)}
                      >
                        <Text style={styles.statBtnText}>-</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.baseStatInput}
                        keyboardType="numeric"
                        maxLength={2}
                        value={String(baseValue)}
                        onChangeText={(text) => changeStatInput(statKey, text)}
                      />
                      <TouchableOpacity
                        style={styles.statBtn}
                        onPress={() => changeStatBtn(statKey, 1)}
                      >
                        <Text style={styles.statBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.finalStatBox}>
                      <Text style={styles.finalStatText}>{finalValue}</Text>
                      <Text style={styles.modifierText}>
                        Mod: {modifier >= 0 ? `+${modifier}` : modifier}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        );

      case 5:
        const totalPoints = calculateTotalSkillPoints();
        const spentPoints = calculateSpentPoints();
        const availablePoints = totalPoints - spentPoints;
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 5: Perícias Iniciais</Text>
            <View style={styles.pointsPanel}>
              <Text style={styles.pointsLabel}>Pontos Disponíveis</Text>
              <Text
                style={[
                  styles.pointsValue,
                  availablePoints === 0 && { color: "#4caf50" },
                ]}
              >
                {availablePoints}
              </Text>
            </View>
            <FlatList
              data={SKILLS_DATA}
              keyExtractor={(item) => item.slug}
              renderItem={({ item: skill }) => {
                const isClass = isClassSkill(skill.name);
                const ranks = characterData.skills[skill.slug] || 0;
                const maxRanks = isClass ? 4 : 2;
                const isMaxed = ranks >= maxRanks;
                return (
                  <View style={styles.skillRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.skillName}>{skill.name}</Text>
                      <Text
                        style={[
                          styles.skillClassBadge,
                          { color: isClass ? "#4caf50" : "#ff9800" },
                        ]}
                      >
                        {isClass
                          ? "Perícia de Classe (Custo 1)"
                          : "Perícia Cruzada (Custo 2)"}
                      </Text>
                    </View>
                    <View style={styles.skillControls}>
                      <TouchableOpacity
                        style={styles.statBtn}
                        onPress={() => changeSkillRank(skill, -1)}
                      >
                        <Text style={styles.statBtnText}>-</Text>
                      </TouchableOpacity>
                      <View style={{ width: 30, alignItems: "center" }}>
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 18,
                            fontWeight: "bold",
                          }}
                        >
                          {ranks}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.statBtn, isMaxed && { opacity: 0.3 }]}
                        onPress={() => changeSkillRank(skill, 1)}
                        disabled={isMaxed}
                      >
                        <Text style={styles.statBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        );

      case 6:
        let maxFeats = 1;
        if (
          characterData.selectedRace?.name === "Humano" ||
          characterData.selectedRace?.slug === "human"
        )
          maxFeats += 1;
        if (
          characterData.classes[0]?.slug === "fighter" ||
          characterData.classes[0]?.slug === "guerreiro"
        )
          maxFeats += 1;
        const availableFeats = maxFeats - characterData.feats.length;

        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 6: Talentos</Text>
            <View style={styles.pointsPanel}>
              <Text style={styles.pointsLabel}>Talentos Disponíveis</Text>
              <Text
                style={[
                  styles.pointsValue,
                  availableFeats === 0 && { color: "#4caf50" },
                ]}
              >
                {availableFeats}
              </Text>
            </View>
            <FlatList
              data={FEATS_DATA}
              keyExtractor={(item) => item.slug}
              renderItem={({ item: feat }) => {
                const isSelected = characterData.feats.some(
                  (f) => f.slug === feat.slug,
                );
                const meetsReqs = checkPrerequisites(feat);
                return (
                  <TouchableOpacity
                    style={[
                      styles.featCard,
                      isSelected && styles.featCardActive,
                      !meetsReqs && { opacity: 0.4 },
                    ]}
                    onPress={() => {
                      if (!meetsReqs)
                        return showAlert(
                          "Atenção",
                          "Pré-requisitos não atendidos.",
                        );
                      if (isSelected)
                        updateData(
                          "feats",
                          characterData.feats.filter(
                            (f) => f.slug !== feat.slug,
                          ),
                        );
                      else if (availableFeats > 0)
                        updateData("feats", [...characterData.feats, feat]);
                      else
                        showAlert(
                          "Limite Atingido",
                          "Você não tem mais talentos.",
                          "info",
                        );
                    }}
                  >
                    <View style={styles.featHeader}>
                      <Text style={styles.featName}>{feat.name}</Text>
                      {isSelected && (
                        <Text style={styles.ownedBadge}>Adquirido</Text>
                      )}
                    </View>
                    <Text style={styles.featType}>{feat.type}</Text>
                    <Text style={styles.featPreview} numberOfLines={2}>
                      {feat.description}
                    </Text>
                    {feat.prerequisites && feat.prerequisites.length > 0 && (
                      <Text style={styles.featReq}>
                        Pré-req: {feat.prerequisites.join(", ")}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      case 7:
        const hitDieStr = characterData.classes[0]?.classData?.hit_die || "d8";
        const maxDie = parseInt(hitDieStr.replace("d", "")) || 8;
        const avgDie = Math.floor(maxDie / 2) + 1;
        const currentRoll =
          characterData.hpRolls.length > 0 ? characterData.hpRolls[0] : maxDie;
        const conMod = Math.floor(
          ((parseInt(characterData.baseStats.con) || 10) +
            (characterData.selectedRace?.abilityBonuses?.con || 0) -
            10) /
            2,
        );
        const hasToughness = characterData.feats.some(
          (f) => f.slug === "toughness" || f.slug === "vitalidade",
        );
        const totalHpFinal = currentRoll + conMod + (hasToughness ? 3 : 0);

        const setHpRoll = (text) => {
          if (text === "") {
            updateData("hpRolls", []);
            return;
          }
          let num = parseInt(text.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(num)) {
            if (num > maxDie) num = maxDie;
            updateData("hpRolls", [num]);
          }
        };

        return (
          <ScrollView
            style={styles.stepContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>Passo 7: Pontos de Vida</Text>
            <View style={[styles.pointsPanel, { borderColor: "#4caf50" }]}>
              <Text style={styles.pointsLabel}>Total de PVs Iniciais</Text>
              <Text style={[styles.pointsValue, { color: "#4caf50" }]}>
                {totalHpFinal}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>
              Como deseja definir sua vida base?
            </Text>
            <TouchableOpacity
              style={[
                styles.optionCard,
                currentRoll === maxDie &&
                  characterData.hpRolls.length > 0 &&
                  styles.optionCardActive,
              ]}
              onPress={() => setHpRoll(String(maxDie))}
            >
              <Text style={styles.optionName}>Máximo (Recomendado)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionCard,
                currentRoll === avgDie &&
                  currentRoll !== maxDie &&
                  styles.optionCardActive,
              ]}
              onPress={() => setHpRoll(String(avgDie))}
            >
              <Text style={styles.optionName}>Valor Médio</Text>
            </TouchableOpacity>
            <View style={[styles.optionCard, { paddingBottom: 25 }]}>
              <Text style={styles.optionName}>Personalizado (Rolar Dados)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    marginTop: 15,
                    marginBottom: 0,
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: "bold",
                  },
                ]}
                keyboardType="numeric"
                maxLength={2}
                value={
                  characterData.hpRolls.length > 0
                    ? String(characterData.hpRolls[0])
                    : ""
                }
                onChangeText={setHpRoll}
                placeholder={`Ex: ${avgDie}`}
                placeholderTextColor="#666"
              />
            </View>
          </ScrollView>
        );

      // ==========================================
      // NOVO PASSO 8: ITENS GERAIS E DINHEIRO
      // ==========================================
      case 8:
        const filteredItems = ITEMS_DATA.filter((i) =>
          i.name.toLowerCase().includes(searchItem.toLowerCase()),
        );
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 8: Itens Gerais</Text>

            <View style={styles.goldBox}>
              <Text style={styles.goldBoxLabel}>
                💰 Dinheiro Inicial (Ex: 100 PO)
              </Text>
              <TextInput
                style={styles.goldInput}
                placeholder="0"
                placeholderTextColor="#666"
                value={characterData.gold}
                onChangeText={(text) => updateData("gold", text)}
              />
            </View>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchBar}
                placeholder="Buscar item..."
                placeholderTextColor="#888"
                value={searchItem}
                onChangeText={setSearchItem}
              />
              <TouchableOpacity
                style={styles.addCustomBtn}
                onPress={() => openCustomModal("item")}
              >
                <Text style={styles.addCustomBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.slug}
              ListHeaderComponent={
                <View>
                  {characterData.inventory
                    .filter((i) => i.isCustom && i.type === "Geral")
                    .map((item) => (
                      <TouchableOpacity
                        key={item.slug}
                        style={[styles.featCard, styles.featCardActive]}
                        onPress={() => toggleItem(item)}
                      >
                        <View style={styles.featHeader}>
                          <Text style={styles.featName}>{item.name}</Text>
                          <Text style={styles.ownedBadge}>Adicionado</Text>
                        </View>
                        <Text style={styles.featType}>
                          {item.type} • {item.cost || "0"} • {item.weight || 0}{" "}
                          kg
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = characterData.inventory.some(
                  (i) => i.slug === item.slug,
                );
                return (
                  <TouchableOpacity
                    style={[
                      styles.featCard,
                      isSelected && styles.featCardActive,
                    ]}
                    onPress={() => toggleItem(item)}
                  >
                    <View style={styles.featHeader}>
                      <Text style={styles.featName}>{item.name}</Text>
                      {isSelected && (
                        <Text style={styles.ownedBadge}>Adicionado</Text>
                      )}
                    </View>
                    <Text style={styles.featType}>
                      {item.type || "Geral"} • {item.cost || "Grátis"} •{" "}
                      {item.weight || 0} kg
                    </Text>
                    {item.description && (
                      <Text style={styles.featPreview} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      // ==========================================
      // PASSO 9: ARMADURAS E ESCUDOS
      // ==========================================
      case 9:
        const filteredArmors = ARMORS_DATA.filter((i) =>
          i.name.toLowerCase().includes(searchArmor.toLowerCase()),
        );
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 9: Armaduras</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchBar}
                placeholder="Buscar armadura..."
                placeholderTextColor="#888"
                value={searchArmor}
                onChangeText={setSearchArmor}
              />
              <TouchableOpacity
                style={styles.addCustomBtn}
                onPress={() => openCustomModal("armor")}
              >
                <Text style={styles.addCustomBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredArmors}
              keyExtractor={(item) => item.slug}
              ListHeaderComponent={
                <View>
                  {characterData.inventory
                    .filter((i) => i.isCustom && i.type === "Armadura")
                    .map((item) => (
                      <TouchableOpacity
                        key={item.slug}
                        style={[styles.featCard, styles.featCardActive]}
                        onPress={() => toggleItem(item)}
                      >
                        <View style={styles.featHeader}>
                          <Text style={styles.featName}>{item.name}</Text>
                          <Text style={styles.ownedBadge}>Adicionado</Text>
                        </View>
                        <Text style={styles.itemSpecialText}>
                          🛡️ Bônus na CA: +{item.ac_bonus}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = characterData.inventory.some(
                  (i) => i.slug === item.slug,
                );
                return (
                  <TouchableOpacity
                    style={[
                      styles.featCard,
                      isSelected && styles.featCardActive,
                    ]}
                    onPress={() => toggleItem(item)}
                  >
                    <View style={styles.featHeader}>
                      <Text style={styles.featName}>{item.name}</Text>
                      {isSelected && (
                        <Text style={styles.ownedBadge}>Adicionado</Text>
                      )}
                    </View>
                    <Text style={styles.featType}>
                      {item.type} • {item.cost || "Grátis"} • {item.weight || 0}{" "}
                      kg
                    </Text>
                    <Text style={styles.itemSpecialText}>
                      🛡️ Bônus na CA: +{item.ac_bonus}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      // ==========================================
      // PASSO 10: ARMAS
      // ==========================================
      case 10:
        const filteredWeapons = WEAPONS_DATA.filter((i) =>
          i.name.toLowerCase().includes(searchWeapon.toLowerCase()),
        );
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 10: Armas</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchBar}
                placeholder="Buscar arma..."
                placeholderTextColor="#888"
                value={searchWeapon}
                onChangeText={setSearchWeapon}
              />
              <TouchableOpacity
                style={styles.addCustomBtn}
                onPress={() => openCustomModal("weapon")}
              >
                <Text style={styles.addCustomBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredWeapons}
              keyExtractor={(item) => item.slug}
              ListHeaderComponent={
                <View>
                  {characterData.inventory
                    .filter((i) => i.isCustom && i.type === "Arma")
                    .map((item) => (
                      <TouchableOpacity
                        key={item.slug}
                        style={[styles.featCard, styles.featCardActive]}
                        onPress={() => toggleItem(item)}
                      >
                        <View style={styles.featHeader}>
                          <Text style={styles.featName}>{item.name}</Text>
                          <Text style={styles.ownedBadge}>Adicionado</Text>
                        </View>
                        <Text style={styles.itemSpecialText}>
                          ⚔️ Dano: {item.damage} ({item.damage_type})
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = characterData.inventory.some(
                  (i) => i.slug === item.slug,
                );
                return (
                  <TouchableOpacity
                    style={[
                      styles.featCard,
                      isSelected && styles.featCardActive,
                    ]}
                    onPress={() => toggleItem(item)}
                  >
                    <View style={styles.featHeader}>
                      <Text style={styles.featName}>{item.name}</Text>
                      {isSelected && (
                        <Text style={styles.ownedBadge}>Adicionado</Text>
                      )}
                    </View>
                    <Text style={styles.featType}>
                      {item.category || item.proficiency} •{" "}
                      {item.cost || "Grátis"} • {item.weight || 0} kg
                    </Text>
                    <Text style={styles.itemSpecialText}>
                      ⚔️ Dano: {item.damage_medium || item.damage} (
                      {item.damage_type})
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      // ==========================================
      // PASSO 11: MAGIAS
      // ==========================================
      case 11:
        const currentClassSlug =
          characterData.classes[0]?.slug?.toLowerCase() || "";

        // Mapeia a classe do jogador para a chave que está no seu magias.json (dentro de "circle")
        let circleKey = null;
        if (
          ["wizard", "mago", "sorcerer", "feiticeiro"].includes(
            currentClassSlug,
          )
        )
          circleKey = "sorcerer_wizard";
        else if (["cleric", "clérigo"].includes(currentClassSlug))
          circleKey = "cleric";
        else if (["druid", "druida"].includes(currentClassSlug))
          circleKey = "druid";
        else if (["bard", "bardo"].includes(currentClassSlug))
          circleKey = "bard";
        else if (["paladin", "paladino"].includes(currentClassSlug))
          circleKey = "paladin";
        else if (["ranger", "patrulheiro"].includes(currentClassSlug))
          circleKey = "ranger";

        // Se a classe não for conjuradora (ex: Guerreiro, Bárbaro, Ladino), circleKey será nulo.
        if (!circleKey) {
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Passo 11: Magias</Text>
              <View
                style={[
                  styles.infoBox,
                  {
                    marginTop: 20,
                    backgroundColor: "#2a1515",
                    borderColor: "#ff5252",
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[styles.infoBoxValue, { textAlign: "center" }]}>
                  Sua classe ({characterData.classes[0]?.name}) não possui
                  magias no 1º nível.
                </Text>
              </View>
              <Text
                style={[
                  styles.stepDesc,
                  { textAlign: "center", marginTop: 20 },
                ]}
              >
                Sua ficha está pronta! Clique em Finalizar para salvar o
                personagem.
              </Text>
            </View>
          );
        }

        // Lógica de adicionar/remover magia
        const toggleSpell = (spell) => {
          const hasSpell = characterData.spells.some(
            (s) => s.slug === spell.slug,
          );
          if (hasSpell) {
            updateData(
              "spells",
              characterData.spells.filter((s) => s.slug !== spell.slug),
            );
          } else {
            updateData("spells", [...characterData.spells, spell]);
          }
        };

        // Extrai as magias do objeto JSON (SPELLS_DATA.spells) e filtra:
        // 1. O nome da magia bate com a barra de busca?
        // 2. A magia pertence à classe do personagem?
        // 3. O nível da magia é 0 ou 1?
        const filteredSpells = (SPELLS_DATA.spells || []).filter((s) => {
          const matchesSearch =
            s.name.pt.toLowerCase().includes(searchSpell.toLowerCase()) ||
            s.name.original.toLowerCase().includes(searchSpell.toLowerCase());

          const spellLevel = s.circle[circleKey];
          const isValidLevel =
            spellLevel !== null && spellLevel !== undefined && spellLevel <= 1;

          return matchesSearch && isValidLevel;
        });

        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 11: Magias Conhecidas</Text>
            <Text style={styles.stepDesc}>
              Selecione seus Truques (Nível 0) e Magias de 1º Nível
              (Mago/Feiticeiro/Clérigo, etc).
            </Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchBar}
                placeholder="Buscar magia..."
                placeholderTextColor="#888"
                value={searchSpell}
                onChangeText={setSearchSpell}
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxLabel}>Magias Escolhidas:</Text>
              <Text style={styles.infoBoxValue}>
                {characterData.spells.length}
              </Text>
            </View>

            <FlatList
              data={filteredSpells}
              keyExtractor={(item) => item.slug}
              renderItem={({ item }) => {
                const isSelected = characterData.spells.some(
                  (s) => s.slug === item.slug,
                );
                const spellLevel = item.circle[circleKey]; // Exibe o nível correto para a classe atual

                return (
                  <TouchableOpacity
                    style={[
                      styles.featCard,
                      isSelected && styles.featCardActive,
                    ]}
                    onPress={() => toggleSpell(item)}
                  >
                    <View style={styles.featHeader}>
                      <Text style={styles.featName}>{item.name.pt}</Text>
                      {isSelected && (
                        <Text style={styles.ownedBadge}>Preparada</Text>
                      )}
                    </View>

                    <Text style={styles.featType}>
                      Nível {spellLevel} • Escola: {item.school.pt}
                    </Text>

                    <Text style={styles.featPreview} numberOfLines={2}>
                      {item.summary}
                    </Text>

                    <Text style={styles.itemSpecialText}>
                      ⏳ {item.casting.time} | 🎯 Alcance: {item.range.value}
                    </Text>

                    {item.combat?.damage?.hasDamage && (
                      <Text
                        style={[styles.itemSpecialText, { color: "#ff9800" }]}
                      >
                        ⚔️ Dano: {item.combat.damage.formula}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      default:
        return <Text style={{ color: "white" }}>Em construção...</Text>;
    }
  };

  const maxSteps = 11;

  const handleNext = () => {
    if (step === 1 && !characterData.selectedRace)
      return showAlert("Atenção", "Escolha uma raça antes de continuar.");
    if (step === 2 && characterData.classes.length === 0)
      return showAlert("Atenção", "Escolha uma classe antes de continuar.");
    if (step === 3 && (!characterData.name || !characterData.alignment))
      return showAlert(
        "Atenção",
        "Preencha pelo menos o Nome e o Alinhamento.",
      );
    if (step === 4) {
      const hasEmptyStats = Object.values(characterData.baseStats).some(
        (val) => val === "" || isNaN(val),
      );
      if (hasEmptyStats)
        return showAlert(
          "Atenção",
          "Todos os atributos devem ter um número válido.",
        );
    }
    if (
      step === 6 &&
      (!characterData.hpRolls || characterData.hpRolls.length === 0)
    ) {
      const hitDieStr = characterData.classes[0]?.classData?.hit_die || "d8";
      updateData("hpRolls", [parseInt(hitDieStr.replace("d", "")) || 8]);
    }

    if (step < maxSteps) {
      setStep(step + 1);
    } else {
      createCharacter(characterData);
      setFeedback({
        visible: true,
        title: "Ficha Salva!",
        message: "O personagem foi criado com sucesso!",
        type: "success",
      });
      setTimeout(() => {
        setFeedback({ ...feedback, visible: false });
        router.push("/");
      }, 2000);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Criando Ficha - Passo {step}</Text>
      </View>

      <View style={styles.content}>{renderCurrentStep()}</View>

      {!isKeyboardVisible && (
        <View style={styles.footer}>
          {step > 1 ? (
            <TouchableOpacity style={styles.navBtnBack} onPress={handleBack}>
              <Text style={styles.navBtnText}>Voltar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.navBtnBack}
              onPress={() => router.back()}
            >
              <Text style={styles.navBtnText}>Cancelar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.navBtnNext} onPress={handleNext}>
            <Text style={styles.navBtnText}>
              {step === maxSteps ? "Finalizar" : "Próximo"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE CRIAÇÃO DE ITEM PERSONALIZADO */}
      <Modal
        visible={customModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Criar{" "}
              {customItemType === "weapon"
                ? "Arma"
                : customItemType === "armor"
                  ? "Armadura"
                  : "Item"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome do Item *"
              placeholderTextColor="#888"
              value={customItemData.name}
              onChangeText={(text) =>
                setCustomItemData({ ...customItemData, name: text })
              }
            />

            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                placeholder="Custo (ex: 5 PO)"
                placeholderTextColor="#888"
                value={customItemData.cost}
                onChangeText={(text) =>
                  setCustomItemData({ ...customItemData, cost: text })
                }
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Peso (kg)"
                keyboardType="numeric"
                placeholderTextColor="#888"
                value={customItemData.weight}
                onChangeText={(text) =>
                  setCustomItemData({ ...customItemData, weight: text })
                }
              />
            </View>

            {customItemType === "weapon" && (
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                  placeholder="Dano (ex: 1d8)"
                  placeholderTextColor="#888"
                  value={customItemData.damage}
                  onChangeText={(text) =>
                    setCustomItemData({ ...customItemData, damage: text })
                  }
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Tipo (ex: Cortante)"
                  placeholderTextColor="#888"
                  value={customItemData.damage_type}
                  onChangeText={(text) =>
                    setCustomItemData({ ...customItemData, damage_type: text })
                  }
                />
              </View>
            )}

            {customItemType === "armor" && (
              <TextInput
                style={styles.input}
                placeholder="Bônus na CA (ex: 4)"
                keyboardType="numeric"
                placeholderTextColor="#888"
                value={customItemData.ac_bonus}
                onChangeText={(text) =>
                  setCustomItemData({ ...customItemData, ac_bonus: text })
                }
              />
            )}

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição breve..."
              multiline={true}
              textAlignVertical="top"
              placeholderTextColor="#888"
              value={customItemData.description}
              onChangeText={(text) =>
                setCustomItemData({ ...customItemData, description: text })
              }
            />

            <View style={styles.rowInputs}>
              <TouchableOpacity
                style={[styles.navBtnBack, { flex: 1, marginRight: 10 }]}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={styles.navBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtnNext, { flex: 1 }]}
                onPress={saveCustomItem}
              >
                <Text style={styles.navBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FeedbackModal
        visible={feedback.visible}
        title={feedback.title}
        message={feedback.message}
        type={feedback.type}
        onClose={() => setFeedback({ ...feedback, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  headerText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  content: { flex: 1, padding: 20 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1a1a1a",
  },
  navBtnBack: {
    padding: 15,
    backgroundColor: "#333",
    borderRadius: 8,
    flex: 0.45,
    alignItems: "center",
  },
  navBtnNext: {
    padding: 15,
    backgroundColor: "#b71c1c",
    borderRadius: 8,
    flex: 0.45,
    alignItems: "center",
  },
  navBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  stepContainer: { flex: 1 },
  stepTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ff5252",
    marginBottom: 5,
  },
  stepDesc: { color: "#aaa", fontSize: 14, marginBottom: 20 },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },

  optionCard: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  optionCardActive: { borderColor: "#ff5252", backgroundColor: "#2a1515" },
  optionName: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  optionSub: {
    color: "#ff9800",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },

  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 15,
  },
  rowInputs: { flexDirection: "row", justifyContent: "space-between" },
  textArea: { minHeight: 120 },
  infoBox: {
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoBoxLabel: { color: "#aaa", fontSize: 14 },
  infoBoxValue: { color: "#ff5252", fontWeight: "bold", fontSize: 16 },

  statRow: {
    flexDirection: "row",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  statName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  raceBonusText: { fontSize: 12, marginTop: 2, fontWeight: "bold" },
  statControls: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
    backgroundColor: "#121212",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  statBtn: { paddingHorizontal: 15, paddingVertical: 10 },
  statBtnText: {
    color: "#ff5252",
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 22,
  },
  baseStatInput: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    width: 35,
    textAlign: "center",
    paddingVertical: 5,
  },
  finalStatBox: { alignItems: "center", minWidth: 50 },
  finalStatText: { color: "#4caf50", fontSize: 20, fontWeight: "bold" },
  modifierText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },

  pointsPanel: {
    backgroundColor: "#3e2723",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff5252",
  },
  pointsLabel: { color: "#ffcdd2", fontSize: 14, fontWeight: "bold" },
  pointsValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 5,
  },

  skillRow: {
    flexDirection: "row",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  skillName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  skillClassBadge: { fontSize: 11, fontWeight: "bold", marginTop: 4 },
  skillControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },

  featCard: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  featCardActive: { borderColor: "#4caf50", backgroundColor: "#152a15" },
  featHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  featName: { color: "#fff", fontSize: 16, fontWeight: "bold", flex: 1 },
  ownedBadge: {
    backgroundColor: "#1b5e20",
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featType: {
    color: "#ff5252",
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  featPreview: { color: "#aaa", fontSize: 13, lineHeight: 18 },
  featReq: { color: "#ff9800", fontSize: 11, marginTop: 8, fontWeight: "bold" },

  itemSpecialText: {
    color: "#4caf50",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "bold",
  },

  // NOVOS ESTILOS
  searchRow: { flexDirection: "row", marginBottom: 15 },
  searchBar: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 10,
  },
  addCustomBtn: {
    backgroundColor: "#b71c1c",
    width: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addCustomBtnText: { color: "#fff", fontSize: 24, fontWeight: "bold" },

  goldBox: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ff9800",
    alignItems: "center",
  },
  goldBoxLabel: {
    color: "#ffb74d",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  goldInput: {
    backgroundColor: "#121212",
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    width: "50%",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 15,
    padding: 25,
    borderWidth: 1,
    borderColor: "#444",
  },
  modalTitle: {
    color: "#ff5252",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
});
