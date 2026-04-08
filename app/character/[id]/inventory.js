// Caminho: app/character/[id]/inventory.js
import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCharacterStore } from "../../../stores/charStore";
import { DND35Engine } from "../../../engines/d&d35";
import FeedbackModal from "../../../components/FeedbackModal";

export default function InventoryScreen() {
  const { id } = useLocalSearchParams();

  const characters = useCharacterStore((state) => state.characters);
  const char = characters.find((c) => c.id === id);

  if (!char) return <Text style={{ color: "white" }}>Carregando...</Text>;

  // Pede os cálculos matemáticos para a Engine do 3.5
  const totalWeight = DND35Engine.getTotalWeight(char);
  const caps = DND35Engine.getCarryingCapacity(char);
  const encumbrance = DND35Engine.getEncumbrance(char);

  // Escolhe a cor do painel de peso baseado no status
  const weightColor =
    encumbrance === "Pesada"
      ? "#ff5252"
      : encumbrance === "Média"
        ? "#ff9800"
        : "#4caf50";

  // Componente visual para mostrar o que está nas mãos
  const EquippedSlot = ({ label, item, icon }) => (
    <View style={styles.slotBox}>
      <Text style={styles.slotLabel}>{label}</Text>
      <Text style={styles.slotIcon}>{icon}</Text>
      <Text style={styles.slotItemName}>{item ? item.name : "Vazio"}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* PAINEL DE CARGA */}
        <View style={[styles.weightCard, { borderColor: weightColor }]}>
          <Text style={styles.weightTitle}>CARGA ATUAL ({encumbrance})</Text>
          <Text style={[styles.weightBig, { color: weightColor }]}>
            {totalWeight.toFixed(1)} kg
          </Text>
          <Text style={styles.weightLimits}>
            Leve: {caps.light}kg • Média: {caps.medium}kg • Pesada: {caps.heavy}
            kg
          </Text>
        </View>

        {/* ITENS EQUIPADOS */}
        <Text style={styles.sectionTitle}>Equipamento Ativo</Text>
        <View style={styles.equippedGrid}>
          <EquippedSlot label="MÃO PRINCIPAL" icon="⚔️" item={char.mainHand} />
          <EquippedSlot label="MÃO SECUNDÁRIA" icon="🛡️" item={char.offHand} />
          <EquippedSlot label="ARMADURA" icon="👕" item={char.selectedArmor} />
        </View>

        {/* LISTA DA MOCHILA */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Mochila</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Adicionar Item</Text>
          </TouchableOpacity>
        </View>

        {char.inventory && char.inventory.length > 0 ? (
          char.inventory.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>
                  {item.type || "Item"} • {item.weight || 0}kg
                </Text>
              </View>
              <TouchableOpacity style={styles.equipBtn}>
                <Text style={styles.equipBtnText}>Equipar</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Sua mochila está vazia.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  weightCard: {
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
  },
  weightTitle: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  weightBig: { fontSize: 36, fontWeight: "bold", marginBottom: 5 },
  weightLimits: { color: "#666", fontSize: 10 },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 10,
  },
  equippedGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  slotBox: {
    backgroundColor: "#1e1e1e",
    width: "31%",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  slotLabel: {
    color: "#ff5252",
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  slotIcon: { fontSize: 24, marginBottom: 5 },
  slotItemName: {
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
    fontWeight: "bold",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  addBtn: {
    backgroundColor: "#b71c1c",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  itemDesc: { color: "#888", fontSize: 12 },
  equipBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  equipBtnText: { color: "#4caf50", fontWeight: "bold", fontSize: 12 },
  emptyBox: {
    padding: 30,
    alignItems: "center",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
  },
  emptyText: { color: "#666" },
});
