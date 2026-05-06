import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Avatar from '../components/Avatar';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { useAuthGate } from '../hooks/useAuthGate';
import { promptLoginToContinue } from '../utils/authPrompt';

type PublicProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PublicProfile'
>;

export default function PublicProfileScreen() {
  const navigation = useNavigation<PublicProfileScreenNavigationProp>();
  const route = useRoute();
  const { userId } = route.params as { userId: string };
  const { isGuest } = useAuthGate();
  const [openingChat, setOpeningChat] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => apiService.getPublicProfile(userId),
    enabled: !!userId,
  });

  const user = data?.user;
  const stats = (data as any)?.stats; // stats môže byť v response, ak ho backend posiela

  const handleOpenChat = React.useCallback(async () => {
    if (isGuest) {
      promptLoginToContinue('Prihlásenie', 'Správy sú dostupné po prihlásení.');
      return;
    }
    if (!user?.id || openingChat) return;
    setOpeningChat(true);
    try {
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
    } catch (error) {
      console.error('Open chat from profile error:', error);
    } finally {
      setOpeningChat(false);
    }
  }, [isGuest, navigation, openingChat, user?.id]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
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
    });
  }, [navigation, handleOpenChat, openingChat]);

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar uri={user.avatar} name={user.name} size={92} />
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>Hráč</Text>
        </View>

        <View style={styles.skillsSection}>
          <View style={styles.skillsHeader}>
            <Ionicons name="heart-outline" size={16} color="#94a3b8" />
            <Text style={styles.skillsTitle}>Záujmy</Text>
          </View>
          {(user.interests ?? []).length === 0 ? (
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

