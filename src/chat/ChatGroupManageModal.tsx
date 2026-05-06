import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChatGroupManageModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Správa skupiny</Text>
          <Text style={styles.subtitle}>Pridávanie/odoberanie členov je dostupné v Chat tabu pri skupinách.</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Zavrieť</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: colors.backgroundSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, marginTop: 8 },
  button: { marginTop: 14, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10 },
  buttonText: { color: '#000', fontWeight: '700' }
});
