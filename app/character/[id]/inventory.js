// Caminho: app/character/[id]/inventory.js
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCharacterStore } from "../../../stores/charStore";
import { DND35Engine } from "../../../engines/d&d35";
import FeedbackModal from "../../../components/FeedbackModal";
import uuid from "react-native-uuid";

export default function InventoryScreen() {
  const { id } = useLocalSearchParams();

  const characters = useCharacterStore((state) => state.characters);
  const updateActiveCharacter = useCharacterStore(
    (state) => state.updateActiveCharacter,
  );
  const setActiveCharacter = useCharacterStore(
    (state) => state.setActiveCharacter,
  );

  useEffect(() => {
    if (id) setActiveCharacter(id);
  }, [id]);

  const char = characters.find((c) => c.id === id);

  // Estados dos Modais
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    type: "",
    weight: "0",
    quantity: "1",
  });
  const [feedback, setFeedback] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });

  if (!char) return <Text style={{ color: "white" }}>Carregando...</Text>;

  // --- CÁLCULOS DE CARGA ---
  const totalWeight = DND35Engine.getTotalWeight(char);
  const caps = DND35Engine.getCarryingCapacity(char);
  const encumbrance = DND35Engine.getEncumbrance(char);

  const weightColor =
    encumbrance === "Pesada"
      ? "#ff5252"
      : encumbrance === "Média"
        ? "#ff9800"
        : "#4caf50";

  // --- FUNÇÕES DE GERENCIAMENTO DE ITENS ---
  const addItem = () => {
    if (!itemForm.name.trim()) {
      setFeedback({
        visible: true,
        title: "Campo Vazio",
        message: "Digite o nome do item",
        type: "error",
      });
      return;
    }

    const newItem = {
      id: uuid.v4(),
      name: itemForm.name,
      type: itemForm.type || "Item",
      weight: parseFloat(itemForm.weight) || 0,
      quantity: parseInt(itemForm.quantity) || 1,
    };

    const updatedInventory = [...(char.inventory || []), newItem];
    updateActiveCharacter({ inventory: updatedInventory });

    // Feedback de sucesso
    setFeedback({
      visible: true,
      title: "Item Adicionado",
      message: `${itemForm.name} foi adicionado à mochila`,
      type: "success",
    });

    // Reseta o formulário
    setItemForm({ name: "", type: "", weight: "0", quantity: "1" });
    setAddItemModalVisible(false);
  };

  const removeItem = (itemId) => {
    const item = char.inventory?.find((i) => i.id === itemId);
    const updatedInventory = (char.inventory || []).filter(
      (item) => item.id !== itemId,
    );
    updateActiveCharacter({ inventory: updatedInventory });

    setFeedback({
      visible: true,
      title: "Item Removido",
      message: `${item?.name} foi removido da mochila`,
      type: "info",
    });
  };

  const equipItem = (item, slot) => {
    let updates = {};
    const slotNames = {
      main: "Mão Principal",
      off: "Mão Secundária",
      armor: "Armadura",
    };

    if (slot === "main") {
      updates.mainHand = item;
      const updatedInventory = (char.inventory || []).filter(
        (inv) => inv.id !== item.id,
      );
      updates.inventory = updatedInventory;
    } else if (slot === "off") {
      updates.offHand = item;
      const updatedInventory = (char.inventory || []).filter(
        (inv) => inv.id !== item.id,
      );
      updates.inventory = updatedInventory;
    } else if (slot === "armor") {
      updates.selectedArmor = item;
      const updatedInventory = (char.inventory || []).filter(
        (inv) => inv.id !== item.id,
      );
      updates.inventory = updatedInventory;
    }

    updateActiveCharacter(updates);

    setFeedback({
      visible: true,
      title: "Item Equipado",
      message: `${item.name} equipado em ${slotNames[slot]}`,
      type: "success",
    });
  };

  const unequipItem = (slot) => {
    let updates = {};
    let itemToReturn = null;
    const slotNames = {
      main: "Mão Principal",
      off: "Mão Secundária",
      armor: "Armadura",
    };

    if (slot === "main" && char.mainHand) {
      itemToReturn = char.mainHand;
      updates.mainHand = null;
    } else if (slot === "off" && char.offHand) {
      itemToReturn = char.offHand;
      updates.offHand = null;
    } else if (slot === "armor" && char.selectedArmor) {
      itemToReturn = char.selectedArmor;
      updates.selectedArmor = null;
    }

    if (itemToReturn) {
      const updatedInventory = [...(char.inventory || []), itemToReturn];
      updates.inventory = updatedInventory;
      updateActiveCharacter(updates);

      setFeedback({
        visible: true,
        title: "Item Desequipado",
        message: `${itemToReturn.name} foi movido para a mochila`,
        type: "info",
      });
    }
  };

  // Componente visual para mostrar o que está nas mãos
  const EquippedSlot = ({ label, item, icon, slot }) => (
    <View style={styles.slotBox}>
      <Text style={styles.slotLabel}>{label}</Text>
      <Text style={styles.slotIcon}>{icon}</Text>
      <Text style={styles.slotItemName}>{item ? item.name : "Vazio"}</Text>
      {item && (
        <TouchableOpacity
          style={styles.slotUnequipBtn}
          onPress={() => unequipItem(slot)}
        >
          <Text style={styles.slotUnequipText}>Desequipar</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          <EquippedSlot
            label="MÃO PRINCIPAL"
            icon="⚔️"
            item={char.mainHand}
            slot="main"
          />
          <EquippedSlot
            label="MÃO SECUNDÁRIA"
            icon="🛡️"
            item={char.offHand}
            slot="off"
          />
          <EquippedSlot
            label="ARMADURA"
            icon="👕"
            item={char.selectedArmor}
            slot="armor"
          />
        </View>

        {/* LISTA DA MOCHILA */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Mochila</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddItemModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Adicionar</Text>
          </TouchableOpacity>
        </View>

        {char.inventory && char.inventory.length > 0 ? (
          char.inventory.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>
                  {item.type} • {item.weight}kg{" "}
                  {item.quantity > 1 ? `(x${item.quantity})` : ""}
                </Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.equipBtn}
                  onPress={() => equipItem(item, "main")}
                >
                  <Text style={styles.equipBtnText}>⚔️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.equipBtn, { backgroundColor: "#c62828" }]}
                  onPress={() => removeItem(item.id)}
                >
                  <Text style={styles.equipBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Sua mochila está vazia.</Text>
          </View>
        )}
      </ScrollView>

      {/* MODAL DE ADICIONAR ITEM */}
      <Modal
        visible={addItemModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddItemModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Item</Text>

            <Text style={styles.label}>Nome do Item *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Poção de Cura"
              placeholderTextColor="#666"
              value={itemForm.name}
              onChangeText={(text) => setItemForm({ ...itemForm, name: text })}
            />

            <Text style={styles.label}>Tipo de Item</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Consumível, Ouro, Misc"
              placeholderTextColor="#666"
              value={itemForm.type}
              onChangeText={(text) => setItemForm({ ...itemForm, type: text })}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Peso (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                  value={itemForm.weight}
                  onChangeText={(text) =>
                    setItemForm({ ...itemForm, weight: text })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Quantidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={itemForm.quantity}
                  onChangeText={(text) =>
                    setItemForm({ ...itemForm, quantity: text })
                  }
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddItemModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={addItem}>
                <Text style={styles.btnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    marginBottom: 8,
  },
  slotUnequipBtn: {
    backgroundColor: "#c62828",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  slotUnequipText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
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
    borderWidth: 1,
    borderColor: "#333",
  },
  itemName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  itemDesc: { color: "#888", fontSize: 12 },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  equipBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    width: 40,
    alignItems: "center",
  },
  equipBtnText: { color: "#4caf50", fontWeight: "bold", fontSize: 14 },
  emptyBox: {
    padding: 30,
    alignItems: "center",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
  },
  emptyText: { color: "#666" },

  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: "#444",
  },
  modalTitle: {
    color: "#ff5252",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#121212",
    color: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 15,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: "row",
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#333",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#b71c1c",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
