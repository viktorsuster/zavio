import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { colors } from '../constants/colors';
import Avatar from './Avatar';

function stopCardBubble(e: GestureResponderEvent) {
  e.stopPropagation();
}

export type FeedPostCardProps = {
  post: Post;
  isLiked: boolean;
  onPressCard: () => void;
  onPressAuthor: () => void;
  onPressLike: () => void;
  onPressComments: () => void;
  contentNumberOfLines?: number;
  /** Ak false, riadok lajkov/komentárov je len informačný (napr. výsledky vyhľadávania). */
  interactiveFooter?: boolean;
  avatarSize?: number;
  formatTimestamp?: (timestamp: number) => string;
};

function defaultFormatTimestamp(ts: number) {
  return new Date(ts).toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function FeedPostCard({
  post,
  isLiked,
  onPressCard,
  onPressAuthor,
  onPressLike,
  onPressComments,
  contentNumberOfLines = 3,
  interactiveFooter = true,
  avatarSize = 40,
  formatTimestamp = defaultFormatTimestamp
}: FeedPostCardProps) {
  const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;

  return (
    <TouchableOpacity onPress={onPressCard} style={styles.postCard} activeOpacity={0.9}>
      <TouchableOpacity onPress={(e) => { stopCardBubble(e); onPressAuthor(); }} style={styles.postHeader}>
        <Avatar uri={post.userAvatar} name={post.userName} size={avatarSize} />
        <View style={styles.postHeaderText}>
          <Text style={styles.postUserName}>{post.userName}</Text>
          <Text style={styles.postTime}>{formatTimestamp(post.timestamp)}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.postContent} numberOfLines={contentNumberOfLines}>
        {post.content}
      </Text>

      {post.image ? (
        <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      <View style={styles.postFooter}>
        {interactiveFooter ? (
          <>
            <TouchableOpacity
              onPress={(e) => {
                stopCardBubble(e);
                onPressLike();
              }}
              style={styles.actionButton}
            >
              <Ionicons
                name={isLiked ? 'flash' : 'flash-outline'}
                size={20}
                color={isLiked ? colors.tertiary : '#94a3b8'}
              />
              <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>{post.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                stopCardBubble(e);
                onPressComments();
              }}
              style={styles.actionButton}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#94a3b8" />
              <Text style={styles.actionCount}>{commentsCount}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.actionButton}>
              <Ionicons
                name={isLiked ? 'flash' : 'flash-outline'}
                size={20}
                color={isLiked ? colors.tertiary : '#94a3b8'}
              />
              <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>{post.likes}</Text>
            </View>
            <View style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#94a3b8" />
              <Text style={styles.actionCount}>{commentsCount}</Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 4
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12
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
    marginBottom: 16
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#334155',
    marginTop: 12,
    marginBottom: 12
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
  }
});
