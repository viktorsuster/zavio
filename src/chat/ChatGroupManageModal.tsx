import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addConversationMembers,
  leaveConversation,
  removeConversationMember,
  updateConversation,
  updateConversationNotifications
} from './api';
import { colors } from '../constants/colors';
import { ConversationAvatar } from './ConversationAvatar';
import { CHAT_GROUP_COLOR_OPTIONS, getConversationDisplayName, getGroupColorOption } from './groupData';

type Props = {
  visible: boolean;
  conversation: any;
  currentUserId: number;
  patients: any[];
  onClose: () => void;
  onConversationChange?: (next: any) => void;
  onConversationLeft?: () => void;
};

export default function ChatGroupManageModal({
  visible,
  conversation,
  currentUserId,
  patients,
  onClose,
  onConversationChange,
  onConversationLeft
}: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'menu' | 'members' | 'edit'>('menu');
  const [saving, setSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [title, setTitle] = useState(conversation?.title || '');
  const [colorId, setColorId] = useState(conversation?.color || CHAT_GROUP_COLOR_OPTIONS[0]?.id || 'emerald');
  const [notificationsEnabled, setNotificationsEnabled] = useState(conversation?.notificationsEnabled !== false);

  const members = conversation?.members || [];
  const availablePatients = useMemo(
    () => patients.filter((patient) => !members.some((member: any) => Number(member.id) === Number(patient.id))),
    [members, patients]
  );
  const filteredAvailablePatients = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return availablePatients;
    return availablePatients.filter((p) => String(p.displayName || '').toLowerCase().includes(query));
  }, [availablePatients, memberSearch]);
  const selectedColor = getGroupColorOption(colorId);

  useEffect(() => {
    setTitle(conversation?.title || '');
    setColorId(conversation?.color || CHAT_GROUP_COLOR_OPTIONS[0]?.id || 'emerald');
    setNotificationsEnabled(conversation?.notificationsEnabled !== false);
  }, [conversation]);

  const resetAndClose = () => {
    setStep('menu');
    setSaving(false);
    setSelectedMemberIds([]);
    setMemberSearch('');
    onClose?.();
  };

  const saveMetadata = async () => {
    if (!conversation?.id || !title.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await updateConversation(Number(conversation.id), { title: title.trim(), color: colorId });
      onConversationChange?.(updated);
      setStep('menu');
    } catch (error: any) {
      Alert.alert('Chyba', error?.message || 'Skupinu sa nepodarilo upraviť.');
    } finally {
      setSaving(false);
    }
  };

  const saveNewMembers = async () => {
    if (!conversation?.id || !selectedMemberIds.length || saving) return;
    setSaving(true);
    try {
      const updated = await addConversationMembers(Number(conversation.id), selectedMemberIds);
      onConversationChange?.(updated);
      setSelectedMemberIds([]);
      setStep('menu');
    } catch (error: any) {
      Alert.alert('Chyba', error?.message || 'Členov sa nepodarilo pridať.');
    } finally {
      setSaving(false);
    }
  };

  const setConversationNotifications = async (enabled: boolean) => {
    if (!conversation?.id || notificationSaving) return;
    const previous = notificationsEnabled;
    setNotificationsEnabled(enabled);
    setNotificationSaving(true);
    try {
      const updated = await updateConversationNotifications(Number(conversation.id), enabled);
      onConversationChange?.(updated);
    } catch (error: any) {
      setNotificationsEnabled(previous);
      Alert.alert('Chyba', error?.message || 'Nastavenie upozornení sa nepodarilo uložiť.');
    } finally {
      setNotificationSaving(false);
    }
  };

  const removeMember = (member: any) => {
    Alert.alert('Odobrať člena?', `Naozaj chceš odobrať ${member.displayName} zo skupiny?`, [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Odobrať',
        style: 'destructive',
        onPress: async () => {
          if (!conversation?.id) return;
          try {
            const updated = await removeConversationMember(Number(conversation.id), Number(member.id));
            onConversationChange?.(updated);
          } catch (error: any) {
            Alert.alert('Chyba', error?.message || 'Člena sa nepodarilo odobrať.');
          }
        }
      }
    ]);
  };

  const leaveGroupHandler = () => {
    Alert.alert('Opustiť skupinu?', 'Po odchode sa skupina prestane zobrazovať v tvojom chate.', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Opustiť',
        style: 'destructive',
        onPress: async () => {
          if (!conversation?.id) return;
          try {
            await leaveConversation(Number(conversation.id));
            onConversationLeft?.();
            resetAndClose();
          } catch (error: any) {
            Alert.alert('Chyba', error?.message || 'Skupinu sa nepodarilo opustiť.');
          }
        }
      }
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => (step === 'menu' ? resetAndClose() : setStep('menu'))}>
            <Text style={styles.headerAction}>{step === 'menu' ? 'Zavrieť' : 'Späť'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {step === 'menu' ? 'Skupina' : step === 'members' ? 'Pridať členov' : 'Upraviť skupinu'}
          </Text>
          <View style={{ width: 48 }} />
        </View>

        {step === 'menu' ? (
          <View style={[styles.content, { paddingBottom: Math.max(14, insets.bottom) }]}>
            {!conversation?.id ? (
              <View style={styles.card}>
                <Text style={styles.itemTitle}>Načítavam nastavenia chatu…</Text>
              </View>
            ) : null}
            <View style={styles.card}>
              <View style={styles.row}>
                <ConversationAvatar conversation={conversation} size={56} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.title}>{getConversationDisplayName(conversation)}</Text>
                  <Text style={styles.subtitle}>{members.length} členov</Text>
                </View>
              </View>
            </View>

            <Pressable style={styles.card} onPress={() => setStep('members')}>
              <Text style={styles.itemTitle}>Pridať členov</Text>
              <Text style={styles.subtitle}>Každý člen skupiny môže pridať ďalších užívateľov.</Text>
            </Pressable>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.itemTitle}>Upozornenia</Text>
                  <Text style={styles.subtitle}>Push notifikácie pre túto skupinu.</Text>
                </View>
                <Switch value={notificationsEnabled} onValueChange={setConversationNotifications} disabled={notificationSaving} />
              </View>
            </View>

            {conversation?.permissions?.canManageGroup ? (
              <Pressable style={styles.card} onPress={() => setStep('edit')}>
                <Text style={styles.itemTitle}>Názov a farba</Text>
                <Text style={styles.subtitle}>Creator môže meniť názov skupiny, farbu a odoberať členov.</Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionLabel}>Členovia ({members.length})</Text>
            <FlatList
              data={members}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <ConversationAvatar conversation={{ otherUser: item }} />
                  <Text style={styles.memberName}>{item.displayName}</Text>
                  {conversation?.permissions?.canManageGroup && Number(item.id) !== Number(currentUserId) ? (
                    <Pressable onPress={() => removeMember(item)}>
                      <Text style={styles.removeText}>Odobrať</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            />
            <Pressable onPress={leaveGroupHandler} style={[styles.leaveButton, { marginBottom: Math.max(12, insets.bottom) }]}>
              <Text style={styles.leaveButtonText}>Opustiť skupinu</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'members' ? (
          <View style={[styles.content, { paddingBottom: Math.max(14, insets.bottom) }]}>
            <Text style={styles.bigTitle}>Vyber užívateľov do skupiny</Text>
            <TextInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Hľadať…"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <FlatList
              data={filteredAvailablePatients}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const selected = selectedMemberIds.includes(Number(item.id));
                return (
                  <Pressable
                    style={[styles.memberRow, selected && styles.memberRowSelected]}
                    onPress={() =>
                      setSelectedMemberIds((prev) =>
                        prev.includes(Number(item.id))
                          ? prev.filter((id) => id !== Number(item.id))
                          : [...prev, Number(item.id)]
                      )
                    }
                  >
                    <ConversationAvatar conversation={{ otherUser: item }} />
                    <Text style={styles.memberName}>{item.displayName}</Text>
                    <Text style={styles.check}>{selected ? '✓' : ''}</Text>
                  </Pressable>
                );
              }}
            />
            <Pressable
              onPress={saveNewMembers}
              disabled={!selectedMemberIds.length || saving}
              style={[styles.primaryButton, (!selectedMemberIds.length || saving) && styles.primaryButtonDisabled]}
            >
              <Text style={styles.primaryButtonText}>{saving ? 'Pridávam...' : 'Pridať vybraných'}</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'edit' ? (
          <View style={[styles.content, { paddingBottom: Math.max(14, insets.bottom) }]}>
            <Text style={styles.bigTitle}>Upraviť skupinu</Text>
            <LinearGradient colors={selectedColor.colors} style={styles.preview}>
              <View style={styles.row}>
                <ConversationAvatar conversation={{ ...conversation, color: colorId, title }} size={56} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.previewTitle}>{title.trim() || 'Skupina'}</Text>
                </View>
              </View>
              <TextInput
                value={title}
                onChangeText={(text) => setTitle(text.slice(0, 120))}
                placeholder="Názov skupiny"
                placeholderTextColor="rgba(255,255,255,0.7)"
                style={styles.previewInput}
              />
            </LinearGradient>

            <View style={styles.colorsGrid}>
              {CHAT_GROUP_COLOR_OPTIONS.map((option) => (
                <Pressable key={option.id} style={styles.colorPress} onPress={() => setColorId(option.id)}>
                  <View style={[styles.colorOuter, colorId === option.id && styles.colorOuterActive]}>
                    <LinearGradient colors={option.colors} style={styles.colorInner} />
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={saveMetadata}
              disabled={!title.trim() || saving}
              style={[styles.primaryButton, (!title.trim() || saving) && styles.primaryButtonDisabled]}
            >
              <Text style={styles.primaryButtonText}>{saving ? 'Ukladám...' : 'Uložiť zmeny'}</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerAction: { color: '#10b981', fontWeight: '700' },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 14 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, marginTop: 4 },
  itemTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  sectionLabel: { color: colors.textSecondary, marginTop: 6, marginBottom: 8, fontWeight: '700' },
  memberRow: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  memberRowSelected: { borderColor: '#10b981' },
  memberName: { color: colors.textPrimary, marginLeft: 10, flex: 1, fontWeight: '600' },
  removeText: { color: '#f43f5e', fontWeight: '700' },
  leaveButton: { marginTop: 8, marginBottom: 12, backgroundColor: '#f43f5e', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  leaveButtonText: { color: '#fff', fontWeight: '800' },
  bigTitle: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  check: { color: '#10b981', fontWeight: '800', width: 20, textAlign: 'center' },
  primaryButton: { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  preview: { borderRadius: 20, padding: 16, marginTop: 4 },
  previewTitle: { color: '#fff', fontWeight: '800', fontSize: 20 },
  previewInput: { marginTop: 14, color: '#fff', fontSize: 28, fontWeight: '800' },
  colorsGrid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  colorPress: { width: '31%', aspectRatio: 1, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  colorOuter: { width: '100%', aspectRatio: 1, borderRadius: 999, borderWidth: 1, borderColor: colors.border, padding: 6 },
  colorOuterActive: { borderWidth: 4, borderColor: '#fff' },
  colorInner: { width: '100%', height: '100%', borderRadius: 999 }
});
