import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUser } from '../contexts/UserContext';
import { useQuery } from '@tanstack/react-query';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Post } from '../types';
import { colors } from '../constants/colors';
import { apiService } from '../services/api';
import { useAuthGate } from '../hooks/useAuthGate';
import GuestBlurGate from '../components/GuestBlurGate';
import Avatar from '../components/Avatar';
import FeedPostCard from '../components/FeedPostCard';

type DiscoverFieldRow = {
  id: number;
  name: string;
  type: string;
  location: string;
  imageUrl: string | null;
  facilityName: string;
  followerCount: number;
  iFollow: boolean;
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

const sameUserId = (a: unknown, b: unknown) =>
  a != null && b != null && String(a) === String(b);

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { user } = useUser();
  const { isGuest } = useAuthGate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const qActive = debouncedQ.length >= 2;

  const postsQuery = useQuery({
    queryKey: ['searchPosts', debouncedQ],
    queryFn: () => apiService.searchPosts(debouncedQ, 1, 20),
    enabled: qActive && !isGuest
  });

  const usersQuery = useQuery({
    queryKey: ['searchUsers', debouncedQ],
    queryFn: () => apiService.searchUsers(debouncedQ),
    enabled: qActive && !isGuest
  });

  const fieldsDiscoverQuery = useQuery({
    queryKey: ['fieldsDiscover'],
    queryFn: () => apiService.getFieldsDiscover(),
    enabled: qActive && !isGuest,
    staleTime: 60_000
  });

  const filteredPosts: Post[] = postsQuery.data?.data ?? [];
  const filteredUsers = usersQuery.data?.data ?? [];

  const filteredCommunities = useMemo(() => {
    const q = debouncedQ.trim().toLowerCase();
    if (!q) return [];
    const rows: DiscoverFieldRow[] = fieldsDiscoverQuery.data?.data ?? [];
    return rows.filter((c) => {
      const haystack = [
        c.name,
        c.type,
        c.location,
        c.facilityName,
        String(c.id)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [debouncedQ, fieldsDiscoverQuery.data?.data]);

  const loading =
    qActive &&
    (postsQuery.isFetching || usersQuery.isFetching || fieldsDiscoverQuery.isFetching);
  const errorMsg =
    postsQuery.isError || usersQuery.isError
      ? postsQuery.error?.message || usersQuery.error?.message || 'Chyba pri vyhľadávaní.'
      : null;

  const handleUserClick = (userId: string) => {
    if (sameUserId(userId, user?.id)) {
      navigation.navigate('Main', { screen: 'Profile' });
    } else {
      navigation.navigate('PublicProfile', { userId: String(userId) });
    }
  };

  const handlePostClick = (postId: string) => {
    navigation.navigate('PostDetail', { postId });
  };

  const handlePostAuthorPress = (post: Post) => {
    const p = post as any;
    if (p.authorType === 'field' && p.fieldId) {
      navigation.navigate('CommunityProfile', { fieldId: String(p.fieldId) });
      return;
    }
    const userId = post.userId;
    if (!userId || userId === 'null') return;
    if (sameUserId(userId, user?.id)) {
      navigation.navigate('Main', { screen: 'Profile' });
    } else {
      navigation.navigate('PublicProfile', { userId: String(userId) });
    }
  };

  if (isGuest) {
    return (
      <GuestBlurGate
        isGuest
        title="Vyhľadávanie"
        subtitle="Vyhľadávanie ľudí, komunít a príspevkov je dostupné po prihlásení."
      >
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <View style={[styles.container, styles.guestPlaceholder]}>
            <Ionicons name="search-outline" size={56} color="#475569" />
            <Text style={styles.guestPlaceholderText}>Vyhľadávanie je po prihlásení.</Text>
          </View>
        </SafeAreaView>
      </GuestBlurGate>
    );
  }

  const trimmedInput = searchQuery.trim();
  const showTooShortHint = trimmedInput.length > 0 && trimmedInput.length < 2;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#94a3b8" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Vyhľadať..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {trimmedInput ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {showTooShortHint && (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>Zadaj aspoň 2 znaky.</Text>
            </View>
          )}

          {qActive && loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.gold} />
              <Text style={styles.loadingLabel}>Hľadám…</Text>
            </View>
          )}

          {errorMsg && qActive && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color="#64748b" />
              <Text style={styles.emptyStateText}>{errorMsg}</Text>
            </View>
          )}

          {!errorMsg && qActive && !loading && (
            <>
              {filteredUsers.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ľudia</Text>
                  {filteredUsers.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      onPress={() => handleUserClick(String(user.id))}
                      style={styles.userCard}
                    >
                      <Avatar uri={user.avatar} name={user.name} size={48} containerStyle={styles.userAvatar} />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {filteredCommunities.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Komunity</Text>
                  {filteredCommunities.map((field) => (
                    <TouchableOpacity
                      key={field.id}
                      onPress={() =>
                        navigation.navigate('CommunityProfile', { fieldId: String(field.id) })
                      }
                      style={styles.userCard}
                      activeOpacity={0.85}
                    >
                      <Avatar
                        uri={field.imageUrl}
                        name={field.name}
                        size={48}
                        containerStyle={styles.userAvatar}
                      />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{field.name}</Text>
                        <Text style={styles.fieldMeta} numberOfLines={2}>
                          {field.type}
                          {field.location ? ` · ${field.location}` : ''}
                          {field.facilityName ? ` · ${field.facilityName}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {filteredPosts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Príspevky</Text>
                  {filteredPosts.map((post) => {
                    const isLiked = !!(
                      (post as any)?.likedByMe ??
                      (post as any)?.isLiked ??
                      (user ? post.likedBy?.some((id) => sameUserId(id, user.id)) : false)
                    );
                    return (
                      <View key={post.id} style={{ marginBottom: 12 }}>
                        <FeedPostCard
                          post={post}
                          isLiked={isLiked}
                          onPressCard={() => handlePostClick(post.id)}
                          onPressAuthor={() => handlePostAuthorPress(post)}
                          onPressLike={() => {}}
                          onPressComments={() => {}}
                          interactiveFooter={false}
                          contentNumberOfLines={2}
                          avatarSize={32}
                          formatTimestamp={(ts) =>
                            new Date(ts).toLocaleDateString('sk-SK', {
                              day: 'numeric',
                              month: 'short'
                            })
                          }
                        />
                      </View>
                    );
                  })}
                </View>
              )}

              {filteredUsers.length === 0 &&
                filteredCommunities.length === 0 &&
                filteredPosts.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#64748b" />
                  <Text style={styles.emptyStateText}>Žiadne výsledky</Text>
                  <Text style={styles.emptyStateSubtext}>Skús iný vyhľadávací výraz</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyStateContainer}
        >
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#64748b" />
            <Text style={styles.emptyStateText}>Vyhľadávanie</Text>
            <Text style={styles.emptyStateSubtext}>Môžeš vyhľadávať ľudí, komunity alebo príspevky</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  guestPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28
  },
  guestPlaceholderText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12
  },
  backButton: {
    padding: 8,
    marginLeft: -8
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  searchIcon: {
    marginRight: 4
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 100
  },
  hintBox: {
    marginBottom: 12
  },
  hintText: {
    color: colors.textDisabled,
    fontSize: 14
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16
  },
  loadingLabel: {
    color: colors.textTertiary,
    fontSize: 14
  },
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundTertiary
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary
  },
  fieldMeta: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 4,
    lineHeight: 18
  },
  emptyStateContainer: {
    flexGrow: 1,
    paddingTop: 40
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textDisabled,
    textAlign: 'center'
  }
});
