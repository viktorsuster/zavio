import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import Avatar from '../components/Avatar';
import { apiService } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'DiscoverPlayers'>;
type DirectoryUser = { id: number; name: string; avatar: string | null };

export default function DiscoverPlayersScreen({ navigation }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [users, setUsers] = React.useState<DirectoryUser[]>([]);

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

  const filteredUsers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name || '').toLowerCase().includes(q));
  }, [users, query]);

  return (
    <View style={styles.container}>
      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.contactsButton}
          onPress={() => navigation.navigate('ContactsInvite')}
          activeOpacity={0.85}
        >
          <Ionicons name="people" size={18} color="#000000" />
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('PublicProfile', { userId: String(item.id) })}
              activeOpacity={0.9}
            >
              <Avatar uri={item.avatar} name={item.name} size={44} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
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
  }
});
