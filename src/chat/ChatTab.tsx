import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import {
  deleteConversation,
  fetchConversations,
  leaveConversation
} from './api';
import { ConversationAvatar } from './ConversationAvatar';
import { getConversationDisplayName } from './groupData';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ChatTab() {
  const navigation = useNavigation<Navigation>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatTimeLabel = (updatedAt?: string) => {
    if (!updatedAt) return '';
    const d = new Date(updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'teraz';
    if (diffMins < 60) return `pred ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `pred ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'včera';
    if (diffDays < 7) return `pred ${diffDays} d`;
    return d.toLocaleDateString('sk-SK');
  };

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const conv = await fetchConversations();
      setConversations(conv);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload(true);
    }, [reload])
  );

  const openConversation = (conversation: any) => {
    navigation.navigate('ChatConversation', { conversationId: Number(conversation.id), conversation });
  };

  const handleLongPressConversation = (item: any) => {
    if (item?.isGroup) {
      Alert.alert('Opustiť skupinu?', 'Naozaj chceš opustiť túto skupinovú konverzáciu?', [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Opustiť',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveConversation(Number(item.id));
              setConversations((prev) => prev.filter((c) => Number(c.id) !== Number(item.id)));
            } catch (error: any) {
              Alert.alert('Chyba', error?.message || 'Skupinu sa nepodarilo opustiť.');
            }
          }
        }
      ]);
      return;
    }

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

  const onRefresh = () => {
    setRefreshing(true);
    void reload();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ChatNewConversation')} style={styles.iconButton} accessibilityLabel="Nová konverzácia">
          <Ionicons name="add" size={28} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Priame aj skupinové konverzácie</Text>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Žiadne konverzácie. Klepni na + a vyber kontakt alebo vytvor skupinu.</Text>}
          renderItem={({ item }) => {
            const hasUnread = item.hasUnread === true;
            return (
              <Pressable
                style={styles.row}
                onPress={() => openConversation(item)}
                onLongPress={() => handleLongPressConversation(item)}
                delayLongPress={260}
              >
                <ConversationAvatar conversation={item} size={48} />
                <View style={styles.rowContent}>
                  <Text style={[styles.itemTitle, hasUnread && styles.itemTitleUnread]} numberOfLines={1}>
                    {getConversationDisplayName(item)}
                  </Text>
                  <Text style={[styles.itemSubtitle, hasUnread && styles.itemSubtitleUnread]} numberOfLines={2}>
                    {item.lastMessage || 'Žiadna správa'}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  {hasUnread ? <View style={styles.unreadDot} /> : null}
                  <Text style={[styles.timeLabel, hasUnread && styles.timeLabelUnread]}>{formatTimeLabel(item.updatedAt || item.lastAt)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 4, marginBottom: 10 },
  iconButton: { padding: 4 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 80, paddingTop: 8, flexGrow: 1 },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 14
  },
  rowContent: { marginLeft: 12, flex: 1, minWidth: 0 },
  rowMeta: { marginLeft: 8, alignItems: 'flex-end', justifyContent: 'center', alignSelf: 'stretch', paddingTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0ea5e9', marginBottom: 4 },
  itemTitle: { color: colors.textPrimary, fontWeight: '700', marginBottom: 4 },
  itemTitleUnread: { fontWeight: '800' },
  itemSubtitle: { color: colors.textSecondary, marginTop: 2 },
  itemSubtitleUnread: { color: colors.textPrimary, fontWeight: '700' },
  timeLabel: { fontSize: 12, color: colors.textSecondary },
  timeLabelUnread: { color: colors.textPrimary, fontWeight: '700' },
  emptyText: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 32, fontSize: 16 }
});
