// Caminho: app/character/[id]/index.js

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCharacterStore } from "../../../stores/charStore";
import FeedbackModal from "../../../components/FeedbackModal";

export default function CharacterDashboard() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const characters = useCharacterStore((state) => state.characters);
  const updateActiveCharacter = useCharacterStore(
    (state) => state.updateActiveCharacter,
  );
  const setActiveCharacter = useCharacterStore(
    (state) => state.setActiveCharacter,
  );

  // Estados dos Modais
  const [xpModalVisible, setXpModalVisible] = useState(false);
  const [feedback, setFeedback] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });
  const [xpInput, setXpInput] = useState("");
  const [levelUpModalVisible, setLevelUpModalVisible] = useState(false);

  // NOVO: Modal Padronizado para Feedbacks (Substitui o Alert)
  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    if (id) setActiveCharacter(id);
  }, [id]);

  const char = characters.find((c) => c.id === id);

  if (!char) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: "white", textAlign: "center", marginTop: 50 }}>
          Personagem não encontrado.
        </Text>
      </SafeAreaView>
    );
  }

  // Cálculos de Nível e XP
  const totalLevel =
    char.classes?.reduce((acc, curr) => acc + curr.level, 0) || char.level || 1;
  const nextLevel = totalLevel + 1;
  const classNames =
    char.classes?.map((c) => c.slug.toUpperCase()).join(" / ") || "AVENTUREIRO";

  const currentXp = char.xp || 0;
  const nextLevelXp = ((totalLevel * (totalLevel + 1)) / 2) * 1000;
  const xpPercentage = Math.min((currentXp / nextLevelXp) * 100, 100);
  const canLevelUp = currentXp >= nextLevelXp;

  // Regras de Evolução do D&D 3.5
  const gainsFeat = nextLevel % 3 === 0;
  const gainsAttr = nextLevel % 4 === 0;

  const hasSpells = char.classes?.some(
    (c) => c.slug === "wizard" || c.slug === "sorcerer" || c.slug === "bard",
  );
  const hasMiracles = char.classes?.some(
    (c) => c.slug === "cleric" || c.slug === "paladin" || c.slug === "druid",
  );

  // --- FUNÇÕES ---

  const handleAddXp = () => {
    const gainedXp = parseInt(xpInput) || 0;
    if (gainedXp > 0) {
      const newXp = currentXp + gainedXp;
      updateActiveCharacter({ xp: newXp });

      // Aviso de que subiu de nível padronizado
      if (newXp >= nextLevelXp && currentXp < nextLevelXp) {
        setFeedback({
          visible: true,
          title: "Nível Alcançado!",
          message:
            "Você tem XP suficiente para subir de nível! Clique no botão verde de Evolução.",
          type: "success",
        });
      }
    }
    setXpModalVisible(false);
    setXpInput("");
  };

  const openLevelUpModal = () => {
    console.log("aaaaa");

    if (!canLevelUp) {
      setFeedback({
        visible: true,
        title: "Atenção",
        message: `Ainda faltam ${nextLevelXp - currentXp} XP para o próximo nível. Continue se aventurando!`,
        type: "info",
      });
      return;
    }
    setLevelUpModalVisible(true);
  };

  // AGORA RECEBE O ÍNDICE DA CLASSE ESCOLHIDA
  const confirmLevelUp = (classIndex) => {
    if (char.classes && char.classes.length > 0) {
      const updatedClasses = [...char.classes];
      const className = updatedClasses[classIndex].slug.toUpperCase();

      updatedClasses[classIndex].level += 1;
      updateActiveCharacter({ classes: updatedClasses });

      setLevelUpModalVisible(false);
      setFeedbackModal({
        visible: true,
        title: "🎉 Evolução Concluída!",
        message: `${char.name} agora é um ${className} de Nível ${updatedClasses[classIndex].level}!\n\nLembre-se de ir no painel de Combate para rolar seu novo Dado de Vida.`,
        type: "success",
      });
    }
  };

  const handleNewClass = () => {
    setLevelUpModalVisible(false);
    setFeedbackModal({
      visible: true,
      title: "Em Breve",
      message:
        "A funcionalidade de adicionar uma classe totalmente nova ao personagem através do compêndio estará disponível nas próximas atualizações!",
      type: "info",
    });
  };

  const MenuButton = ({ title, icon, route }) => (
    <TouchableOpacity
      style={styles.menuBtn}
      onPress={() => router.push(`/character/${id}/${route}`)}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* HERO CARD E MENUS CONTINUAM IGUAIS... */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={{ fontSize: 45 }}>👤</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.charName} numberOfLines={1}>
                {char.name}
              </Text>
              <Text style={styles.charSub}>
                {classNames} • NÍVEL {totalLevel}
              </Text>
              <View style={styles.badgeRow}>
                <Text style={styles.systemBadge}>
                  {char.system || "D&D 3.5"}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.levelUpBtn,
                    canLevelUp ? styles.levelUpReady : styles.levelUpLocked,
                  ]}
                  onPress={openLevelUpModal}
                >
                  <Text style={styles.levelUpText}>⬆️ Nível</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.xpSection}>
            <View style={styles.xpInfoRow}>
              <Text style={styles.xpText}>
                XP: <Text style={{ color: "#fff" }}>{currentXp}</Text> /{" "}
                {nextLevelXp}
              </Text>
              <TouchableOpacity
                style={styles.addXpBtn}
                onPress={() => setXpModalVisible(true)}
              >
                <Text style={styles.addXpBtnText}>+ XP</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${xpPercentage}%`,
                    backgroundColor: canLevelUp ? "#4caf50" : "#ff9800",
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <MenuButton title="Combate" icon="⚔️" route="combat" />
          <MenuButton title="Inventário" icon="🎒" route="inventory" />
          <MenuButton title="Perícias" icon="🎲" route="skills" />
          <MenuButton title="Talentos" icon="📜" route="feats" />
          {hasSpells && <MenuButton title="Magias" icon="✨" route="spells" />}
          {hasMiracles && (
            <MenuButton title="Milagres" icon="🙌" route="miracles" />
          )}
          <MenuButton title="Gastos" icon="💰" route="finances" />
          <MenuButton title="Anotações" icon="📝" route="notes" />
        </View>
      </ScrollView>

      {/* MODAL PADRONIZADO DE FEEDBACK (O QUE SUBSTITUIU O ALERT) */}
      <FeedbackModal
        visible={feedback.visible}
        title={feedback.title}
        message={feedback.message}
        type={feedback.type}
        onClose={() => setFeedback({ ...feedback, visible: false })}
      />

      {/* MODAL PARA ADICIONAR XP */}
      <Modal visible={xpModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Receber Experiência</Text>
            <Text style={styles.modalSub}>
              Quanto XP a party ganhou nesta sessão?
            </Text>
            <TextInput
              style={styles.xpInput}
              keyboardType="numeric"
              placeholder="Ex: 500"
              placeholderTextColor="#555"
              value={xpInput}
              onChangeText={setXpInput}
              autoFocus={true}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.closeXpBtn}
                onPress={() => setXpModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmXpBtn}
                onPress={handleAddXp}
              >
                <Text style={styles.confirmXpText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA SUBIR DE NÍVEL (COM OPÇÕES DE MULTICLASSE) */}
      <Modal
        visible={levelUpModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Avançar para Nível {nextLevel}!
            </Text>

            <View style={styles.benefitsBox}>
              <Text style={styles.benefitItem}>
                ❤️ +1 Dado de Vida (Role em Combate)
              </Text>
              <Text style={styles.benefitItem}>
                ⚔️ BBA e Resistências atualizados
              </Text>
              {gainsFeat && (
                <Text style={[styles.benefitItem, { color: "#4caf50" }]}>
                  📜 Novo Talento Geral Adquirido!
                </Text>
              )}
              {gainsAttr && (
                <Text style={[styles.benefitItem, { color: "#42a5f5" }]}>
                  💪 +1 Ponto de Atributo livre!
                </Text>
              )}
            </View>

            <Text style={styles.sectionTitleModal}>
              Selecione a Classe para Evoluir:
            </Text>

            {/* Mapeia as classes atuais do personagem para ele escolher */}
            {char.classes?.map((c, index) => (
              <TouchableOpacity
                key={index}
                style={styles.classChoiceBtn}
                onPress={() => confirmLevelUp(index)}
              >
                <View>
                  <Text style={styles.classChoiceTitle}>
                    {c.slug.toUpperCase()}
                  </Text>
                  <Text style={styles.classChoiceSub}>
                    Ir para Nível {c.level + 1}
                  </Text>
                </View>
                <Text style={styles.classChoiceIcon}>➕</Text>
              </TouchableOpacity>
            ))}

            {/* Opção para adicionar uma classe nova (Multiclasse Nível 1) */}
            <TouchableOpacity
              style={styles.newClassBtn}
              onPress={handleNewClass}
            >
              <Text style={styles.newClassBtnText}>
                + Adicionar Nova Classe (Multiclasse)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeBtn, { marginTop: 15 }]}
              onPress={() => setLevelUpModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Cancelar Evolução</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  heroCard: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#333",
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#b71c1c",
  },
  heroInfo: { flex: 1, justifyContent: "center" },
  charName: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  charSub: { color: "#aaa", fontSize: 12, fontWeight: "bold", marginTop: 3 },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  systemBadge: {
    backgroundColor: "#3e2723",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    color: "#ffcdd2",
    fontSize: 10,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: "#b71c1c",
  },
  levelUpBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 2,
  },
  levelUpLocked: { backgroundColor: "#333" },
  levelUpReady: { backgroundColor: "#2e7d32" },
  levelUpText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  xpSection: { marginTop: 5 },
  xpInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  xpText: { color: "#888", fontSize: 12, fontWeight: "bold" },
  addXpBtn: {
    backgroundColor: "#b71c1c",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addXpBtnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  progressBarBg: {
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuBtn: {
    backgroundColor: "#1e1e1e",
    width: "48%",
    paddingVertical: 25,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  menuIcon: { fontSize: 32, marginBottom: 10 },
  menuText: { color: "#ddd", fontWeight: "bold", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
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
  modalTitle: { color: "#ff5252", fontSize: 22, fontWeight: "bold" },
  modalSub: { color: "#aaa", fontSize: 13, marginTop: 5, marginBottom: 15 },
  benefitsBox: {
    backgroundColor: "#121212",
    padding: 15,
    marginTop: 5,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  benefitItem: {
    color: "#ddd",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "bold",
  },
  xpInput: {
    backgroundColor: "#000",
    color: "#ff9800",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    borderRadius: 10,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#555",
    marginBottom: 25,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  closeBtn: {
    backgroundColor: "#b71c1c",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  closeXpBtn: {
    backgroundColor: "#b71c1c",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  confirmXpBtn: {
    backgroundColor: "#2e7d32",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  confirmXpText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  sectionTitleModal: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
  },
  classChoiceBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#555",
  },
  classChoiceTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  classChoiceSub: {
    color: "#4caf50",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
  classChoiceIcon: { fontSize: 20 },
  newClassBtn: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#444",
    borderStyle: "dashed",
  },
  newClassBtnText: { color: "#888", fontWeight: "bold" },
});
