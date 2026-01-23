import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { useUser } from '../contexts/UserContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import Button from '../components/Button';
import Avatar from '../components/Avatar';

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const createPostMutation = useMutation({
    mutationFn: (data: { content: string }) => apiService.createPost(data.content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigation.goBack();
    },
    onError: (error: any) => {
      console.error('Error creating post:', error);
      Alert.alert('Chyba', error.message || 'Nepodarilo sa vytvoriť príspevok. Skúste to prosím znova.');
    }
  });

  const handlePost = () => {
    if (!content.trim() || !user) return;
    createPostMutation.mutate({ content: content.trim() });
  };

  const isSubmitting = createPostMutation.isPending;

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nový príspevok</Text>
        <Button
          onPress={handlePost}
          disabled={!content.trim() || isSubmitting}
          isLoading={isSubmitting}
          style={styles.postButton}
          variant="primary"
        >
          Zverejniť
        </Button>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.userInfo}>
          <Avatar uri={user.avatar} name={user.name} size={48} />
          <Text style={styles.userName}>{user.name}</Text>
        </View>

        <TextInput
          style={styles.textInput}
          placeholder="Čo máš dnes na mysli?"
          placeholderTextColor={colors.textDisabled}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          textAlignVertical="top"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  postButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 100,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
});

