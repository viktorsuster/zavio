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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Post, User } from '../types';
import { storageService } from '../storage';
import { INITIAL_POSTS, MOCK_ALL_USERS } from '../constants';
import { colors } from '../constants/colors';

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const savedPosts = storageService.getPosts();
    const allPosts = savedPosts.length > 0 ? savedPosts : INITIAL_POSTS;
    setPosts(allPosts);
    setUsers(MOCK_ALL_USERS);
  }, []);

  const filteredPosts = searchQuery.trim()
    ? posts.filter(
        (post) =>
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredUsers = searchQuery.trim()
    ? users.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleUserClick = (userId: string) => {
    (navigation as any).getParent()?.navigate('PublicProfile', { userId });
  };

  const handlePostClick = (postId: string) => {
    navigation.navigate('PostDetail', { postId });
  };

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

      {searchQuery.trim() ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Users Results */}
          {filteredUsers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ľudia</Text>
              {filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleUserClick(user.id)}
                  style={styles.userCard}
                >
                  <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Posts Results */}
          {filteredPosts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Príspevky</Text>
              {filteredPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  onPress={() => handlePostClick(post.id)}
                  style={styles.postCard}
                >
                  <View style={styles.postHeader}>
                    <Image source={{ uri: post.userAvatar }} style={styles.postAvatar} />
                    <View style={styles.postHeaderText}>
                      <Text style={styles.postUserName}>{post.userName}</Text>
                      <Text style={styles.postTime}>
                        {new Date(post.timestamp).toLocaleDateString('sk-SK', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.postContent} numberOfLines={2}>
                    {post.content}
                  </Text>
                  {post.image && (
                    <Image source={{ uri: post.image }} style={styles.postImage} />
                  )}
                  <View style={styles.postFooter}>
                    <View style={styles.postAction}>
                      <Ionicons name="heart-outline" size={16} color="#94a3b8" />
                      <Text style={styles.postActionText}>{post.likes}</Text>
                    </View>
                    <View style={styles.postAction}>
                      <Ionicons name="chatbubble-outline" size={16} color="#94a3b8" />
                      <Text style={styles.postActionText}>{post.comments.length}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {filteredUsers.length === 0 && filteredPosts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#64748b" />
              <Text style={styles.emptyStateText}>Žiadne výsledky</Text>
              <Text style={styles.emptyStateSubtext}>
                Skús iný vyhľadávací výraz
              </Text>
            </View>
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
            <Text style={styles.emptyStateSubtext}>
              Môžeš vyhľadávať ľudí alebo príspevky
            </Text>
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
    color: colors.textPrimary,
    marginBottom: 4
  },
  userEmail: {
    fontSize: 12,
    color: colors.textDisabled
  },
  postCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary
  },
  postHeaderText: {
    flex: 1
  },
  postUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2
  },
  postTime: {
    fontSize: 11,
    color: colors.textDisabled
  },
  postContent: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    marginBottom: 8
  },
  postImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.backgroundTertiary
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  postActionText: {
    fontSize: 12,
    color: colors.textTertiary
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

