import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useCharacterStore } from "../stores/charStore";
import { DND35Engine } from "../engines/d&d35";
import FeedbackModal from "../components/FeedbackModal";

export default function Home() {
  const router = useRouter();

  // Pegamos a lista de personagens e as funções do store
  const characters = useCharacterStore((state) => state.characters);
  const deleteCharacter = useCharacterStore((state) => state.deleteCharacter);
  const togglePinCharacter = useCharacterStore(
    (state) => state.togglePinCharacter,
  );

  // Estados do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChar, setSelectedChar] = useState(null);

  // Novos Estados para Pesquisa e Filtro
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("Todos");

  // Descobre dinamicamente quais sistemas existem nas fichas criadas
  const availableSystems = [
    "Todos",
    ...new Set(characters.map((c) => c.system).filter(Boolean)),
  ];

  // Filtramos e ordenamos a lista antes de renderizar
  const filteredAndSortedCharacters = characters
    .filter((char) => {
      // 1. Filtro de texto (busca pelo nome)
      const matchesSearch = char.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      // 2. Filtro de sistema
      const matchesSystem =
        selectedSystem === "Todos" || char.system === selectedSystem;
      return matchesSearch && matchesSystem;
    })
    .sort((a, b) => {
      // 3. Ordenação (Fixados no topo)
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1;
    });

  // Função para abrir o modal ao segurar o card
  const handleLongPress = (char) => {
    setSelectedChar(char);
    setModalVisible(true);
  };

  const handleTogglePin = () => {
    if (selectedChar) {
      togglePinCharacter(selectedChar.id);
      setModalVisible(false);
    }
  };

  const handleDelete = () => {
    if (selectedChar) {
      deleteCharacter(selectedChar.id);
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Meus Personagens</Text>

      {/* BARRA DE PESQUISA */}
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar personagem..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* ABAS DE FILTRO POR SISTEMA */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableSystems.map((system) => (
            <TouchableOpacity
              key={system}
              style={[
                styles.filterTab,
                selectedSystem === system && styles.filterTabActive,
              ]}
              onPress={() => setSelectedSystem(system)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedSystem === system && styles.filterTabTextActive,
                ]}
              >
                {system}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTA DE PERSONAGENS */}
      <FlatList
        data={filteredAndSortedCharacters}
        keyExtractor={(item) => item.id}
        // Mostra uma mensagem se a busca não encontrar nada
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum personagem encontrado.</Text>
        }
        renderItem={({ item }) => {
          // Extraindo dados para a UI
          const className =
            item.classes?.[0]?.slug?.toUpperCase() || "AVENTUREIRO";
          const level = item.classes?.[0]?.level || item.level || 1;

          // Usando o seu motor para o Resumo Rápido!
          const maxHp = DND35Engine.getMaxHP(item);
          const ac = DND35Engine.getAC(item);

          return (
            <TouchableOpacity
              style={[styles.card, item.isPinned && styles.cardPinned]}
              onPress={() => router.push(`/character/${item.id}`)}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={300}
            >
              <View style={styles.avatarPlaceholder}>
                <Text style={{ color: "#fff", fontSize: 20 }}>👤</Text>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  {item.isPinned && <Text style={styles.pinIcon}>📌 </Text>}
                  <Text style={styles.charName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                {/* AQUI ESTÁ A MUDANÇA: Classe antes do Nível */}
                <Text style={styles.charSub}>
                  {item.system} • {className} Nível {level}
                </Text>

                {/* RESUMO RÁPIDO: Pontos de Vida e CA */}
                <View style={styles.quickStatsRow}>
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>❤️ {maxHp} PV</Text>
                  </View>
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>🛡️ CA {ac}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => router.push(`/character/newChar`)}
      >
        <Text style={styles.fabText}>+ Nova Ficha</Text>
      </TouchableOpacity>

      {/* MODAL DE OPÇÕES DA FICHA (Mantido igual) */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedChar && (
              <>
                <Text style={styles.modalTitle}>Opções da Ficha</Text>
                <Text style={styles.modalSub}>{selectedChar.name}</Text>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleTogglePin}
                >
                  <Text style={styles.actionBtnText}>
                    {selectedChar.isPinned
                      ? "❌ Desafixar do Topo"
                      : "📌 Fixar no Topo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteBtnText}>🗑️ Deletar Ficha</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 15 },

  // Estilos da Pesquisa
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

  // Estilos das Abas de Filtro
  filterContainer: { marginBottom: 15 },
  filterTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 10,
  },
  filterTabActive: {
    backgroundColor: "#b71c1c",
    borderColor: "#ff5252",
  },
  filterTabText: { color: "#888", fontWeight: "bold", fontSize: 12 },
  filterTabTextActive: { color: "#fff" },

  // Estilos do Card
  emptyText: { color: "#888", textAlign: "center", marginTop: 20 },
  card: {
    flexDirection: "row",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  cardPinned: { borderColor: "#b71c1c" },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  pinIcon: { fontSize: 14 },
  charName: { fontSize: 18, color: "#ff5252", fontWeight: "bold" },
  charSub: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
    marginBottom: 8,
  },

  // Estilos dos Status Rápidos
  quickStatsRow: { flexDirection: "row", gap: 10 },
  statBadge: {
    backgroundColor: "#121212",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  statBadgeText: { color: "#ddd", fontSize: 11, fontWeight: "bold" },

  // Botão Flutuante (FAB)
  fabBtn: {
    backgroundColor: "#b71c1c",
    position: "absolute",
    bottom: 30,
    right: 30,
    padding: 15,
    borderRadius: 30,
    elevation: 5,
  },
  fabText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Estilos do Modal
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
  modalTitle: {
    color: "#ff5252",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalSub: {
    color: "#aaa",
    fontSize: 16,
    marginTop: 5,
    marginBottom: 25,
    textAlign: "center",
  },
  actionBtn: {
    backgroundColor: "#333",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#555",
  },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  deleteBtn: { backgroundColor: "#b71c1c", borderColor: "#ff5252" },
  deleteBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  closeBtn: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  closeBtnText: { color: "#888", fontSize: 16, fontWeight: "bold" },
});
