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
type DiscoverField = {
  id: number;
  name: string;
  type: string;
  location: string;
  imageUrl: string | null;
  facilityName: string;
  followerCount: number;
  iFollow: boolean;
};

export default function DiscoverPlayersScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = React.useState<'players' | 'communities'>('communities');
  const [loading, setLoading] = React.useState(true);
  const [communitiesLoading, setCommunitiesLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [users, setUsers] = React.useState<DirectoryUser[]>([]);
  const [communities, setCommunities] = React.useState<DiscoverField[]>([]);

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

  const loadCommunities = React.useCallback(async () => {
    setCommunitiesLoading(true);
    try {
      const response = await apiService.getFieldsDiscover();
      setCommunities(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Communities load error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa načítať komunity.');
    } finally {
      setCommunitiesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  React.useEffect(() => {
    if (activeTab === 'communities' && communities.length === 0) {
      loadCommunities();
    }
  }, [activeTab]);

  const filteredUsers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name || '').toLowerCase().includes(q));
  }, [users, query]);

  const filteredCommunities = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q) ||
        (c.type || '').toLowerCase().includes(q)
    );
  }, [communities, query]);

  return (
    <View style={styles.container}>
      {/* Contacts button */}
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

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'communities' && styles.tabActive]}
          onPress={() => {
            setActiveTab('communities');
            setQuery('');
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name={activeTab === 'communities' ? 'earth' : 'earth-outline'}
            size={18}
            color={activeTab === 'communities' ? colors.textPrimary : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'communities' && styles.tabTextActive]}>
            Komunity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'players' && styles.tabActive]}
          onPress={() => {
            setActiveTab('players');
            setQuery('');
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name={activeTab === 'players' ? 'people' : 'people-outline'}
            size={18}
            color={activeTab === 'players' ? colors.textPrimary : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'players' && styles.tabTextActive]}>
            Hráči
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          placeholder={activeTab === 'players' ? 'Hľadať hráča' : 'Hľadať komunitu'}
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Players list */}
      {activeTab === 'players' && (
        loading ? (
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
        )
      )}

      {/* Communities list */}
      {activeTab === 'communities' && (
        communitiesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        ) : (
          <FlatList
            data={filteredCommunities}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.communityRow}
                onPress={() =>
                  navigation.navigate('CommunityProfile', { fieldId: String(item.id) })
                }
                activeOpacity={0.9}
              >
                <Avatar uri={item.imageUrl} name={item.name} size={48} />
                <View style={styles.communityInfo}>
                  <Text style={styles.communityName}>{item.name}</Text>
                  <Text style={styles.communityMeta} numberOfLines={1}>
                    {item.type}
                    {item.location ? ` · ${item.location}` : ''}
                  </Text>
                  <View style={styles.communityStats}>
                    <Ionicons name="people-outline" size={13} color={colors.textTertiary} />
                    <Text style={styles.communityFollowers}>{item.followerCount} sledujúcich</Text>
                    {item.iFollow && (
                      <View style={styles.followingBadge}>
                        <Text style={styles.followingBadgeText}>Sleduješ</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>Žiadne komunity nenájdené.</Text>
              </View>
            }
          />
        )
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
    justifyContent: 'center',
    paddingTop: 40
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

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6
  },
  tabActive: {
    backgroundColor: colors.backgroundTertiary
  },
  tabText: {
    color: colors.textTertiary,
    fontWeight: '600',
    fontSize: 14
  },
  tabTextActive: {
    color: colors.textPrimary
  },

  // Search
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

  // Player row
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

  // Community row
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  communityInfo: {
    flex: 1
  },
  communityName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  communityMeta: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  communityFollowers: {
    color: colors.textTertiary,
    fontSize: 12
  },
  followingBadge: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6
  },
  followingBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700'
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 14
  }
});
