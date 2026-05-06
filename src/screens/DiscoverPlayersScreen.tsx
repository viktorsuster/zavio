import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import Avatar from '../components/Avatar';
import { apiService } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'DiscoverPlayers'>;
type DirectoryUser = { id: number; name: string; avatar: string | null };
type MatchedItem = { contactName: string; phone: string; user: DirectoryUser };
type UnmatchedItem = { contactName: string; phone: string };

const INVITE_TEXT =
  'Pridaj sa ku mne na Sportvia a rezervuj si hru. Stiahni appku a registruj sa.';

export default function DiscoverPlayersScreen({ navigation }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [matching, setMatching] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [users, setUsers] = React.useState<DirectoryUser[]>([]);
  const [matched, setMatched] = React.useState<MatchedItem[]>([]);
  const [unmatched, setUnmatched] = React.useState<UnmatchedItem[]>([]);
  const [scanInfo, setScanInfo] = React.useState<{ scanned: number; matched: number; unmatched: number } | null>(null);

  const loadDirectory = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getUsersDirectory();
      setUsers(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Directory load error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa načítať zoznam hráčov.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const findInContacts = React.useCallback(async () => {
    setMatching(true);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Kontakty', 'Bez povolenia ku kontaktom nevieme nájsť hráčov.');
        return;
      }

      const result = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName
      });

      const contactsPayload = (result.data || [])
        .flatMap((contact) => {
          const phones = contact.phoneNumbers || [];
          return phones.map((p) => ({
            name: contact.name || 'Kontakt',
            phone: p.number || ''
          }));
        })
        .filter((item) => item.phone.trim().length > 0);

      if (contactsPayload.length === 0) {
        Alert.alert('Kontakty', 'V kontaktoch sme nenašli žiadne telefónne čísla.');
        setScanInfo({ scanned: 0, matched: 0, unmatched: 0 });
        return;
      }

      const response = await apiService.matchContacts(contactsPayload);
      const nextMatched = response?.matched || [];
      const nextUnmatched = response?.unmatched || [];
      setMatched(nextMatched);
      setUnmatched(nextUnmatched);
      setScanInfo({
        scanned: contactsPayload.length,
        matched: nextMatched.length,
        unmatched: nextUnmatched.length
      });
    } catch (error) {
      console.error('Contacts match error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa porovnať kontakty.');
    } finally {
      setMatching(false);
    }
  }, []);

  const onShareInvite = React.useCallback(async (contact?: UnmatchedItem) => {
    const person = contact?.contactName ? `${contact.contactName}, ` : '';
    await Share.share({
      message: `${person}${INVITE_TEXT}`
    });
  }, []);

  const matchedUserIds = React.useMemo(() => new Set(matched.map((m) => m.user.id)), [matched]);
  const mergedUsers = React.useMemo(() => {
    const prioritized = matched.map((m) => m.user);
    const rest = users.filter((u) => !matchedUserIds.has(u.id));
    return [...prioritized, ...rest];
  }, [matched, matchedUserIds, users]);

  const filteredUsers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mergedUsers;
    return mergedUsers.filter((u) => (u.name || '').toLowerCase().includes(q));
  }, [mergedUsers, query]);

  return (
    <View style={styles.container}>
      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.contactsButton}
          onPress={findInContacts}
          disabled={matching}
          activeOpacity={0.85}
        >
          {matching ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Ionicons name="people" size={18} color="#000000" />
          )}
          <Text style={styles.contactsButtonText}>Nájsť v kontaktoch</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          placeholder="Hľadať hráča"
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {scanInfo ? (
        <View style={styles.scanInfoBox}>
          <Text style={styles.scanInfoText}>
            Kontakty: {scanInfo.scanned} · V appke: {scanInfo.matched} · Na pozvanie: {scanInfo.unmatched}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            matched.length > 0 ? (
              <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionHeaderText}>Nájdení v kontaktoch</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('PublicProfile', { userId: String(item.id) })}
              activeOpacity={0.9}
            >
              <Avatar uri={item.avatar} name={item.name} size={44} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.name}>{item.name}</Text>
                {matchedUserIds.has(item.id) ? (
                  <Text style={styles.matchedLabel}>Kontakt registrovaný v appke</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          ListFooterComponent={
            scanInfo && unmatched.length === 0 ? (
              <View style={styles.unmatchedWrap}>
                <Text style={styles.sectionHeaderText}>Pozvať neaktívne kontakty</Text>
                <Text style={styles.emptyHintText}>
                  Všetky načítané kontakty sú už v appke, alebo neobsahujú podporované telefónne číslo.
                </Text>
                <TouchableOpacity style={styles.shareAllButton} onPress={() => onShareInvite()}>
                  <Text style={styles.shareAllText}>Zdieľať pozvánku</Text>
                </TouchableOpacity>
              </View>
            ) : unmatched.length > 0 ? (
              <View style={styles.unmatchedWrap}>
                <Text style={styles.sectionHeaderText}>Pozvať neaktívne kontakty</Text>
                {unmatched.slice(0, 20).map((item, index) => (
                  <View key={`${item.phone}-${index}`} style={styles.unmatchedRow}>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.name}>{item.contactName}</Text>
                      <Text style={styles.phone}>{item.phone}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.inviteButton}
                      onPress={() => onShareInvite(item)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="share-social-outline" size={16} color={colors.textPrimary} />
                      <Text style={styles.inviteText}>Pozvať</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.shareAllButton} onPress={() => onShareInvite()}>
                  <Text style={styles.shareAllText}>Zdieľať pozvánku</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  topActions: {
    marginBottom: 12
  },
  contactsButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  contactsButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700'
  },
  searchBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14
  },
  listContent: {
    paddingBottom: 20
  },
  scanInfoBox: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary
  },
  scanInfoText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  sectionHeaderWrap: {
    paddingVertical: 8
  },
  sectionHeaderText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  rowTextWrap: {
    flex: 1
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  },
  matchedLabel: {
    marginTop: 3,
    color: colors.success,
    fontSize: 12
  },
  unmatchedWrap: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12
  },
  unmatchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  phone: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2
  },
  inviteButton: {
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6
  },
  inviteText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  shareAllButton: {
    marginTop: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  shareAllText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  emptyHintText: {
    marginTop: 8,
    color: colors.textTertiary,
    fontSize: 13
  }
});
