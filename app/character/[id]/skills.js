// Caminho: app/character/[id]/skills.js
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCharacterStore } from "../../../stores/charStore";
import FeedbackModal from "../../../components/FeedbackModal";
import { DND35Engine } from "../../../engines/d&d35";
import SKILLS_DATA from "../../../data/D&D3.5/pericias.json";

export default function SkillsScreen() {
  const { id } = useLocalSearchParams();

  const characters = useCharacterStore((state) => state.characters);
  const updateActiveCharacter = useCharacterStore(
    (state) => state.updateActiveCharacter,
  );
  const setActiveCharacter = useCharacterStore(
    (state) => state.setActiveCharacter,
  );

  const [search, setSearch] = useState("");

  // NOVO: Estado para controlar qual perícia está aberta no Modal
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    if (id) setActiveCharacter(id);
  }, [id]);

  const char = characters.find((c) => c.id === id);

  if (!char)
    return <Text style={{ color: "white", padding: 20 }}>Carregando...</Text>;

  const currentACP = DND35Engine.getArmorCheckPenalty(char);

  const changeRank = (skillSlug, amount) => {
    const currentSkills = char.skills || {};
    const currentRank = currentSkills[skillSlug] || 0;
    const maxRanks = DND35Engine.getMaxSkillRanks(char, skillSlug);

    let newRank = currentRank + amount;
    if (newRank < 0) newRank = 0;
    if (newRank > maxRanks) newRank = maxRanks;

    updateActiveCharacter({
      skills: { ...currentSkills, [skillSlug]: newRank },
    });
  };

  const filteredSkills = SKILLS_DATA.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const renderSkill = ({ item: skill }) => {
    const ranks = char.skills?.[skill.slug] || 0;
    const maxRanks = DND35Engine.getMaxSkillRanks(char, skill.slug);
    const attrMod = DND35Engine.getModifier(char, skill.attribute);
    const total = DND35Engine.getSkillTotal(
      char,
      skill.slug,
      skill.attribute,
      skill.armor_check_penalty,
    );
    const synergy = DND35Engine.getSynergyBonus(char, skill.slug);

    const canUse = !skill.trained_only || ranks > 0;
    const displayTotal = canUse ? (total >= 0 ? `+${total}` : total) : "🔒";
    const isMaxedOut = ranks >= maxRanks;

    return (
      <View style={styles.row}>
        {/* INFORMAÇÃO DA PERÍCIA (Agora é clicável para abrir o Modal) */}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => setSelectedSkill(skill)}
        >
          <Text style={[styles.skillName, !canUse && { color: "#666" }]}>
            {skill.name}{" "}
            {skill.trained_only && (
              <Text style={styles.trainedBadge}> *Treino</Text>
            )}
          </Text>
          <Text style={styles.skillMath}>
            {skill.attribute.toUpperCase()} (
            {attrMod >= 0 ? "+" + attrMod : attrMod})
            {skill.armor_check_penalty && currentACP < 0
              ? ` • Armd (${currentACP})`
              : ""}
            {synergy > 0 ? ` • Sinergia (+${synergy})` : ""}
          </Text>
        </TouchableOpacity>

        {/* TOTAL DA PERÍCIA */}
        <View
          style={{ width: 60, alignItems: "center", justifyContent: "center" }}
        >
          <View
            style={[styles.totalBadge, !canUse && { backgroundColor: "#222" }]}
          >
            <Text style={[styles.totalText, !canUse && { color: "#666" }]}>
              {displayTotal}
            </Text>
          </View>
        </View>

        {/* CONTROLO DE GRADUAÇÕES (+ e -) */}
        <View
          style={{
            width: 100,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <TouchableOpacity
            style={styles.btn}
            onPress={() => changeRank(skill.slug, -1)}
          >
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.rankText}>{ranks}</Text>
          <TouchableOpacity
            style={[styles.btn, isMaxedOut && { backgroundColor: "#555" }]}
            onPress={() => changeRank(skill.slug, 1)}
            disabled={isMaxedOut}
          >
            <Text style={[styles.btnText, isMaxedOut && { color: "#aaa" }]}>
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Função para renderizar a linha de cálculo no modal
  const MathRow = ({ label, value, isNegative }) => {
    if (value === 0 && label !== "Graduações") return null; // Esconde se for 0, exceto graduações
    return (
      <View style={styles.mathRow}>
        <Text style={styles.mathLabel}>{label}</Text>
        <Text
          style={[
            styles.mathValue,
            isNegative ? { color: "#ff5252" } : { color: "#4caf50" },
          ]}
        >
          {value > 0 && !isNegative ? `+${value}` : value}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perícias</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {currentACP < 0 && (
        <View style={styles.acpAlert}>
          <Text style={styles.acpAlertText}>
            ⚠️ Penalidade de Armadura: {currentACP}
          </Text>
        </View>
      )}

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1 }]}>NOME DA PERÍCIA</Text>
          <Text style={[styles.th, { width: 60, textAlign: "center" }]}>
            TOTAL
          </Text>
          <Text style={[styles.th, { width: 100, textAlign: "right" }]}>
            GRADS.
          </Text>
        </View>
        <FlatList
          data={filteredSkills}
          keyExtractor={(item) => item.slug}
          renderItem={renderSkill}
          initialNumToRender={15}
        />
      </View>

      {/* MODAL DE DETALHES DA PERÍCIA */}
      <Modal
        visible={!!selectedSkill}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedSkill(null)}
      >
        <View style={styles.modalOverlay}>
          {selectedSkill &&
            (() => {
              const ranks = char.skills?.[selectedSkill.slug] || 0;
              const attrMod = DND35Engine.getModifier(
                char,
                selectedSkill.attribute,
              );
              const acp = selectedSkill.armor_check_penalty ? currentACP : 0;
              const synergy = DND35Engine.getSynergyBonus(
                char,
                selectedSkill.slug,
              );
              const misc = DND35Engine.getSkillMiscBonus(
                char,
                selectedSkill.slug,
              );
              const total = DND35Engine.getSkillTotal(
                char,
                selectedSkill.slug,
                selectedSkill.attribute,
                selectedSkill.armor_check_penalty,
              );

              return (
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{selectedSkill.name}</Text>

                  <View style={styles.modalTags}>
                    <Text style={styles.tagBadge}>
                      {selectedSkill.attribute.toUpperCase()}
                    </Text>
                    {selectedSkill.trained_only && (
                      <Text
                        style={[
                          styles.tagBadge,
                          { backgroundColor: "#ff9800" },
                        ]}
                      >
                        Somente Treinado
                      </Text>
                    )}
                    {selectedSkill.armor_check_penalty && (
                      <Text
                        style={[
                          styles.tagBadge,
                          { backgroundColor: "#3e2723" },
                        ]}
                      >
                        Penalidade de Armadura
                      </Text>
                    )}
                  </View>

                  <Text style={styles.modalDesc}>
                    {selectedSkill.description}
                  </Text>

                  <View style={styles.mathBox}>
                    <Text style={styles.mathBoxTitle}>CÁLCULO TOTAL</Text>
                    <MathRow
                      label={`Atributo Base (${selectedSkill.attribute.toUpperCase()})`}
                      value={attrMod}
                    />
                    <MathRow
                      label="Graduações (Ranks)"
                      value={Math.floor(ranks)}
                    />
                    <MathRow label="Sinergia" value={synergy} />
                    <MathRow label="Raça / Talentos" value={misc} />
                    <MathRow
                      label="Penalidade de Armadura/Escudo"
                      value={acp}
                      isNegative={acp < 0}
                    />

                    <View style={styles.mathDivider} />

                    <View style={styles.mathRow}>
                      <Text
                        style={[
                          styles.mathLabel,
                          { fontWeight: "bold", color: "#fff" },
                        ]}
                      >
                        Total Final
                      </Text>
                      <Text
                        style={[
                          styles.mathValue,
                          { fontSize: 24, color: "#fff" },
                        ]}
                      >
                        {total >= 0 ? `+${total}` : total}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedSkill(null)}
                  >
                    <Text style={styles.closeBtnText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  header: {
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#ff5252" },
  searchInput: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    width: "45%",
    borderWidth: 1,
    borderColor: "#333",
  },
  acpAlert: {
    backgroundColor: "#3e2723",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ff5252",
  },
  acpAlertText: { color: "#ffcdd2", fontSize: 12, fontWeight: "bold" },
  table: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#b71c1c",
    padding: 10,
  },
  th: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  row: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    alignItems: "center",
  },
  skillName: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  trainedBadge: { color: "#ff9800", fontSize: 9, fontWeight: "normal" },
  skillMath: { color: "#888", fontSize: 10, marginTop: 2 },
  totalBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    alignItems: "center",
  },
  totalText: {
    color: "#4caf50",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#333",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "bold", lineHeight: 20 },
  rankText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    width: 20,
    textAlign: "center",
  },

  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    width: "100%",
    borderRadius: 15,
    padding: 25,
    borderWidth: 1,
    borderColor: "#444",
  },
  modalTitle: {
    color: "#ff5252",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 15,
  },
  tagBadge: {
    backgroundColor: "#333",
    color: "#fff",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: "bold",
  },
  modalDesc: { color: "#ccc", fontSize: 14, lineHeight: 22, marginBottom: 25 },

  mathBox: {
    backgroundColor: "#121212",
    borderRadius: 10,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#333",
  },
  mathBoxTitle: {
    color: "#888",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  mathRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  mathLabel: { color: "#aaa", fontSize: 14 },
  mathValue: { fontWeight: "bold", fontSize: 16 },
  mathDivider: { height: 1, backgroundColor: "#333", marginVertical: 10 },

  closeBtn: {
    backgroundColor: "#b71c1c",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
