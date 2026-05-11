import React from 'react';
import { ActivityIndicator, Alert, FlatList, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import Avatar from '../components/Avatar';
import { apiService } from '../services/api';
import { storageService } from '../storage';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactsInvite'>;
type DeviceContact = {
  id: string;
  name: string;
  phone: string;
  isRegistered: boolean;
  matchedUserId?: number;
  matchedUserName?: string;
  matchedUserAvatar?: string | null;
};

const INVITE_TEXT =
  'Pridaj sa ku mne na Sportvia a rezervuj si hru. Stiahni appku a registruj sa: https://sportvia.cloud';

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('421') && digits.length >= 12) return digits.slice(-9);
  if (digits.length > 9) return digits.slice(-9);
  return digits;
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function ContactsInviteScreen({ navigation }: Props) {
  const [search, setSearch] = React.useState('');
  const [permissionStatus, setPermissionStatus] = React.useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [matchedByPhone, setMatchedByPhone] = React.useState<
    Record<string, { userId: number; userName: string; userAvatar: string | null }>
  >({});
  const processedPhonesRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    (async () => {
      try {
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          setPermissionStatus('denied');
          Alert.alert('Kontakty', 'Bez povolenia ku kontaktom nevieme zobraziť zoznam.');
          return;
        }
        setPermissionStatus('granted');
      } catch (e) {
        console.error('Contacts permission error:', e);
        setPermissionStatus('denied');
        Alert.alert('Chyba', 'Nepodarilo sa získať povolenie ku kontaktom.');
      }
    })();
  }, []);

  const pageSize = 500;
  const contactsQuery = useInfiniteQuery({
    queryKey: ['deviceContacts'],
    enabled: permissionStatus === 'granted',
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
        pageSize,
        pageOffset: Number(pageParam) || 0
      });

      // Render 1 row per contact (pick the first usable phone).
      const flattenedPage = (result.data || [])
        .map((contact) => {
          const phones = contact.phoneNumbers || [];
          const phone =
            phones.map((p) => String(p.number || '').trim()).find((n) => n.length > 0) || '';
          return {
            id: String(contact.id),
            name: contact.name || 'Kontakt',
            phone
          };
        })
        .filter((item) => item.phone.trim().length > 0);

      return {
        items: flattenedPage,
        nextOffset: (Number(pageParam) || 0) + pageSize,
        hasNextPage: Boolean(result.hasNextPage)
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextOffset : undefined),
    staleTime: 60_000
  });

  const matchMutation = useMutation({
    mutationFn: async (batch: { name: string; phone: string }[]) => apiService.matchContacts(batch),
    onSuccess: (response) => {
      const next: Record<string, { userId: number; userName: string; userAvatar: string | null }> = {};
      for (const m of response?.matched || []) {
        next[normalizePhone(m.phone)] = {
          userId: Number(m.user?.id),
          userName: String(m.user?.name || ''),
          userAvatar: m.user?.avatar || null
        };
      }
      if (Object.keys(next).length === 0) return;
      setMatchedByPhone((prev) => ({ ...prev, ...next }));
    }
  });

  const flatContacts = React.useMemo(() => {
    const pages = contactsQuery.data?.pages || [];
    // Dedupe: expo-contacts returns one Contact that may contain multiple phone numbers.
    // We render a single row per normalized phone (and effectively per contact), otherwise it looks like duplicates.
    const seen = new Set<string>();
    const out: { id: string; name: string; phone: string }[] = [];
    for (const p of pages) {
      for (const item of p.items) {
        const key = normalizePhone(item.phone) || item.id;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  }, [contactsQuery.data?.pages]);

  React.useEffect(() => {
    if (permissionStatus !== 'granted') return;
    if (flatContacts.length === 0) return;

    // Contacts reading is native (no auth). Backend matching requires auth.
    if (!storageService.getToken()) return;

    const uniqueNew = [];
    for (const c of flatContacts) {
      const key = normalizePhone(c.phone);
      if (!key) continue;
      if (processedPhonesRef.current.has(key)) continue;
      processedPhonesRef.current.add(key);
      uniqueNew.push({ name: c.name, phone: c.phone });
    }

    if (uniqueNew.length === 0) return;

    // Avoid huge payloads / timeouts: match in smaller batches.
    for (const b of chunk(uniqueNew, 400)) {
      matchMutation.mutate(b);
    }
  }, [flatContacts, permissionStatus, matchMutation]);

  const onInvite = React.useCallback(async (contact: DeviceContact) => {
    await Share.share({ message: `${contact.name}, ${INVITE_TEXT}` });
  }, []);

  const contacts: DeviceContact[] = React.useMemo(() => {
    return flatContacts.map((c) => {
      const key = normalizePhone(c.phone);
      const matched = key ? matchedByPhone[key] : undefined;
      return {
        ...c,
        isRegistered: Boolean(matched),
        matchedUserId: matched?.userId,
        matchedUserName: matched?.userName,
        matchedUserAvatar: matched?.userAvatar ?? null
      };
    });
  }, [flatContacts, matchedByPhone]);

  const filteredContacts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
  }, [contacts, search]);

  const registeredContacts = React.useMemo(
    () => filteredContacts.filter((c) => c.isRegistered),
    [filteredContacts]
  );
  const unregisteredContacts = React.useMemo(
    () => filteredContacts.filter((c) => !c.isRegistered),
    [filteredContacts]
  );
  const orderedContacts = React.useMemo(
    () => [...registeredContacts, ...unregisteredContacts],
    [registeredContacts, unregisteredContacts]
  );

  const isInitialLoading = permissionStatus === 'undetermined' || contactsQuery.isLoading;

  return (
    <View style={styles.container}>
      {isInitialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={orderedContacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (contactsQuery.hasNextPage && !contactsQuery.isFetchingNextPage) {
              contactsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.35}
          ListHeaderComponent={
            <View>
              <Text style={styles.subtitle}>Moje kontakty ({contacts.length})</Text>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color={colors.textTertiary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Hľadať kontakt"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.searchInput}
                />
              </View>
              {registeredContacts.length > 0 ? (
                <Text style={styles.sectionTitle}>Už v appke</Text>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => (
            <View>
              {index === registeredContacts.length && unregisteredContacts.length > 0 ? (
                <Text style={styles.sectionTitle}>Na pozvanie</Text>
              ) : null}
              <View style={styles.row}>
              <Avatar uri={null} name={item.name} size={42} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
                {item.isRegistered ? (
                  <Text style={styles.registeredTag}>Registrovaný hráč</Text>
                ) : null}
              </View>
              {item.isRegistered && item.matchedUserId ? (
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => navigation.navigate('PublicProfile', { userId: String(item.matchedUserId) })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="person-circle-outline" size={15} color={colors.textPrimary} />
                  <Text style={styles.inviteText}>Profil</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.inviteButton} onPress={() => onInvite(item)} activeOpacity={0.85}>
                  <Ionicons name="share-social-outline" size={15} color={colors.textPrimary} />
                  <Text style={styles.inviteText}>Pozvať</Text>
                </TouchableOpacity>
              )}
              </View>
            </View>
          )}
          ListFooterComponent={
            contactsQuery.isFetchingNextPage ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={colors.textPrimary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Nenašli sa žiadne kontakty s telefónnym číslom.</Text>
            </View>
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
  listContent: {
    paddingBottom: 20
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8
  },
  searchBox: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4
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
  phone: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2
  },
  registeredTag: {
    marginTop: 3,
    color: colors.success,
    fontSize: 12
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
  profileButton: {
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.backgroundSecondary
  },
  inviteText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  emptyWrap: {
    paddingVertical: 28,
    alignItems: 'center'
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center'
  }
});
