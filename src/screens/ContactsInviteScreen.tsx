import React from 'react';
import { ActivityIndicator, Alert, FlatList, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import Avatar from '../components/Avatar';
import { apiService } from '../services/api';

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

export default function ContactsInviteScreen({ navigation }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [contacts, setContacts] = React.useState<DeviceContact[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Kontakty', 'Bez povolenia ku kontaktom nevieme zobraziť zoznam.');
          setContacts([]);
          return;
        }

        const result = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName
        });

        const flattened = (result.data || [])
          .flatMap((contact) => {
            const phones = contact.phoneNumbers || [];
            return phones.map((p, idx) => ({
              id: `${contact.id}-${idx}`,
              name: contact.name || 'Kontakt',
              phone: p.number || ''
            }));
          })
          .filter((item) => item.phone.trim().length > 0);

        if (flattened.length === 0) {
          setContacts([]);
          return;
        }

        const response = await apiService.matchContacts(
          flattened.map((item) => ({ name: item.name, phone: item.phone }))
        );
        const matchedByPhone = new Map(
          (response?.matched || []).map((m) => [
            normalizePhone(m.phone),
            {
              userId: Number(m.user?.id),
              userName: String(m.user?.name || ''),
              userAvatar: m.user?.avatar || null
            }
          ])
        );

        const mapped = flattened.map((item) => ({
          ...item,
          isRegistered: matchedByPhone.has(normalizePhone(item.phone)),
          matchedUserId: matchedByPhone.get(normalizePhone(item.phone))?.userId,
          matchedUserName: matchedByPhone.get(normalizePhone(item.phone))?.userName,
          matchedUserAvatar: matchedByPhone.get(normalizePhone(item.phone))?.userAvatar || null
        }));

        setContacts(mapped);
      } catch (error) {
        console.error('Contacts list load error:', error);
        Alert.alert('Chyba', 'Nepodarilo sa načítať kontakty.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const onInvite = React.useCallback(async (contact: DeviceContact) => {
    await Share.share({ message: `${contact.name}, ${INVITE_TEXT}` });
  }, []);

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

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={orderedContacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
