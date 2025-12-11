import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardStickyView, KeyboardGestureArea, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Post, User, Comment } from '../types';
import { storageService } from '../storage';
import { MOCK_USER, MOCK_ALL_USERS, INITIAL_POSTS } from '../constants';

type PostDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PostDetail'>;
type PostDetailScreenRouteProp = {
  params: { postId: string };
};

export default function PostDetailScreen() {
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const route = useRoute<PostDetailScreenRouteProp>();
  const { postId } = route.params;

  const [post, setPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showLikesModal, setShowLikesModal] = useState(false);

  useEffect(() => {
    const savedUser = storageService.getUser();
    const savedPosts = storageService.getPosts();
    const allPosts = savedPosts.length > 0 ? savedPosts : INITIAL_POSTS;
    setUser(savedUser || MOCK_USER);
    
    const foundPost = allPosts.find((p) => p.id === postId);
    if (foundPost) {
      // Ensure post has all required fields
      const postWithDefaults: Post = {
        ...foundPost,
        likedBy: foundPost.likedBy || [],
        comments: (foundPost.comments || []).map((comment) => ({
          ...comment,
          likes: comment.likes || 0,
          likedBy: comment.likedBy || []
        })),
        likes: foundPost.likedBy?.length || foundPost.likes || 0
      };
      setPost(postWithDefaults);
    }
  }, [postId]);

  const handleLike = () => {
    if (!post || !user) return;
    
    const isLiked = post.likedBy.includes(user.id);
    const updatedLikedBy = isLiked
      ? post.likedBy.filter((id) => id !== user.id)
      : [...post.likedBy, user.id];

    const updatedPost: Post = {
      ...post,
      likes: updatedLikedBy.length,
      likedBy: updatedLikedBy
    };

    const savedPosts = storageService.getPosts();
    const updatedPosts = savedPosts.map((p) => (p.id === postId ? updatedPost : p));
    storageService.setPosts(updatedPosts);
    setPost(updatedPost);
  };

  const handleComment = () => {
    if (!commentText.trim() || !post || !user) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content: commentText.trim(),
      timestamp: Date.now(),
      likes: 0,
      likedBy: []
    };

    const updatedPost: Post = {
      ...post,
      comments: [...post.comments, newComment]
    };

    const savedPosts = storageService.getPosts();
    const updatedPosts = savedPosts.map((p) => (p.id === postId ? updatedPost : p));
    storageService.setPosts(updatedPosts);
    setPost(updatedPost);
    setCommentText('');
  };

  const handleLikeComment = (commentId: string) => {
    if (!post || !user) return;
    
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) return;

    const isLiked = comment.likedBy.includes(user.id);
    const updatedLikedBy = isLiked
      ? comment.likedBy.filter((id) => id !== user.id)
      : [...comment.likedBy, user.id];

    const updatedComments = post.comments.map((c) =>
      c.id === commentId
        ? {
            ...c,
            likes: updatedLikedBy.length,
            likedBy: updatedLikedBy
          }
        : c
    );

    const updatedPost: Post = {
      ...post,
      comments: updatedComments
    };

    const savedPosts = storageService.getPosts();
    const updatedPosts = savedPosts.map((p) => (p.id === postId ? updatedPost : p));
    storageService.setPosts(updatedPosts);
    setPost(updatedPost);
  };

  const handleUserClick = (userId: string) => {
    if (userId === user?.id) {
      (navigation as any).getParent()?.navigate('Profile');
    } else {
      (navigation as any).getParent()?.navigate('PublicProfile', { userId });
    }
  };

  if (!user) {
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
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
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

  const isLiked = post.likedBy.includes(user.id);
  const likedUsers = MOCK_ALL_USERS.filter((u) => post.likedBy.includes(u.id));

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
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bottomOffset={0}
        >
        {/* Post Content */}
        <View>
          <TouchableOpacity
            onPress={() => handleUserClick(post.userId)}
            style={styles.postHeader}
          >
            <Image source={{ uri: post.userAvatar }} style={styles.postAvatar} />
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
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? '#ef4444' : '#94a3b8'}
              />
              <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                {post.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#94a3b8" />
              <Text style={styles.actionText}>{post.comments.length}</Text>
            </TouchableOpacity>

            {post.likes > 0 && (
              <TouchableOpacity
                onPress={() => setShowLikesModal(true)}
                style={styles.likesButton}
              >
                <Text style={styles.likesButtonText}>
                  {post.likes} {post.likes === 1 ? 'like' : 'likov'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Komentáre ({post.comments.length})
          </Text>

          {post.comments.map((comment) => {
            const isCommentLiked = comment.likedBy.includes(user.id);
            return (
              <View key={comment.id} style={styles.commentCard}>
                <TouchableOpacity
                  onPress={() => handleUserClick(comment.userId)}
                  style={styles.commentHeader}
                >
                  <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatar} />
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
                    name={isCommentLiked ? 'heart' : 'heart-outline'}
                    size={16}
                    color={isCommentLiked ? '#ef4444' : '#64748b'}
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
          <Image source={{ uri: user.avatar }} style={styles.commentInputAvatar} />
          <TextInput
            style={styles.commentInput}
            placeholder="Napíš komentár..."
            placeholderTextColor="#64748b"
            value={commentText}
            onChangeText={setCommentText}
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
              color={commentText.trim() ? '#10b981' : '#64748b'}
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
    backgroundColor: '#0f172a'
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
    color: '#fff',
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
  postHeaderText: {
    flex: 1
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  postTime: {
    fontSize: 12,
    color: '#64748b',
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
    color: '#94a3b8',
    fontWeight: '600'
  },
  actionTextActive: {
    color: '#ef4444'
  },
  likesButton: {
    marginLeft: 'auto'
  },
  likesButtonText: {
    fontSize: 12,
    color: '#64748b'
  },
  commentsSection: {
    marginTop: 8
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
  commentContent: {
    flex: 1
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    color: '#64748b'
  },
  commentLikes: {
    fontSize: 11,
    color: '#64748b'
  },
  commentLikeButton: {
    padding: 8,
    marginTop: -8,
    marginRight: -8
  },
  noComments: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 24
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
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
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
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
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155'
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
    color: '#fff'
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
    color: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16
  }
});

