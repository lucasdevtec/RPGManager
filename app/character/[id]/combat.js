// Caminho: app/character/[id]/combat.js
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCharacterStore } from "../../../stores/charStore";
import { DND35Engine } from "../../../engines/d&d35";
import FeedbackModal from "../../../components/FeedbackModal";

export default function CombatScreen() {
  const { id } = useLocalSearchParams();

  const characters = useCharacterStore((state) => state.characters);
  const updateActiveCharacter = useCharacterStore(
    (state) => state.updateActiveCharacter,
  );
  const setActiveCharacter = useCharacterStore(
    (state) => state.setActiveCharacter,
  );
  const [hpModalVisible, setHpModalVisible] = useState(false); // Controle do Modal de Evolução

  useEffect(() => {
    if (id) setActiveCharacter(id);
  }, [id]);

  // --- LÓGICA DO PAINEL DE EVOLUÇÃO (HP) ---
  // Mapeia os dados de vida para cada nível do personagem
  const levelProgression = [];
  char?.classes?.forEach((c) => {
    const hd = parseInt(
      (c.classData?.hit_die || "10").toString().replace("d", ""),
    );
    for (let i = 0; i < (c.level || 1); i++) {
      levelProgression.push({
        classSlug: c.slug || "Classe",
        hd: hd,
        levelIndex: levelProgression.length,
      });
    }
  });

  const char = characters.find((c) => c.id === id);

  const maxHp = DND35Engine.getMaxHP(char);
  const [hpInput, setHpInput] = useState(
    char?.currentHp !== undefined
      ? char.currentHp.toString()
      : maxHp.toString(),
  );

  // Atualiza o estado local se o HP mudar por outro lugar
  useEffect(() => {
    if (char && char.currentHp !== undefined) {
      setHpInput(char.currentHp.toString());
    }
  }, [char?.currentHp]);

  if (!char)
    return <Text style={{ color: "white", padding: 20 }}>Carregando...</Text>;

  // --- FUNÇÕES DE HP ---

  // Salva o HP digitado quando o usuário tira o dedo do teclado (onBlur)
  const saveTypedHp = () => {
    const newHp = parseInt(hpInput) || 0;
    updateActiveCharacter({ currentHp: newHp });
  };

  // Botões de + e - rápido
  const adjustHp = (amount) => {
    const current = parseInt(hpInput) || 0;
    const newHp = current + amount;
    if (maxHp < newHp) {
      updateActiveCharacter({ currentHp: maxHp });
      setHpInput(maxHp.toString());
      return;
    }
    setHpInput(newHp.toString()); // Atualiza a tela na hora
    updateActiveCharacter({ currentHp: newHp }); // Salva no banco
  };

  const setLevelHp = (index, value, maxHd) => {
    const newRolls = [...(char.hpRolls || [])];
    let safeValue = parseInt(value) || 1;
    if (safeValue > maxHd) safeValue = maxHd; // Não deixa passar do máximo do dado
    if (safeValue < 1) safeValue = 1; // Não deixa rolar 0 ou negativo
    newRolls[index] = safeValue;
    updateActiveCharacter({ hpRolls: newRolls });
  };

  // --- MATEMÁTICA DO MOTOR ---
  const ca = DND35Engine.getAC(char);
  const inic = DND35Engine.getInitiative(char);
  const bba = DND35Engine.getBABValue(char);

  // Ataques (Usando as funções que já criamos no motor)
  const mainAtkBonus = DND35Engine.getMainAtk(char);
  const mainDamage = DND35Engine.getWeaponDamage(char, true);

  // Componente visual para as armas
  const WeaponCard = ({ item, isMain }) => {
    if (!item || item.type === "Escudo") return null;

    // Simplificação: Se for off-hand, a penalidade e dano são calculados pelo motor
    const atkBonus = isMain ? mainAtkBonus : mainAtkBonus - 4; // Exemplo simplificado para offhand
    const damage = DND35Engine.getWeaponDamage(char, isMain);

    return (
      <View style={styles.weaponCard}>
        <View style={styles.weaponHeader}>
          <Text style={styles.weaponName}>{item.name}</Text>
          <Text style={styles.weaponHand}>
            {isMain ? "Principal" : "Secundária"}
          </Text>
        </View>

        <View style={styles.weaponMathRow}>
          <View style={styles.weaponStatBox}>
            <Text style={styles.weaponStatLabel}>ATAQUE</Text>
            <Text style={styles.weaponStatValue}>
              {atkBonus >= 0 ? `+${atkBonus}` : atkBonus}
            </Text>
          </View>
          <View style={styles.weaponStatBox}>
            <Text style={styles.weaponStatLabel}>DANO</Text>
            <Text style={[styles.weaponStatValue, { color: "#ff9800" }]}>
              {damage}
            </Text>
          </View>
          <View style={styles.weaponStatBox}>
            <Text style={styles.weaponStatLabel}>CRÍTICO</Text>
            <Text style={styles.weaponStatValue}>
              {item.critical || "20/x2"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* CABEÇALHO */}
        <View style={styles.headerCard}>
          <Text style={styles.nameText}>{char.name}</Text>
        </View>

        {/* CONTROLE DE PONTOS DE VIDA (HP) */}
        <View style={styles.hpContainer}>
          <View style={styles.hpHeaderRow}>
            <Text style={styles.hpTitle}>PONTOS DE VIDA</Text>
            {/* BOTÃO DA EVOLUÇÃO DE HP */}
            <TouchableOpacity
              style={styles.hpConfigBtn}
              onPress={() => setHpModalVisible(true)}
            >
              <Text style={styles.hpConfigText}>⚙️ Evoluir HP</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hpControls}>
            <TouchableOpacity
              style={[styles.hpBtn, { backgroundColor: "#b71c1c" }]}
              onPress={() => adjustHp(-1)}
              onLongPress={() => adjustHp(-5)}
            >
              <Text style={styles.hpBtnText}>-</Text>
            </TouchableOpacity>

            <View style={styles.hpInputWrapper}>
              <TextInput
                style={styles.hpInput}
                keyboardType="numeric"
                value={hpInput}
                onChangeText={setHpInput}
                onBlur={saveTypedHp}
                selectTextOnFocus={true}
              />
              <Text style={styles.hpMaxText}>/ {maxHp}</Text>
            </View>

            <TouchableOpacity
              style={[styles.hpBtn, { backgroundColor: "#2e7d32" }]}
              onPress={() => adjustHp(1)}
              onLongPress={() => adjustHp(5)}
            >
              <Text style={styles.hpBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PAINEL PRINCIPAL (BIG NUMBERS) */}
        <View style={styles.mainGrid}>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>CA</Text>
            <Text style={styles.bigValue}>{ca}</Text>
          </View>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>INIC.</Text>
            <Text style={[styles.bigValue, { color: "#4caf50" }]}>
              {inic >= 0 ? "+" : ""}
              {inic}
            </Text>
          </View>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>BBA</Text>
            <Text style={styles.bigValue}>+{bba}</Text>
          </View>
        </View>

        {/* ARMAS EQUIPADAS */}
        <Text style={styles.sectionTitle}>
          Ataques Corpo a Corpo / Distância
        </Text>

        {char.mainHand ? (
          <WeaponCard item={char.mainHand} isMain={true} />
        ) : (
          <WeaponCard
            item={{
              name: "Ataque Desarmado",
              damage_medium: "1d3",
              critical: "20/x2",
            }}
            isMain={true}
          />
        )}

        {char.offHand && char.offHand.type !== "Escudo" && (
          <WeaponCard item={char.offHand} isMain={false} />
        )}

        {/* RESISTÊNCIAS (SAVES) */}
        <Text style={styles.sectionTitle}>Testes de Resistência</Text>
        <View style={styles.saveRow}>
          <View style={[styles.saveBox, { borderColor: "#ef5350" }]}>
            <Text style={styles.saveLabel}>FORT</Text>
            <Text style={styles.saveVal}>
              +{DND35Engine.getSaveTotal(char, "fort", "con")}
            </Text>
          </View>
          <View style={[styles.saveBox, { borderColor: "#42a5f5" }]}>
            <Text style={styles.saveLabel}>REFL</Text>
            <Text style={styles.saveVal}>
              +{DND35Engine.getSaveTotal(char, "ref", "dex")}
            </Text>
          </View>
          <View style={[styles.saveBox, { borderColor: "#ab47bc" }]}>
            <Text style={styles.saveLabel}>VONT</Text>
            <Text style={styles.saveVal}>
              +{DND35Engine.getSaveTotal(char, "will", "wis")}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={hpModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gerenciar Dados de Vida</Text>
            <Text style={styles.modalSub}>
              Sua Constituição e Talentos já são somados automaticamente no
              total.
            </Text>

            <ScrollView style={{ maxHeight: 400, marginTop: 15 }}>
              {levelProgression.map((lvl, idx) => {
                const isLevelOne = idx === 0;
                const currentRoll =
                  char.hpRolls?.[idx] ||
                  (isLevelOne ? lvl.hd : Math.floor(lvl.hd / 2) + 1);

                return (
                  <View key={idx} style={styles.levelRow}>
                    <Text style={styles.levelLabel}>
                      Nível {idx + 1}{" "}
                      <Text style={{ color: "#888" }}>(d{lvl.hd})</Text>
                    </Text>

                    {isLevelOne ? (
                      <Text style={styles.maxText}>Máximo ({lvl.hd})</Text>
                    ) : (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.optBtn}
                          onPress={() =>
                            setLevelHp(idx, Math.floor(lvl.hd / 2) + 1, lvl.hd)
                          }
                        >
                          <Text style={styles.optText}>Média</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.optBtn}
                          onPress={() => setLevelHp(idx, lvl.hd, lvl.hd)}
                        >
                          <Text style={styles.optText}>Máx</Text>
                        </TouchableOpacity>

                        <TextInput
                          style={styles.manualInput}
                          keyboardType="numeric"
                          value={currentRoll.toString()}
                          onChangeText={(text) => setLevelHp(idx, text, lvl.hd)}
                          selectTextOnFocus={true}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setHpModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Pronto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#121212" },
  container: { padding: 15 },
  headerCard: { marginBottom: 15, alignItems: "center" },
  nameText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Estilos do HP
  hpContainer: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  hpTitle: {
    color: "#ff5252",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    letterSpacing: 1,
  },
  hpControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  hpBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  hpBtnText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 32,
  },
  hpInputWrapper: {
    flexDirection: "row",
    alignItems: "baseline",
    marginHorizontal: 20,
  },
  hpInput: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "black",
    minWidth: 60,
    textAlign: "center",
    padding: 0,
  },
  hpMaxText: { color: "#666", fontSize: 20, fontWeight: "bold", marginLeft: 5 },
  hpHint: { color: "#666", fontSize: 10, marginTop: 10, fontStyle: "italic" },

  mainGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  bigBox: {
    backgroundColor: "#1a1a1a",
    width: "31%",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  bigLabel: {
    color: "#ff5252",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  bigValue: { color: "#fff", fontSize: 30, fontWeight: "black" },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 5,
  },

  // Estilos da Arma
  weaponCard: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
  weaponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 8,
  },
  weaponName: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  weaponHand: { color: "#888", fontSize: 12, fontStyle: "italic" },
  weaponMathRow: { flexDirection: "row", justifyContent: "space-between" },
  weaponStatBox: { alignItems: "center", width: "30%" },
  weaponStatLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
  },
  weaponStatValue: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  saveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  saveBox: {
    backgroundColor: "#1a1a1a",
    width: "31%",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderLeftWidth: 5,
  },
  saveLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
  },
  saveVal: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  hpHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  hpConfigBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hpConfigText: { color: "#ddd", fontSize: 12, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "#444",
  },
  modalTitle: { color: "#ff5252", fontSize: 22, fontWeight: "bold" },
  modalSub: { color: "#aaa", fontSize: 12, marginTop: 5, fontStyle: "italic" },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  levelLabel: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  maxText: { color: "#4caf50", fontWeight: "bold", fontStyle: "italic" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  optBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  optText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  manualInput: {
    backgroundColor: "#000",
    color: "#ff9800",
    fontSize: 16,
    fontWeight: "bold",
    width: 40,
    textAlign: "center",
    borderRadius: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#555",
  },
  closeBtn: {
    backgroundColor: "#b71c1c",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
