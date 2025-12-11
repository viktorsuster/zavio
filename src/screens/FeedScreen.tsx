import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { Post, User } from '../types';
import { storageService } from '../storage';
import { INITIAL_POSTS, MOCK_USER } from '../constants';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList } from '../navigation/AppNavigator';
import { RootStackParamList } from '../navigation/AppNavigator';

type FeedScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Feed'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function FeedScreen() {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [newPostContent, setNewPostContent] = useState('');

  useEffect(() => {
    const savedUser = storageService.getUser();
    const savedPosts = storageService.getPosts();
    setUser(savedUser || MOCK_USER);
    
    // Ensure all posts have required fields
    const postsWithDefaults = (savedPosts.length > 0 ? savedPosts : INITIAL_POSTS).map((post) => ({
      ...post,
      likedBy: post.likedBy || [],
      comments: post.comments || [],
      likes: post.likedBy?.length || post.likes || 0
    }));
    setPosts(postsWithDefaults);
    
    // Update storage if posts were missing fields
    if (savedPosts.length > 0) {
      const needsUpdate = savedPosts.some((p) => !p.likedBy || !p.comments);
      if (needsUpdate) {
        storageService.setPosts(postsWithDefaults);
      }
    }
  }, []);

  const handlePost = () => {
    if (!newPostContent.trim() || !user) return;

    const newPost: Post = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content: newPostContent,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      comments: []
    };

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    storageService.setPosts(updatedPosts);
    setNewPostContent('');
  };

  const handleLike = (postId: string) => {
    if (!user) return;
    
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isLiked = post.likedBy.includes(user.id);
    const updatedLikedBy = isLiked
      ? post.likedBy.filter((id) => id !== user.id)
      : [...post.likedBy, user.id];

    const updatedPost: Post = {
      ...post,
      likes: updatedLikedBy.length,
      likedBy: updatedLikedBy
    };

    const updatedPosts = posts.map((p) => (p.id === postId ? updatedPost : p));
    setPosts(updatedPosts);
    storageService.setPosts(updatedPosts);
  };


  const handleUserClick = (userId: string) => {
    if (userId === user?.id) {
      // Navigate to profile tab
      (navigation as any).getParent()?.navigate('Profile');
    } else {
      (navigation as any).getParent()?.navigate('PublicProfile', { userId });
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Komunita</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            style={styles.searchButton}
          >
            <Ionicons name="search" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>

        <View style={styles.newPostContainer}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <TextInput
            style={styles.textInput}
            placeholder="Ako sa ti dnes hralo?"
            placeholderTextColor="#64748b"
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
            numberOfLines={3}
          />
        </View>
        <Button
          onPress={handlePost}
          disabled={!newPostContent.trim()}
          style={styles.postButton}
        >
          Zdieľať
        </Button>

        <View style={styles.postsContainer}>
          {posts.map((post) => {
              const isLiked = user ? post.likedBy.includes(user.id) : false;
              return (
                <TouchableOpacity
                  key={post.id}
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
                    <Image source={{ uri: post.userAvatar }} style={styles.postAvatar} />
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
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isLiked ? '#ef4444' : '#94a3b8'}
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
                      <Text style={styles.actionCount}>{post.comments.length}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 100
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  searchButton: {
    padding: 8
  },
  newPostContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top'
  },
  postButton: {
    marginBottom: 24
  },
  postsContainer: {
    gap: 16
  },
  postCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#334155'
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155'
  },
  postHeaderText: {
    flex: 1
  },
  postUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  postTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  postContent: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    marginBottom: 12
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionCount: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600'
  },
  actionCountActive: {
    color: '#ef4444'
  }
});

