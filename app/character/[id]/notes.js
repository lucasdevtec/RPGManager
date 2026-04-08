import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCharacterStore } from "../../../stores/charStore";
import FeedbackModal from "../../../components/FeedbackModal";

export default function NotesScreen() {
  const { id } = useLocalSearchParams();
  const characters = useCharacterStore((state) => state.characters);
  const updateActiveCharacter = useCharacterStore(
    (state) => state.updateActiveCharacter,
  );
  const setActiveCharacter = useCharacterStore(
    (state) => state.setActiveCharacter,
  );

  useEffect(() => {
    if (id) {
      setActiveCharacter(id);
    }
  }, [id]);

  const char = characters.find((c) => c.id === id);

  const notesList = Array.isArray(char?.notes) ? char.notes : [];

  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState({
    id: null,
    title: "",
    content: "",
  });

  if (!char)
    return <Text style={{ color: "white", padding: 20 }}>Carregando...</Text>;

  const openNewNote = () => {
    setCurrentNote({ id: null, title: "", content: "" });
    setIsEditing(true);
  };

  const openEditNote = (note) => {
    setCurrentNote(note);
    setIsEditing(true);
  };

  const saveNote = () => {
    // Tratamento de segurança para evitar erro se estiver vazio
    const safeTitle = currentNote.title || "";
    const safeContent = currentNote.content || "";

    if (!safeTitle.trim() && !safeContent.trim()) {
      setIsEditing(false);
      return;
    }

    let updatedNotes = [...notesList];
    const today = new Date().toLocaleDateString("pt-BR");

    if (currentNote.id) {
      updatedNotes = updatedNotes.map((n) =>
        n.id === currentNote.id
          ? { ...n, title: safeTitle, content: safeContent }
          : n,
      );
    } else {
      const newNote = {
        id: Date.now().toString(),
        title: safeTitle || "Sem Título",
        content: safeContent,
        date: today,
      };
      updatedNotes = [newNote, ...updatedNotes];
    }

    updateActiveCharacter({ notes: updatedNotes });
    setIsEditing(false);
  };

  const deleteNote = (noteId) => {
    Alert.alert(
      "Apagar Anotação",
      "Tem certeza que deseja destruir este pergaminho?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => {
            const updatedNotes = notesList.filter((n) => n.id !== noteId);
            updateActiveCharacter({ notes: updatedNotes });
          },
        },
      ],
    );
  };

  if (isEditing) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveNote} style={styles.saveBtn}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Título da Anotação..."
            placeholderTextColor="#666"
            value={currentNote.title}
            onChangeText={(text) =>
              setCurrentNote((prev) => ({ ...prev, title: text }))
            }
          />

          <View style={styles.paperContainer}>
            <TextInput
              style={styles.textArea}
              multiline={true}
              placeholder="O que aconteceu nesta sessão?"
              placeholderTextColor="#666"
              value={currentNote.content}
              onChangeText={(text) =>
                setCurrentNote((prev) => ({ ...prev, content: text }))
              }
              textAlignVertical="top"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Diário de Campanha</Text>
          <Text style={styles.subtitle}>{char.name}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openNewNote}>
          <Text style={styles.addBtnText}>+ Escrever</Text>
        </TouchableOpacity>
      </View>

      {notesList.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhuma anotação feita ainda.</Text>
          <Text style={styles.emptySub}>
            Clique em "+ Escrever" para começar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notesList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.noteCard}
              onPress={() => openEditNote(item)}
              onLongPress={() => deleteNote(item.id)}
            >
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.noteDate}>{item.date}</Text>
              </View>
              <Text style={styles.notePreview} numberOfLines={2}>
                {item.content}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.hintText}>
        Dica: Segure o dedo sobre uma anotação para apagá-la.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#ff5252" },
  subtitle: { fontSize: 14, color: "#888" },
  addBtn: {
    backgroundColor: "#b71c1c",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "bold" },
  noteCard: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  noteTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  noteDate: { color: "#ff5252", fontSize: 12, fontWeight: "bold" },
  notePreview: { color: "#aaa", fontSize: 14, lineHeight: 20 },
  hintText: { color: "#444", textAlign: "center", fontSize: 12, marginTop: 10 },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 10,
  },
  cancelText: { color: "#ff5252", fontSize: 16, padding: 5 },
  saveBtn: {
    backgroundColor: "#4caf50",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  titleInput: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderColor: "#333",
    paddingVertical: 10,
    marginBottom: 20,
  },
  paperContainer: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  textArea: { flex: 1, color: "#ddd", fontSize: 16, lineHeight: 24 },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 18, marginBottom: 5 },
  emptySub: { color: "#555", fontSize: 14 },
});
