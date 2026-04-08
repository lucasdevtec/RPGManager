import { StyleSheet, Text, View, Modal, TouchableOpacity } from "react-native";

export default function FeedbackModal({
  visible,
  title,
  message,
  type,
  onClose,
}) {
  // Define o ícone e a cor baseada no tipo (success, error, info)
  const isSuccess = type === "success";
  const accentColor = isSuccess ? "#4caf50" : "#ff5252";
  const icon = isSuccess ? "🎉" : "⚠️";

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { borderColor: accentColor }]}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.modalTitle, { color: accentColor }]}>
            {title}
          </Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: "#b71c1c" }]}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    width: "100%",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    borderWidth: 2,
    elevation: 10,
  },
  icon: { fontSize: 50, marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  modalMessage: {
    color: "#bbb",
    textAlign: "center",
    marginTop: 15,
    fontSize: 14,
    lineHeight: 22,
  },
  closeBtn: {
    width: "100%",
    marginTop: 25,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
