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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCharacterStore } from "../../../stores/charStore";
import FEATS_DATA from "../../../data/D&D3.5/talentos.json";
import FeedbackModal from "../../../components/FeedbackModal";

export default function FeatsScreen() {
  const { id } = useLocalSearchParams();

  const characters = useCharacterStore((state) => state.characters);
  const updateActiveCharacter = useCharacterStore(
    (state) => state.updateActiveCharacter,
  );
  const setActiveCharacter = useCharacterStore(
    (state) => state.setActiveCharacter,
  );

  const [activeTab, setActiveTab] = useState("mine");
  const [search, setSearch] = useState("");
  const [selectedFeat, setSelectedFeat] = useState(null);

  useEffect(() => {
    if (id) setActiveCharacter(id);
  }, [id]);

  const char = characters.find((c) => c.id === id);
  if (!char)
    return <Text style={{ color: "white", padding: 20 }}>Carregando...</Text>;

  const charFeats = char.feats || [];

  const toggleFeat = (feat) => {
    const hasFeat = charFeats.some((f) => f.slug === feat.slug);

    let updatedFeats;
    if (hasFeat) {
      updatedFeats = charFeats.filter((f) => f.slug !== feat.slug);
    } else {
      updatedFeats = [...charFeats, feat];
    }

    updateActiveCharacter({ feats: updatedFeats });
    setSelectedFeat(null);
  };

  const listToRender = activeTab === "mine" ? charFeats : FEATS_DATA;
  const filteredList = listToRender.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const renderFeat = ({ item: feat }) => {
    const hasFeat = charFeats.some((f) => f.slug === feat.slug);

    return (
      <TouchableOpacity
        style={styles.featCard}
        onPress={() => setSelectedFeat(feat)}
      >
        <View style={styles.featHeader}>
          <Text style={styles.featName}>{feat.name}</Text>
          {activeTab === "all" && hasFeat && (
            <Text style={styles.ownedBadge}>Adquirido</Text>
          )}
        </View>
        <Text style={styles.featType}>{feat.type}</Text>
        <Text style={styles.featPreview} numberOfLines={2}>
          {feat.description}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Talentos</Text>
        <Text style={styles.subtitle}>{char.name}</Text>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "mine" && styles.tabBtnActive]}
          onPress={() => setActiveTab("mine")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "mine" && styles.tabTextActive,
            ]}
          >
            Meus Talentos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "all" && styles.tabBtnActive]}
          onPress={() => setActiveTab("all")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "all" && styles.tabTextActive,
            ]}
          >
            Todos os Talentos
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder={
          activeTab === "mine"
            ? "Buscar nos meus talentos..."
            : "Buscar em todos os talentos..."
        }
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
      />

      {filteredList.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {activeTab === "mine"
              ? "Você ainda não aprendeu nenhum talento."
              : "Nenhum talento encontrado."}
          </Text>
          {activeTab === "mine" && (
            <TouchableOpacity
              style={styles.buyBtnEmpty}
              onPress={() => setActiveTab("all")}
            >
              <Text style={styles.buyBtnEmptyText}>
                Ir para Lista de Talentos
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.slug}
          renderItem={renderFeat}
          contentContainerStyle={{ paddingBottom: 20 }}
          initialNumToRender={10}
        />
      )}

      {/* MODAL DO TALENTO */}
      <Modal
        visible={!!selectedFeat}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedFeat(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          {selectedFeat &&
            (() => {
              const hasFeat = charFeats.some(
                (f) => f.slug === selectedFeat.slug,
              );
              const reqs =
                selectedFeat.prerequisites?.length > 0
                  ? selectedFeat.prerequisites.join(", ")
                  : "Nenhum";

              return (
                <View style={styles.modalContent}>
                  <View style={styles.modalScroll}>
                    <Text style={styles.modalTitle}>{selectedFeat.name}</Text>
                    <Text style={styles.modalType}>[{selectedFeat.type}]</Text>

                    {selectedFeat.special && (
                      <Text style={styles.specialText}>
                        ✨ {selectedFeat.special}
                      </Text>
                    )}

                    <Text style={styles.sectionTitle}>Pré-requisitos:</Text>
                    <Text style={styles.modalText}>{reqs}</Text>

                    <Text style={styles.sectionTitle}>Descrição:</Text>
                    <Text style={styles.modalText}>
                      {selectedFeat.description}
                    </Text>

                    <Text style={styles.sectionTitle}>Benefício:</Text>
                    <Text style={styles.modalText}>{selectedFeat.benefit}</Text>

                    {selectedFeat.mechanic && (
                      <View style={styles.mechanicBox}>
                        <Text style={styles.mechanicText}>
                          ⚙️ Automatizado:{" "}
                          {selectedFeat.mechanic.stat ||
                            selectedFeat.mechanic.target ||
                            selectedFeat.mechanic.context ||
                            selectedFeat.mechanic.mode}{" "}
                          {selectedFeat.mechanic.value
                            ? `+${selectedFeat.mechanic.value}`
                            : ""}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={() => setSelectedFeat(null)}
                    >
                      <Text style={styles.closeBtnText}>Voltar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        hasFeat ? styles.btnRemove : styles.btnAdd,
                      ]}
                      onPress={() => toggleFeat(selectedFeat)}
                    >
                      <Text style={styles.actionBtnText}>
                        {hasFeat ? "Esquecer Talento" : "Aprender Talento"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  header: { marginBottom: 15 },
  title: { fontSize: 24, fontWeight: "bold", color: "#ff5252" },
  subtitle: { fontSize: 14, color: "#888" },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  tabBtnActive: { backgroundColor: "#333" },
  tabText: { color: "#888", fontWeight: "bold", fontSize: 14 },
  tabTextActive: { color: "#fff" },
  searchInput: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 15,
  },
  featCard: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  featHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  featName: { color: "#fff", fontSize: 18, fontWeight: "bold", flex: 1 },
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
  featPreview: { color: "#aaa", fontSize: 14, lineHeight: 20 },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  buyBtnEmpty: {
    backgroundColor: "#b71c1c",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buyBtnEmptyText: { color: "#fff", fontWeight: "bold" },
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
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#444",
  },
  modalScroll: { marginBottom: 20 },
  modalTitle: { color: "#ff5252", fontSize: 26, fontWeight: "bold" },
  modalType: {
    color: "#aaa",
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 10,
  },
  specialText: {
    color: "#ff9800",
    fontSize: 13,
    marginBottom: 10,
    fontStyle: "italic",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },
  modalText: { color: "#ccc", fontSize: 15, lineHeight: 22 },
  mechanicBox: {
    backgroundColor: "#002200",
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#005500",
  },
  mechanicText: { color: "#4caf50", fontSize: 12, fontWeight: "bold" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  closeBtn: {
    flex: 1,
    backgroundColor: "#333",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  actionBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnAdd: { backgroundColor: "#2e7d32" },
  btnRemove: { backgroundColor: "#c62828" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
