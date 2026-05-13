import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Avatar from '../components/Avatar';
import { apiService } from '../services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchConversations } from '../chat/api';
import { useAuthGate } from '../hooks/useAuthGate';
import { promptLoginToContinue } from '../utils/authPrompt';
import { useUser } from '../contexts/UserContext';
import type { UserGameHistoryItem } from '../types';

function participationLabel(role: UserGameHistoryItem['participationRole']): string {
  if (role === 'organizer') return 'Rezervoval';
  if (role === 'guest_pending') return 'Pozvánka čaká';
  return 'Pozvaný';
}

type PublicProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PublicProfile'
>;

export default function PublicProfileScreen() {
  const navigation = useNavigation<PublicProfileScreenNavigationProp>();
  const route = useRoute();
  const { userId } = route.params as { userId: string };
  const { isGuest } = useAuthGate();
  const { user: me } = useUser();
  const queryClient = useQueryClient();
  const [openingChat, setOpeningChat] = React.useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => apiService.getPublicProfile(userId),
    enabled: !!userId,
  });

  const user = data?.user;
  const relationship = data?.relationship;
  const followCounts = data?.followCounts;
  const stats = (data as any)?.stats; // stats môže byť v response, ak ho backend posiela

  const isOwnProfile = Boolean(me?.id && userId && String(me.id) === String(userId));

  const {
    data: gamesData,
    isLoading: gamesLoading,
    isError: gamesError,
    refetch: refetchGames
  } = useQuery({
    queryKey: ['userGameHistory', userId],
    queryFn: () => apiService.getUserGameHistory(userId, 1, 20),
    enabled:
      !!userId &&
      !isGuest &&
      (Boolean(relationship?.mutual) || isOwnProfile)
  });

  const canShowGames = Boolean(relationship?.mutual) || isOwnProfile;

  const followMutation = useMutation({
    mutationFn: () => apiService.followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['userGameHistory', userId] });
    },
    onError: (error: Error) => {
      Alert.alert('Chyba', error.message || 'Nepodarilo sa začať sledovať.');
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiService.unfollowUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['userGameHistory', userId] });
    },
    onError: (error: Error) => {
      Alert.alert('Chyba', error.message || 'Nepodarilo sa prestať sledovať.');
    }
  });

  const handleOpenChat = React.useCallback(async () => {
    if (isGuest) {
      promptLoginToContinue('Prihlásenie', 'Správy sú dostupné po prihlásení.');
      return;
    }
    if (!relationship?.canMessageFromProfile) {
      Alert.alert(
        'Správy',
        'Priama správa z profilu je dostupná len po vzájomnom sledovaní. Skupinový chat rezervácie nájdeš v Správach.'
      );
      return;
    }
    if (!user?.id || openingChat) return;
    setOpeningChat(true);
    try {
      const conversations = await fetchConversations();
      const existingDirect = conversations.find(
        (c: any) => !c?.isGroup && Number(c?.otherUser?.id) === Number(user.id)
      );
      if (existingDirect?.id) {
        navigation.navigate('ChatConversation', {
          conversationId: Number(existingDirect.id),
          conversation: existingDirect
        });
        return;
      }

      navigation.navigate('ChatConversation', {
        otherUserId: Number(user.id),
        otherUserDisplayName: String(user.name || 'Používateľ'),
        conversation: {
          type: 'direct',
          isGroup: false,
          otherUser: {
            id: Number(user.id),
            displayName: String(user.name || 'Používateľ')
          },
          displayName: String(user.name || 'Používateľ')
        }
      });
    } catch (error: any) {
      console.error('Open chat from profile error:', error);
      Alert.alert('Správy', error?.message || 'Nepodarilo sa otvoriť konverzáciu.');
    } finally {
      setOpeningChat(false);
    }
  }, [isGuest, navigation, openingChat, user?.id, relationship?.canMessageFromProfile]);

  React.useLayoutEffect(() => {
    const showMessage = Boolean(relationship?.canMessageFromProfile && !isOwnProfile);
    navigation.setOptions({
      headerRight: showMessage
        ? () => (
            <Pressable
              onPress={handleOpenChat}
              disabled={openingChat}
              style={styles.headerMessageButton}
              hitSlop={10}
            >
              {openingChat ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.headerMessageButtonText}>Napísať</Text>
              )}
            </Pressable>
          )
        : undefined
    });
  }, [navigation, handleOpenChat, openingChat, relationship?.canMessageFromProfile, isOwnProfile]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Načítavam profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Používateľ nebol nájdený</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={async () => {
              await refetch();
              if (!isGuest && (relationship?.mutual || isOwnProfile)) {
                await refetchGames();
              }
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar uri={user.avatar} name={user.name} size={92} />
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>Hráč</Text>
          {followCounts != null && (
            <Text style={styles.followStats}>
              {followCounts.followers} sledujúci · {followCounts.following} sledujem
            </Text>
          )}
          {!isGuest && !isOwnProfile && relationship && (
            <Pressable
              style={[
                styles.followButton,
                relationship.iFollow && styles.followButtonActive
              ]}
              disabled={followMutation.isPending || unfollowMutation.isPending}
              onPress={() => {
                if (relationship.iFollow) {
                  unfollowMutation.mutate();
                } else {
                  followMutation.mutate();
                }
              }}
            >
              {followMutation.isPending || unfollowMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.followButtonText}>
                  {relationship.iFollow ? 'Prestať sledovať' : 'Sledovať'}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.skillsSection}>
          <View style={styles.skillsHeader}>
            <Ionicons name="heart-outline" size={16} color="#94a3b8" />
            <Text style={styles.skillsTitle}>Záujmy</Text>
          </View>
          {!relationship?.canViewInterests ? (
            <Text style={styles.emptySkillsText}>
              Záujmy sú viditeľné len po vzájomnom sledovaní s týmto hráčom.
            </Text>
          ) : (user.interests ?? []).length === 0 ? (
            <Text style={styles.emptySkillsText}>
              Hráč zatiaľ neuviedol žiadne záujmy.
            </Text>
          ) : (
            <View style={styles.interestsWrap}>
              {(user.interests ?? []).map((sport) => (
                <View key={sport} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{sport}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {!isGuest && (
          <View style={styles.gamesSection}>
            <View style={styles.skillsHeader}>
              <Ionicons name="football-outline" size={16} color="#94a3b8" />
              <Text style={styles.skillsTitle}>Hry</Text>
            </View>
            {!canShowGames ? (
              <Text style={styles.emptySkillsText}>
                História hier je dostupná len po vzájomnom sledovaní s týmto hráčom.
              </Text>
            ) : gamesLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : gamesError ? (
              <Text style={styles.emptySkillsText}>Nepodarilo sa načítať históriu hier.</Text>
            ) : (gamesData?.data?.length ?? 0) === 0 ? (
              <Text style={styles.emptySkillsText}>Zatiaľ žiadne zaznamenané hry.</Text>
            ) : (
              <View style={styles.gamesList}>
                {(gamesData?.data ?? []).map((g) => (
                  <View key={g.bookingId} style={styles.gameRow}>
                    {g.fieldImageUrl ? (
                      <Image source={{ uri: g.fieldImageUrl }} style={styles.gameThumb} />
                    ) : (
                      <View style={[styles.gameThumb, styles.gameThumbPlaceholder]}>
                        <Ionicons name="image-outline" size={22} color="#64748b" />
                      </View>
                    )}
                    <View style={styles.gameRowText}>
                      <Text style={styles.gameFieldName} numberOfLines={1}>
                        {g.fieldName}
                      </Text>
                      <Text style={styles.gameMeta}>
                        {g.date} · {g.startTime}–{g.endTime} · {g.durationMinutes} min
                      </Text>
                      <View style={styles.gameBadge}>
                        <Text style={styles.gameBadgeText}>{participationLabel(g.participationRole)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {stats && (
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.matchesCount ?? 0}</Text>
              <Text style={styles.statLabel}>Zápasov</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.reliabilityPercent ?? 0}%</Text>
              <Text style={styles.statLabel}>Spoľahlivosť</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 100
  },
  headerMessageButton: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  headerMessageButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700'
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 2,
    backgroundColor: '#475569',
    marginBottom: 16
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4
  },
  userRole: {
    fontSize: 14,
    color: colors.textTertiary
  },
  followStats: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary
  },
  followButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.primary
  },
  followButtonActive: {
    borderColor: '#334155',
    backgroundColor: colors.background
  },
  followButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15
  },
  skillsSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  skillsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  emptySkillsText: {
    fontSize: 14,
    color: '#64748b'
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#334155'
  },
  interestChipText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase'
  },
  gamesSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  gamesList: {
    gap: 12
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  gameThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.background
  },
  gameThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  gameRowText: {
    flex: 1,
    minWidth: 0
  },
  gameFieldName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4
  },
  gameMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6
  },
  gameBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  gameBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 48
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14
  }
});

