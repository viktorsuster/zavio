import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
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
import { useAuthGate } from '../hooks/useAuthGate';
import { promptLoginToContinue } from '../utils/authPrompt';
import Avatar from '../components/Avatar';
import FeedPostCard from '../components/FeedPostCard';

const sameUserIdLocal = (a: unknown, b: unknown) =>
  a != null && b != null && String(a) === String(b);

const INITIAL_TOOLBAR_HEIGHT = 60;

type FeedScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Feed'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function FeedScreen() {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const { user } = useUser();
  const { isGuest } = useAuthGate();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(INITIAL_TOOLBAR_HEIGHT);
  const [listHeaderHeight, setListHeaderHeight] = useState(0);
  const scrollOffset = useSharedValue(0);
  const listRef = useRef<Animated.FlatList<Post>>(null);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 1 }) => apiService.getPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.meta?.page || 1;
      const totalPages = lastPage.meta?.totalPages || 1;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  const posts = data?.pages.flatMap((page) => page.data) || [];

  const handlePullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      void handlePullToRefresh();
    });
    return unsubscribe;
  }, [navigation, handlePullToRefresh]);

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
              const prevLiked = !!(
                p.likedByMe ??
                p.isLiked ??
                (user ? p.likedBy?.some((id: string) => sameUserIdLocal(id, user.id)) : false)
              );
              const baseLikes = Number(p.likes ?? 0);
              const nextLikes = Math.max(0, prevLiked ? baseLikes - 1 : baseLikes + 1);
              return { ...p, likedByMe: !prevLiked, isLiked: !prevLiked, likes: nextLikes };
            }),
          })),
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
            ),
          })),
        };
      });
      queryClient.setQueryData(['post', postId], (oldPost: any) => {
        if (!oldPost) return oldPost;
        return { ...oldPost, likedByMe, isLiked: likedByMe, likes: response.likesCount };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'inactive' });
    },
  });

  const handleSearchPress = useCallback(() => {
    if (isGuest) {
      promptLoginToContinue('Prihlásenie', 'Vyhľadávanie je dostupné po prihlásení.');
      return;
    }
    navigation.navigate('Search');
  }, [isGuest, navigation]);

  const handleCreatePostPress = useCallback(() => {
    if (isGuest) {
      promptLoginToContinue('Prihlásenie', 'Príspevky môžeš pridávať po prihlásení.');
      return;
    }
    navigation.navigate('CreatePost');
  }, [isGuest, navigation]);

  const handleLike = (postId: string) => {
    if (isGuest) {
      promptLoginToContinue('Prihlásenie', 'Lajkovanie je dostupné po prihlásení.');
      return;
    }
    if (!user) return;
    likeMutation.mutate(postId);
  };

  const handleUserClick = (post: Post) => {
    const p = post as any;
    if (p.authorType === 'field' && p.fieldId) {
      navigation.navigate('CommunityProfile', { fieldId: String(p.fieldId) });
      return;
    }
    const userId = post.userId;
    if (!userId || userId === 'null') return;
    if (sameUserIdLocal(userId, user?.id)) {
      navigation.navigate('Main', { screen: 'Profile' });
    } else {
      navigation.navigate('PublicProfile', { userId: String(userId) });
    }
  };

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (headerHeight === 0) {
      return { transform: [{ translateY: 0 }] };
    }
    const translateY = interpolate(
      scrollOffset.value,
      [0, headerHeight],
      [0, -headerHeight],
      'clamp'
    );
    return { transform: [{ translateY }] };
  }, [headerHeight]);

  const stickyHeaderAnimatedStyle = useAnimatedStyle(() => {
    const stickyStart = listHeaderHeight + headerHeight - 40;
    const stickyEnd = listHeaderHeight + headerHeight;
    if (stickyEnd <= 0) {
      return { opacity: 0 };
    }
    const opacity = interpolate(scrollOffset.value, [stickyStart, stickyEnd], [0, 1], 'clamp');
    const translateY = interpolate(scrollOffset.value, [stickyStart, stickyEnd], [-20, 0], 'clamp');
    return { opacity, transform: [{ translateY }] };
  }, [headerHeight, listHeaderHeight]);

  const handleToolbarLayout = useCallback((height: number) => {
    const rounded = Math.round(height);
    setHeaderHeight((prev) => (prev === rounded ? prev : rounded));
  }, []);

  const handleListHeaderLayout = useCallback((height: number) => {
    const rounded = Math.round(height);
    setListHeaderHeight((prev) => (prev === rounded ? prev : rounded));
  }, []);

  const feedListHeader = useMemo(
    () => (
      <View
        onLayout={(event) => handleListHeaderLayout(event.nativeEvent.layout.height)}
        style={styles.listHeader}
      >
        {isGuest ? (
          <View style={styles.guestBannerOuter}>
            {Platform.OS === 'web' ? (
              <View style={[styles.guestBannerFallback, styles.guestBannerInner]}>
                <Text style={styles.guestBannerText}>
                  Prehliadaš ako hosť · Pre komentáre a lajky sa prihlás
                </Text>
              </View>
            ) : (
              <BlurView intensity={48} tint="dark" style={styles.guestBannerInner}>
                <Text style={styles.guestBannerText}>
                  Prehliadaš ako hosť · Pre komentáre a lajky sa prihlás
                </Text>
              </BlurView>
            )}
          </View>
        ) : null}

        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.widgetCard} onPress={() => navigation.navigate('Booking')}>
            <View style={[styles.widgetIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="calendar" size={24} color="#000" />
            </View>
            <Text style={styles.widgetText}>Rezervovať</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.widgetCard} onPress={() => navigation.navigate('MyGames')}>
            <View style={[styles.widgetIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="trophy" size={24} color="#fff" />
            </View>
            <Text style={styles.widgetText}>Moje hry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.widgetCard}
            onPress={() => {
              if (isGuest) {
                promptLoginToContinue('Prihlásenie', 'Objavovanie hráčov je dostupné po prihlásení.');
                return;
              }
              navigation.navigate('DiscoverPlayers');
            }}
          >
            <View style={[styles.widgetIcon, { backgroundColor: colors.tertiary }]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <Text style={styles.widgetText}>Objaviť</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.createPostCard}
          onPress={handleCreatePostPress}
          activeOpacity={0.8}
        >
          <Avatar
            uri={user?.avatar ?? null}
            name={isGuest ? 'Hosť' : user?.name ?? ''}
            size={40}
            containerStyle={styles.createPostAvatar}
          />
          <View style={styles.createPostInput}>
            <Text style={styles.createPostPlaceholder}>Čo máš dnes na mysli?</Text>
          </View>
          <Ionicons name="images-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
    ),
    [handleCreatePostPress, handleListHeaderLayout, isGuest, navigation, user?.avatar, user?.name]
  );

  const renderPost = ({ item: post }: { item: Post }) => {
    const isLiked = !!(
      (post as any)?.likedByMe ??
      (post as any)?.isLiked ??
      (user ? post.likedBy?.some((id) => sameUserIdLocal(id, user.id)) : false)
    );
    return (
      <FeedPostCard
        post={post}
        isLiked={isLiked}
        onPressCard={() => navigation.navigate('PostDetail', { postId: post.id })}
        onPressAuthor={() => handleUserClick(post)}
        onPressLike={() => handleLike(post.id)}
        onPressComments={() => navigation.navigate('PostDetail', { postId: post.id })}
      />
    );
  };

  if (isLoading && posts.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Načítavam príspevky...</Text>
        </View>
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.overlayHeader,
            headerAnimatedStyle,
          ]}
        >
          <View
            onLayout={(event) => handleToolbarLayout(event.nativeEvent.layout.height)}
            style={styles.overlayHeaderInner}
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image source={require('../../assets/icon.png')} style={styles.headerLogo} />
                <Text style={styles.headerTitle}>Sportvia</Text>
              </View>
              <TouchableOpacity onPress={handleSearchPress} style={styles.iconButton}>
                <Ionicons name="search" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Animated.View style={[styles.stickyHeader, stickyHeaderAnimatedStyle]}>
        <View style={styles.stickyHeaderContainer}>
          <View style={styles.stickyHeaderContent}>
            <View style={styles.stickyLogoContainer}>
              <Image source={require('../../assets/icon.png')} style={styles.stickyHeaderLogo} />
              <Text style={styles.stickyHeaderTitle}>Sportvia</Text>
            </View>
            <TouchableOpacity onPress={handleSearchPress} style={styles.iconButton}>
              <Ionicons name="search" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.FlatList
        ref={listRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={feedListHeader}
        contentContainerStyle={[
          styles.scrollContent,
          posts.length === 0 && { flexGrow: 1 },
          { paddingTop: headerHeight },
        ]}
        bounces
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            tintColor="#FFFFFF"
            colors={['#FFFFFF']}
            progressBackgroundColor={colors.backgroundSecondary}
            progressViewOffset={headerHeight}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator size="large" color="#FFFFFF" style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !isError && !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Žiadne príspevky</Text>
            </View>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />

      <Animated.View
        pointerEvents="box-none"
        style={[styles.overlayHeader, headerAnimatedStyle]}
      >
        <View
          onLayout={(event) => handleToolbarLayout(event.nativeEvent.layout.height)}
          style={styles.overlayHeaderInner}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/icon.png')} style={styles.headerLogo} />
              <Text style={styles.headerTitle}>Sportvia</Text>
            </View>
            <TouchableOpacity onPress={handleSearchPress} style={styles.iconButton}>
              <Ionicons name="search" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  overlayHeaderInner: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: colors.background,
  },
  stickyHeaderContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stickyLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stickyHeaderLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  stickyHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  guestBannerOuter: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestBannerInner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  guestBannerFallback: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  guestBannerText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  widgetCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  widgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  widgetText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  createPostCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  createPostInput: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createPostPlaceholder: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textDisabled,
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
