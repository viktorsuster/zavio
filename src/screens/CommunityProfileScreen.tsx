import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import { apiService } from '../services/api';
import { Post } from '../types';
import FeedPostCard from '../components/FeedPostCard';
import { useUser } from '../contexts/UserContext';
import { useAuthGate } from '../hooks/useAuthGate';
import { promptLoginToContinue } from '../utils/authPrompt';

type Route = RouteProp<RootStackParamList, 'CommunityProfile'>;

const sameUserId = (a: unknown, b: unknown) =>
  a != null && b != null && String(a) === String(b);

export default function CommunityProfileScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { isGuest } = useAuthGate();
  const { fieldId } = route.params;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['communityProfile', fieldId],
    queryFn: () => apiService.getFieldProfile(fieldId)
  });

  const field = data?.field;
  const posts: Post[] = data?.posts ?? [];

  const followMutation = useMutation({
    mutationFn: () => apiService.followField(fieldId),
    onSuccess: (res) => {
      queryClient.setQueryData(['communityProfile', fieldId], (old: any) =>
        old
          ? {
              ...old,
              field: { ...old.field, iFollow: res.iFollow, followerCount: res.followerCount }
            }
          : old
      );
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiService.unfollowField(fieldId),
    onSuccess: (res) => {
      queryClient.setQueryData(['communityProfile', fieldId], (old: any) =>
        old
          ? {
              ...old,
              field: { ...old.field, iFollow: res.iFollow, followerCount: res.followerCount }
            }
          : old
      );
    }
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => apiService.likePost(postId),
    onMutate: async (pid: string) => {
      await queryClient.cancelQueries({ queryKey: ['communityProfile', fieldId] });
      const previous = queryClient.getQueryData(['communityProfile', fieldId]);

      queryClient.setQueryData(['communityProfile', fieldId], (old: any) => {
        if (!old?.posts) return old;
        return {
          ...old,
          posts: old.posts.map((p: Post) => {
            if (p.id !== pid) return p;
            const prevLiked = !!(
              p.likedByMe ??
              (p as any).isLiked ??
              (user ? p.likedBy?.some((id: string) => sameUserId(id, user.id)) : false)
            );
            const baseLikes = Number(p.likes ?? 0);
            const nextLikes = Math.max(0, prevLiked ? baseLikes - 1 : baseLikes + 1);
            return { ...p, likedByMe: !prevLiked, isLiked: !prevLiked, likes: nextLikes };
          })
        };
      });

      return { previous };
    },
    onError: (_err, _pid, context: { previous?: unknown }) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['communityProfile', fieldId], context.previous);
      }
    },
    onSuccess: (response, pid) => {
      const likedByMe = (response as any)?.likedByMe ?? (response as any)?.liked;
      queryClient.setQueryData(['communityProfile', fieldId], (old: any) => {
        if (!old?.posts) return old;
        return {
          ...old,
          posts: old.posts.map((p: Post) =>
            p.id === pid ? { ...p, likedByMe, isLiked: likedByMe, likes: response.likesCount } : p
          )
        };
      });
      queryClient.setQueryData(['post', pid], (oldPost: any) => {
        if (!oldPost) return oldPost;
        return { ...oldPost, likedByMe, isLiked: likedByMe, likes: response.likesCount };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'inactive' });
    }
  });

  const handleFollowToggle = () => {
    if (!field) return;
    if (field.iFollow) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const followPending = followMutation.isPending || unfollowMutation.isPending;

  useEffect(() => {
    if (field) {
      navigation.setOptions({ headerTitle: field.name });
    }
  }, [field, navigation]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (isError || !field) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Nepodarilo sa načítať profil komunity.</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Skúsiť znova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleAuthorPress = (post: Post) => {
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

  const handleLikePost = (postId: string) => {
    if (isGuest) {
      promptLoginToContinue('Prihlásenie', 'Lajkovanie je dostupné po prihlásení.');
      return;
    }
    if (!user) return;
    likeMutation.mutate(postId);
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    const isLiked = !!(
      (post as any)?.likedByMe ??
      (post as any)?.isLiked ??
      (user ? post.likedBy?.some((id) => sameUserId(id, user.id)) : false)
    );
    return (
      <FeedPostCard
        post={post}
        isLiked={isLiked}
        onPressCard={() => navigation.navigate('PostDetail', { postId: post.id })}
        onPressAuthor={() => handleAuthorPress(post)}
        onPressLike={() => handleLikePost(post.id)}
        onPressComments={() => navigation.navigate('PostDetail', { postId: post.id })}
      />
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderPost}
      ListEmptyComponent={
        <View style={styles.emptyPosts}>
          <Text style={styles.emptyText}>Zatiaľ žiadne príspevky.</Text>
        </View>
      }
      ListHeaderComponent={
        <View>
          {/* Field hero */}
          <View style={styles.hero}>
            {field.imageUrl ? (
              <Image source={{ uri: field.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroFallback}>
                <Ionicons name="location" size={48} color={colors.textDisabled} />
              </View>
            )}
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.heroName}>{field.name}</Text>
              <Text style={styles.heroType}>{field.type}</Text>
            </View>
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.infoText} numberOfLines={1}>{field.location}</Text>
            </View>
            {field.opensAt && field.closesAt ? (
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.infoText}>{field.opensAt} – {field.closesAt}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats + follow */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{field.followerCount}</Text>
              <Text style={styles.statLabel}>sledujúcich</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{posts.length}</Text>
              <Text style={styles.statLabel}>príspevkov</Text>
            </View>

            <TouchableOpacity
              style={[styles.followBtn, field.iFollow && styles.followBtnActive]}
              onPress={handleFollowToggle}
              disabled={followPending}
              activeOpacity={0.85}
            >
              {followPending ? (
                <ActivityIndicator size="small" color={field.iFollow ? colors.textPrimary : '#000'} />
              ) : (
                <>
                  <Ionicons
                    name={field.iFollow ? 'checkmark' : 'add'}
                    size={16}
                    color={field.iFollow ? colors.textPrimary : '#000'}
                  />
                  <Text style={[styles.followBtnText, field.iFollow && styles.followBtnTextActive]}>
                    {field.iFollow ? 'Sleduješ' : 'Sledovať'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {posts.length > 0 && (
            <Text style={styles.sectionTitle}>Príspevky komunity</Text>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  listContent: {
    paddingBottom: 32
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: 16
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.backgroundTertiary
  },
  retryText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14
  },

  // Hero
  hero: {
    height: 200,
    position: 'relative'
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  heroContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16
  },
  heroName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  heroType: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13
  },

  // Stats + follow
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60
  },
  statNum: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  statLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2
  },
  followBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12
  },
  followBtnActive: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border
  },
  followBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14
  },
  followBtnTextActive: {
    color: colors.textPrimary
  },

  // Section title
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8
  },

  emptyPosts: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 14
  }
});
