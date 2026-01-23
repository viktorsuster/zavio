import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { colors } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList } from '../navigation/AppNavigator';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

type FeedScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Feed'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function FeedScreen() {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const getInitials = (fullName?: string) => {
    const name = (fullName || '').trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (first + last).toUpperCase() || '?';
  };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 1 }) => apiService.getPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.meta?.page || 1;
      const totalPages = lastPage.meta?.totalPages || 1;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    }
  });

  const posts = data?.pages.flatMap(page => page.data) || [];

  const handlePullToRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      // Keep spinner visible long enough to notice even on fast cache hits
      const minVisibleMs = 600;
      const start = Date.now();
      await refetch();
      const elapsed = Date.now() - start;
      if (elapsed < minVisibleMs) {
        await new Promise((r) => setTimeout(r, minVisibleMs - elapsed));
      }
    } finally {
      setIsPullRefreshing(false);
    }
  };

  const likeMutation = useMutation({
    mutationFn: (postId: string) => apiService.likePost(postId),
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueryData(['posts']);

      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: (page.data || []).map((p: any) => {
              if (p.id !== postId) return p;
              const prevLiked = !!(p.likedByMe ?? p.isLiked ?? (user ? p.likedBy?.includes(user.id) : false));
              const baseLikes = Number(p.likes ?? 0);
              const nextLikes = Math.max(0, prevLiked ? baseLikes - 1 : baseLikes + 1);
              return { ...p, likedByMe: !prevLiked, isLiked: !prevLiked, likes: nextLikes };
            })
          }))
        };
      });

      return { previousPosts };
    },
    onError: (error, _postId, context: any) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      console.error('Like error:', error);
    },
    onSuccess: (response, postId) => {
      const likedByMe = (response as any)?.likedByMe ?? (response as any)?.liked;
      // Sync cache with server result
      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: (page.data || []).map((p: any) =>
              p.id === postId
                ? { ...p, likedByMe, isLiked: likedByMe, likes: response.likesCount }
                : p
            )
          }))
        };
      });
      queryClient.setQueryData(['post', postId], (oldPost: any) => {
        if (!oldPost) return oldPost;
        return { ...oldPost, likedByMe, isLiked: likedByMe, likes: response.likesCount };
      });
    },
    onSettled: () => {
      // Mark stale but don't refetch active feed immediately
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'inactive' });
    }
  });

  const handleLike = (postId: string) => {
    if (!user) return;
    likeMutation.mutate(postId);
  };

  const handleUserClick = (userId: string) => {
    if (userId === user?.id) {
      (navigation as any).getParent()?.navigate('Profile');
    } else {
      (navigation as any).getParent()?.navigate('PublicProfile', { userId });
    }
  };


  const renderPost = ({ item: post }: { item: Post }) => {
    const isLiked = !!((post as any)?.likedByMe ?? (post as any)?.isLiked ?? (user ? post.likedBy?.includes(user.id) : false));
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
        style={styles.postCard}
        activeOpacity={0.9}
      >
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleUserClick(post.userId);
          }}
          style={styles.postHeader}
        >
          {post.userAvatar ? (
            <Image source={{ uri: post.userAvatar }} style={styles.postAvatar} />
          ) : (
            <View style={styles.postAvatarFallback}>
              <Text style={styles.postAvatarText}>{getInitials(post.userName)}</Text>
            </View>
          )}
          <View style={styles.postHeaderText}>
            <Text style={styles.postUserName}>{post.userName}</Text>
            <Text style={styles.postTime}>
              {new Date(post.timestamp).toLocaleDateString('sk-SK', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.postContent} numberOfLines={3}>
          {post.content}
        </Text>

        {post.image && (
          <Image source={{ uri: post.image }} style={styles.postImage} />
        )}

        <View style={styles.postFooter}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleLike(post.id);
            }}
            style={styles.actionButton}
          >
            <Ionicons
              name={isLiked ? 'flash' : 'flash-outline'}
              size={20}
              color={isLiked ? colors.tertiary : '#94a3b8'}
            />
            <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>
              {post.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('PostDetail', { postId: post.id });
            }}
            style={styles.actionButton}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#94a3b8" />
            <Text style={styles.actionCount}>{post.comments?.length || 0}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.headerLogo} 
            />
            <Text style={styles.headerTitle}>sportvia</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Search')}
              style={styles.iconButton}
            >
              <Ionicons name="search" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.widgetCard}
            onPress={() => navigation.navigate('Booking')}
          >
            <View style={[styles.widgetIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="calendar" size={24} color="#000" />
            </View>
            <Text style={styles.widgetText}>Rezervovať</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.widgetCard}
            onPress={() => navigation.navigate('MyGames')}
          >
            <View style={[styles.widgetIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="trophy" size={24} color="#fff" />
            </View>
            <Text style={styles.widgetText}>Moje hry</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.widgetCard}
            onPress={() => navigation.navigate('TopUp')}
          >
            <View style={[styles.widgetIcon, { backgroundColor: colors.tertiary }]}>
              <Ionicons name="wallet" size={24} color="#fff" />
            </View>
            <Text style={styles.widgetText}>{user?.credits || 0} €</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fullBleedRow}>
          <TouchableOpacity
            style={styles.createPostCard}
            onPress={() => navigation.navigate('CreatePost')}
            activeOpacity={0.8}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.createPostAvatar} />
            ) : (
              <View style={styles.createPostAvatarFallback}>
                <Text style={styles.createPostAvatarText}>{getInitials(user?.name)}</Text>
              </View>
            )}
            <View style={styles.createPostInput}>
              <Text style={styles.createPostPlaceholder}>Čo máš dnes na mysli?</Text>
            </View>
            <Ionicons name="images-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom pull-to-refresh indicator (always white) */}
      {isPullRefreshing ? (
        <View style={styles.pullRefreshBar}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.pullRefreshText}>Obnovujem…</Text>
        </View>
      ) : null}

      {/* Scrollable Content */}
      {isLoading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Načítavam príspevky...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.scrollContent, posts.length === 0 && { flexGrow: 1 }]}
          bounces
          alwaysBounceVertical
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={handlePullToRefresh}
              // Hide native spinner (we render our own guaranteed-white spinner above)
              tintColor="transparent"
              colors={['transparent']}
              progressBackgroundColor="#000000"
              title=" "
              titleColor="#FFFFFF"
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="large"
                color="#FFFFFF"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
          ListEmptyComponent={
            !isError && !isLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Žiadne príspevky</Text>
              </View>
            ) : null
          }
        />
      )}
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
  scrollContent: {
    paddingBottom: 100
  },
  fixedHeader: {
    backgroundColor: colors.background,
    padding: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10
  },
  fullBleedRow: {
    marginHorizontal: -16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 1 // Pre viac "pro" vzhľad
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconButton: {
    padding: 8
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12
  },
  widgetCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  widgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  widgetText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center'
  },
  widgetSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2
  },
  createPostCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    marginBottom: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155'
  },
  createPostAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  createPostAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  createPostInput: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  createPostPlaceholder: {
    color: colors.textTertiary,
    fontSize: 14
  },
  postsContainer: {
    gap: 8
  },
  postCard: {
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 4
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#334155',
    marginTop: 12,
    marginBottom: 12
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155'
  },
  postAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  postAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  postHeaderText: {
    flex: 1
  },
  postUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary
  },
  postTime: {
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: 2
  },
  postContent: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 16 // Zväčšené odsadenie od spodku (footeru)
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionCount: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '600'
  },
  actionCountActive: {
    color: colors.tertiary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    fontSize: 16,
    color: colors.textDisabled,
    marginTop: 16
  },
  pullRefreshBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  pullRefreshText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center'
  }
});

