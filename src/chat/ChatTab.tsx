import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import {
  createGroupConversation,
  createOrGetConversation,
  deleteConversation,
  fetchConversations,
  fetchPatients
} from './api';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ChatTab() {
  const navigation = useNavigation<Navigation>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const reload = useCallback(async () => {
    const [conv, users] = await Promise.all([fetchConversations(), fetchPatients()]);
    setConversations(conv);
    setPatients(users);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const openConversation = (conversation: any) => {
    navigation.navigate('ChatConversation', { conversationId: Number(conversation.id), conversation });
  };

  const handleLongPressConversation = (item: any) => {
    if (item?.isGroup) return;
    Alert.alert('Vymazať konverzáciu?', 'Naozaj vymazať túto konverzáciu?', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Vymazať',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversation(Number(item.id));
            setConversations((prev) => prev.filter((c) => Number(c.id) !== Number(item.id)));
          } catch (error: any) {
            Alert.alert('Chyba', error?.message || 'Konverzáciu sa nepodarilo vymazať.');
          }
        }
      }
    ]);
  };

  const handleCreateDirect = async (userId: number) => {
    const conversation = await createOrGetConversation(userId);
    setPickerVisible(false);
    openConversation(conversation);
  };

  const handleCreateGroup = async () => {
    const memberIds = patients.slice(0, 2).map((p) => Number(p.id));
    if (!memberIds.length) return;
    const conversation = await createGroupConversation({
      title: 'Nova skupina',
      color: 'emerald',
      memberIds
    });
    setPickerVisible(false);
    openConversation(conversation);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity onPress={() => setPickerVisible(true)} style={styles.iconButton} accessibilityLabel="Nová konverzácia">
          <Ionicons name="add" size={28} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Priame aj skupinové konverzácie</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => openConversation(item)} onLongPress={() => handleLongPressConversation(item)}>
            <Text style={styles.itemTitle}>{item.displayName || item.title || 'Chat'}</Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.lastMessage || 'Bez sprav'}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)} />
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.modalAction} onPress={() => void handleCreateGroup()}>
            <Text style={styles.modalActionText}>Vytvorit skupinu</Text>
          </TouchableOpacity>
          <Text style={styles.modalHeading}>Direct chat</Text>
          {patients.slice(0, 20).map((patient) => (
            <TouchableOpacity
              key={String(patient.id)}
              style={styles.modalAction}
              onPress={() => void handleCreateDirect(Number(patient.id))}
            >
              <Text style={styles.modalActionText}>{patient.displayName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 4, marginBottom: 10 },
  iconButton: { padding: 4 },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 80, paddingTop: 6 },
  item: { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 },
  itemTitle: { color: colors.textPrimary, fontWeight: '700', marginBottom: 4 },
  itemSubtitle: { color: colors.textSecondary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: { maxHeight: '70%', backgroundColor: colors.backgroundSecondary, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalHeading: { color: colors.textSecondary, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  modalAction: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalActionText: { color: colors.textPrimary }
});
