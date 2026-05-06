import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { createGroupConversation, createOrGetConversation, fetchConversations, fetchPatients } from './api';
import { ConversationAvatar } from './ConversationAvatar';
import { CHAT_GROUP_COLOR_OPTIONS, getConversationDisplayName } from './groupData';
import { RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ChatNewConversationModal() {
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<'root' | 'group'>('root');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [patients, setPatients] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedColorId, setSelectedColorId] = useState(CHAT_GROUP_COLOR_OPTIONS[0]?.id || 'emerald');
  const [groupTitle, setGroupTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [patientsList, conversationsList] = await Promise.all([fetchPatients(), fetchConversations()]);
      setPatients(patientsList);
      setConversations(conversationsList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPatients = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((p) => String(p.displayName || '').toLowerCase().includes(query));
  }, [patients, memberSearch]);

  const selectedMembers = useMemo(
    () => patients.filter((patient) => selectedMemberIds.includes(Number(patient.id))),
    [patients, selectedMemberIds]
  );

  const previewConversation = useMemo(
    () => ({ type: 'group', isGroup: true, title: groupTitle.trim() || 'Nová skupina', color: selectedColorId }),
    [groupTitle, selectedColorId]
  );

  const resetGroupFlow = () => {
    setMode('root');
    setStep(1);
    setSelectedMemberIds([]);
    setMemberSearch('');
    setSelectedColorId(CHAT_GROUP_COLOR_OPTIONS[0]?.id || 'emerald');
    setGroupTitle('');
  };

  const onSelect = useCallback(
    async (patient: any) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const existing = conversations.find((c) => Number(c.otherUser?.id) === Number(patient.id));
        const conv = existing || (await createOrGetConversation(Number(patient.id)));
        navigation.replace('ChatConversation', { conversationId: Number(conv.id), conversation: conv });
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, conversations, navigation]
  );

  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onCreateGroup = useCallback(async () => {
    const title = groupTitle.trim();
    if (submitting || !title || !selectedMemberIds.length) return;
    setSubmitting(true);
    try {
      const conversation = await createGroupConversation({
        title,
        color: selectedColorId,
        memberIds: selectedMemberIds
      });
      navigation.replace('ChatConversation', { conversationId: Number(conversation.id), conversation });
    } finally {
      setSubmitting(false);
    }
  }, [groupTitle, selectedColorId, selectedMemberIds, submitting, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (mode === 'root' ? navigation.goBack() : step === 1 ? resetGroupFlow() : setStep((prev) => (prev - 1) as 1 | 2 | 3))}>
          <Text style={styles.headerAction}>{mode === 'root' ? 'Zavrieť' : step === 1 ? 'Zrušiť' : 'Späť'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'root' ? 'Nová konverzácia' : step === 1 ? 'Nová skupina' : step === 2 ? 'Farba skupiny' : 'Názov skupiny'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (mode === 'group' && step === 1 && selectedMemberIds.length) setStep(2);
            else if (mode === 'group' && step === 2) setStep(3);
            else if (mode === 'group' && step === 3) void onCreateGroup();
          }}
          disabled={mode === 'root' || submitting || (step === 1 ? !selectedMemberIds.length : step === 3 ? !groupTitle.trim() : false)}
        >
          <Text style={[styles.headerAction, (mode === 'root' || (step === 1 && !selectedMemberIds.length) || (step === 3 && !groupTitle.trim())) && styles.headerActionDisabled]}>
            {mode === 'group' ? (step === 3 ? (submitting ? 'Ukladám' : 'Vytvoriť') : 'Ďalej') : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'root' ? (
        <>
          <View style={styles.searchWrap}>
            <TextInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Hľadať…"
              placeholderTextColor={colors.textSecondary}
              style={styles.searchInput}
            />
            <Pressable style={styles.newGroupRow} onPress={() => { setMode('group'); setStep(1); }}>
              <Text style={styles.newGroupText}>Nová skupina</Text>
            </Pressable>
          </View>
          <FlatList
            data={filteredPatients}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => void onSelect(item)} disabled={submitting}>
                <ConversationAvatar conversation={{ otherUser: item }} />
                <Text style={styles.rowTitle}>{item.displayName || 'Používateľ'}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <View style={styles.groupWrap}>
          {step === 1 ? (
            <>
              <Text style={styles.stepTitle}>Vyber členov skupiny</Text>
              <TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Hľadať…" placeholderTextColor={colors.textSecondary} style={styles.searchInput} />
              <FlatList
                data={filteredPatients}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => {
                  const selected = selectedMemberIds.includes(Number(item.id));
                  return (
                    <Pressable style={[styles.memberRow, selected && styles.memberRowSelected]} onPress={() => toggleMember(Number(item.id))}>
                      <ConversationAvatar conversation={{ otherUser: item }} />
                      <Text style={styles.rowTitle}>{item.displayName}</Text>
                      <Text style={styles.checkbox}>{selected ? '✓' : ''}</Text>
                    </Pressable>
                  );
                }}
              />
            </>
          ) : step === 2 ? (
            <View style={styles.colorGrid}>
              {CHAT_GROUP_COLOR_OPTIONS.map((option) => {
                const isActive = selectedColorId === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.colorSwatchWrap, isActive && styles.colorSwatchWrapActive]}
                    onPress={() => setSelectedColorId(option.id)}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: option.colors[0] }]} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <>
              <View style={[styles.previewCard, { backgroundColor: CHAT_GROUP_COLOR_OPTIONS.find((c) => c.id === selectedColorId)?.colors[0] || '#10b981' }]}>
                <ConversationAvatar conversation={previewConversation} size={56} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.previewTitle}>{getConversationDisplayName(previewConversation)}</Text>
                  <Text style={styles.previewSub}>{selectedMembers.length + 1} členov</Text>
                </View>
              </View>
              <TextInput value={groupTitle} onChangeText={(text) => setGroupTitle(text.slice(0, 120))} placeholder="Názov skupiny" placeholderTextColor={colors.textSecondary} style={styles.titleInput} />
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  headerAction: { color: '#10b981', fontWeight: '700' },
  headerActionDisabled: { opacity: 0.45 },
  searchWrap: { paddingHorizontal: 12, paddingTop: 12 },
  searchInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 10 },
  newGroupRow: { marginTop: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  newGroupText: { color: colors.textPrimary, fontWeight: '700' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rowTitle: { color: colors.textPrimary, fontWeight: '600', flex: 1 },
  groupWrap: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  stepTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 10 },
  memberRow: { marginTop: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center' },
  memberRowSelected: { borderColor: '#10b981' },
  checkbox: { width: 24, textAlign: 'center', color: '#10b981', fontWeight: '900' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 18 },
  colorSwatchWrap: { width: '31%', paddingVertical: 8 },
  colorSwatchWrapActive: { borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  colorSwatch: { height: 5, borderRadius: 999 },
  previewCard: { borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  previewTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  previewSub: { color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  titleInput: { marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 12, fontSize: 18, fontWeight: '700' }
});
