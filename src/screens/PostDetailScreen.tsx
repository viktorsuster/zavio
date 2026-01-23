import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardStickyView, KeyboardGestureArea, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Post, Comment } from '../types';
import { colors } from '../constants/colors';
import { useUser } from '../contexts/UserContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import Avatar from '../components/Avatar';

type PostDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PostDetail'>;
type PostDetailScreenRouteProp = {
  params: { postId: string };
};

export default function PostDetailScreen() {
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const route = useRoute<PostDetailScreenRouteProp>();
  const { postId } = route.params;
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');
  const [showLikesModal, setShowLikesModal] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiService.getPostDetail(postId),
    enabled: !!postId
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => apiService.likePost(postId),
    onMutate: async (pid: string) => {
      await queryClient.cancelQueries({ queryKey: ['post', pid] });
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      const previousPost = queryClient.getQueryData(['post', pid]);
      const previousPosts = queryClient.getQueryData(['posts']);

      // Optimistic update - post detail
      queryClient.setQueryData(['post', pid], (oldPost: any) => {
        if (!oldPost) return oldPost;
        const prevLiked = !!(oldPost.likedByMe ?? oldPost.isLiked ?? oldPost.likedBy?.includes(user.id));
        const baseLikes = Number(oldPost.likes ?? 0);
        const nextLikes = Math.max(0, prevLiked ? baseLikes - 1 : baseLikes + 1);
        return { ...oldPost, likedByMe: !prevLiked, isLiked: !prevLiked, likes: nextLikes };
      });

      // Optimistic update - feed list
      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: (page.data || []).map((p: any) => {
              if (p.id !== pid) return p;
              const prevLiked = !!(p.likedByMe ?? p.isLiked ?? p.likedBy?.includes(user.id));
              const baseLikes = Number(p.likes ?? 0);
              const nextLikes = Math.max(0, prevLiked ? baseLikes - 1 : baseLikes + 1);
              return { ...p, likedByMe: !prevLiked, isLiked: !prevLiked, likes: nextLikes };
            })
          }))
        };
      });

      return { previousPost, previousPosts };
    },
    onError: (_err, pid, context: any) => {
      if (context?.previousPost) queryClient.setQueryData(['post', pid], context.previousPost);
      if (context?.previousPosts) queryClient.setQueryData(['posts'], context.previousPosts);
    },
    onSuccess: (response, pid) => {
      const likedByMe = (response as any)?.likedByMe ?? (response as any)?.liked;
      queryClient.setQueryData(['post', pid], (oldPost: any) => {
        if (!oldPost) return oldPost;
        return { ...oldPost, likedByMe, isLiked: likedByMe, likes: response.likesCount };
      });
      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: (page.data || []).map((p: any) =>
              p.id === pid ? { ...p, likedByMe, isLiked: likedByMe, likes: response.likesCount } : p
            )
          }))
        };
      });
    },
    onSettled: (_data, _err, pid) => {
      // Mark stale but don't refetch active queries immediately
      queryClient.invalidateQueries({ queryKey: ['post', pid], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'inactive' });
    }
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => apiService.addComment(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setCommentText('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: (commentId: string) => apiService.likeComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    }
  });

  const handleLike = () => {
    if (!post || !user) return;
    likeMutation.mutate(postId);
  };

  const handleComment = () => {
    if (!commentText.trim() || !post || !user) return;
    commentMutation.mutate(commentText.trim());
  };

  const handleLikeComment = (commentId: string) => {
    if (!post || !user) return;
    likeCommentMutation.mutate(commentId);
  };

  const handleUserClick = (userId: string) => {
    if (userId === user?.id) {
      (navigation as any).getParent()?.navigate('Profile');
    } else {
      (navigation as any).getParent()?.navigate('PublicProfile', { userId });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#94a3b8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Príspevok</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !post || isError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#94a3b8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Príspevok</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#64748b" />
          <Text style={styles.loadingText}>Príspevok sa nenašiel</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLiked = !!((post as any)?.likedByMe ?? (post as any)?.isLiked ?? post.likedBy?.includes(user.id) ?? false);
  // Note: API might not return full user objects for likes, so modal is disabled for now if data is missing
  const likedUsers: any[] = []; // Placeholder

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Príspevok</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardGestureArea interpolator="ios" style={styles.contentWrapper}>
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bottomOffset={80}
        >
        {/* Post Content */}
        <View>
          <TouchableOpacity
            onPress={() => handleUserClick(post.userId)}
            style={styles.postHeader}
          >
            <Avatar uri={post.userAvatar} name={post.userName} size={48} />
            <View style={styles.postHeaderText}>
              <Text style={styles.postUserName}>{post.userName}</Text>
              <Text style={styles.postTime}>
                {new Date(post.timestamp).toLocaleDateString('sk-SK', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.image && (
            <Image source={{ uri: post.image }} style={styles.postImage} />
          )}

          <View style={styles.postFooter}>
            <TouchableOpacity
              onPress={handleLike}
              style={[styles.actionButton, isLiked && styles.actionButtonActive]}
            >
              <Ionicons
                name={isLiked ? 'flash' : 'flash-outline'}
                size={20}
                color={isLiked ? colors.tertiary : '#94a3b8'}
              />
              <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                {post.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#94a3b8" />
              <Text style={styles.actionText}>{post.comments.length}</Text>
            </TouchableOpacity>

            {post.likes > 0 && likedUsers.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowLikesModal(true)}
                style={styles.likesButton}
              >
                <Text style={styles.likesButtonText}>
                  {post.likes} {post.likes === 1 ? 'like' : 'likov'}
                </Text>
              </TouchableOpacity>
            )}
            {post.likes > 0 && likedUsers.length === 0 && (
               <View style={styles.likesButton}>
                <Text style={styles.likesButtonText}>
                  {post.likes} {post.likes === 1 ? 'like' : 'likov'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Komentáre ({post.comments.length})
          </Text>

          {post.comments?.map((comment) => {
            const isCommentLiked = !!((comment as any)?.likedByMe ?? (comment as any)?.isLiked ?? comment.likedBy?.includes(user.id) ?? false);
            return (
              <View key={comment.id} style={styles.commentCard}>
                <TouchableOpacity
                  onPress={() => handleUserClick(comment.userId)}
                  style={styles.commentHeader}
                >
                  <Avatar uri={comment.userAvatar} name={comment.userName} size={32} />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUserName}>{comment.userName}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    <View style={styles.commentFooter}>
                      <Text style={styles.commentTime}>
                        {new Date(comment.timestamp).toLocaleTimeString('sk-SK', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      {comment.likes > 0 && (
                        <Text style={styles.commentLikes}>
                          {comment.likes} {comment.likes === 1 ? 'like' : 'likov'}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleLikeComment(comment.id)}
                  style={styles.commentLikeButton}
                >
                  <Ionicons
                    name={isCommentLiked ? 'flash' : 'flash-outline'}
                    size={16}
                    color={isCommentLiked ? colors.tertiary : '#64748b'}
                  />
                </TouchableOpacity>
              </View>
            );
          })}

          {post.comments.length === 0 && (
            <Text style={styles.noComments}>Zatiaľ žiadne komentáre</Text>
          )}
        </View>
        </KeyboardAwareScrollView>
      </KeyboardGestureArea>

      {/* Comment Input */}
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={styles.commentInputContainer}>
          <Avatar uri={user.avatar} name={user.name} size={32} />
          <TextInput
            style={styles.commentInput}
            placeholder="Napíš komentár..."
            placeholderTextColor={colors.textDisabled}
            value={commentText}
            onChangeText={setCommentText}
            onFocus={() => {
              // Scroll na koniec zoznamu keď sa klikne na input
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }}
            multiline
          />
          <TouchableOpacity
            onPress={handleComment}
            disabled={!commentText.trim()}
            style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
          >
            <Ionicons
              name="send"
              size={20}
              color={commentText.trim() ? colors.gold : colors.textDisabled}
            />
          </TouchableOpacity>
        </View>
      </KeyboardStickyView>

      {/* Likes Modal */}
      <Modal
        visible={showLikesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLikesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lajkovali</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.likesList}>
              {likedUsers.map((likedUser) => (
                <TouchableOpacity
                  key={likedUser.id}
                  onPress={() => {
                    setShowLikesModal(false);
                    handleUserClick(likedUser.id);
                  }}
                  style={styles.likeUserItem}
                >
                  <Image source={{ uri: likedUser.avatar }} style={styles.likeUserAvatar} />
                  <Text style={styles.likeUserName}>{likedUser.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  backButton: {
    padding: 8,
    marginLeft: -8
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  contentWrapper: {
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 16
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12
  },
  postAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155'
  },
  postAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  postAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  postHeaderText: {
    flex: 1
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary
  },
  postTime: {
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: 2
  },
  postContent: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
    marginBottom: 12
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#334155'
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionButtonActive: {},
  actionText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '600'
  },
  actionTextActive: {
    color: colors.tertiary
  },
  likesButton: {
    marginLeft: 'auto'
  },
  likesButtonText: {
    fontSize: 12,
    color: colors.textDisabled
  },
  commentsSection: {
    marginTop: 8
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16
  },
  commentCard: {
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12
  },
  commentHeader: {
    flexDirection: 'row',
    gap: 12,
    flex: 1
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155'
  },
  commentAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  commentContent: {
    flex: 1
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4
  },
  commentText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    marginBottom: 4
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4
  },
  commentTime: {
    fontSize: 11,
    color: colors.textDisabled
  },
  commentLikes: {
    fontSize: 11,
    color: colors.textDisabled
  },
  commentLikeButton: {
    padding: 8,
    marginTop: -8,
    marginRight: -8
  },
  noComments: {
    fontSize: 14,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: 24
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12
  },
  commentInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155'
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
    maxHeight: 100
  },
  sendButton: {
    padding: 8
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  likesList: {
    maxHeight: 400
  },
  likeUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  likeUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155'
  },
  likeUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary
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
  }
});

