import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { User, SkillLevel } from '../types';
import { MOCK_ALL_USERS } from '../constants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type PublicProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PublicProfile'
>;

const getSkillColor = (level: SkillLevel) => {
  switch (level) {
    case 'Pro':
      return { bg: '#a855f7', text: '#fff', border: '#9333ea' };
    case 'Pokročilý':
      return { bg: '#10b981', text: '#fff', border: '#059669' };
    case 'Mierne pokročilý':
      return { bg: '#3b82f6', text: '#fff', border: '#2563eb' };
    default:
      return { bg: '#475569', text: '#e2e8f0', border: '#64748b' };
  }
};

export default function PublicProfileScreen() {
  const navigation = useNavigation<PublicProfileScreenNavigationProp>();
  const route = useRoute();
  const { userId } = route.params as { userId: string };
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const foundUser = MOCK_ALL_USERS.find((u) => u.id === userId);
    setUser(foundUser || null);
  }, [userId]);

  if (!user) {
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#94a3b8" />
          <Text style={styles.backText}>Späť</Text>
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>Hráč</Text>
        </View>

        <View style={styles.skillsSection}>
          <View style={styles.skillsHeader}>
            <Ionicons name="fitness-outline" size={16} color="#94a3b8" />
            <Text style={styles.skillsTitle}>Schopnosti</Text>
          </View>
          {Object.keys(user.skills).length === 0 ? (
            <Text style={styles.emptySkillsText}>
              Hráč zatiaľ neuviedol žiadne schopnosti.
            </Text>
          ) : (
            <View style={styles.skillsList}>
              {Object.entries(user.skills).map(([sport, level]) => {
                const colors = getSkillColor(level);
                return (
                  <View key={sport} style={styles.skillItem}>
                    <Text style={styles.skillName}>{sport}</Text>
                    <View
                      style={[
                        styles.skillBadge,
                        {
                          backgroundColor: colors.bg,
                          borderColor: colors.border
                        }
                      ]}
                    >
                      <Text style={[styles.skillLevel, { color: colors.text }]}>
                        {level}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Zápasov</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Spoľahlivosť</Text>
          </View>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4
  },
  backText: {
    fontSize: 16,
    color: '#94a3b8'
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
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: '#1e293b'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  userRole: {
    fontSize: 14,
    color: '#94a3b8'
  },
  skillsSection: {
    backgroundColor: '#1e293b',
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
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  emptySkillsText: {
    fontSize: 14,
    color: '#64748b'
  },
  skillsList: {
    gap: 12
  },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  skillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1
  },
  skillLevel: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase'
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 48
  }
});

