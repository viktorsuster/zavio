import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../components/Button';
import { storageService } from '../storage';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/AppNavigator';
import { useUser } from '../contexts/UserContext';
import { colors } from '../constants/colors';
import Avatar from '../components/Avatar';

type ProfileScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user } = useUser();

  const queryClient = useQueryClient();

  const currentInterests = user?.interests ?? [];
  
  const handleLogout = () => {
    storageService.clearAll();
    // Invalidovať user query
    queryClient.setQueryData(['user'], null);
    queryClient.invalidateQueries({ queryKey: ['user'] });
    (navigation as any).getParent()?.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Môj Profil</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar uri={user.avatar} name={user.name} size={92} />
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        <View style={styles.creditCard}>
          <Text style={styles.creditLabel}>Zostatok peňaženky</Text>
          <Text style={styles.creditAmount}>
            {user.credits.toFixed(2)} <Text style={styles.creditCurrency}>€</Text>
          </Text>
          <Button
            onPress={() => navigation.navigate('TopUp' as any)}
            variant="secondary"
            style={styles.topUpButton}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.topUpButtonText}> Dobiť kredit</Text>
          </Button>
        </View>

        <View style={styles.skillsSection}>
          <View style={styles.skillsHeader}>
            <Text style={styles.skillsTitle}>Moje záujmy</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Interests' as any)}>
              <Text style={styles.editButton}>Upraviť</Text>
            </TouchableOpacity>
          </View>

          {currentInterests.length === 0 ? (
            <View style={styles.emptySkills}>
              <Text style={styles.emptySkillsText}>
                Zatiaľ nemáš zvolené žiadne záujmy.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Interests' as any)}>
                <Text style={styles.addSkillButton}>Pridať záujmy +</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.interestsWrap}>
              {currentInterests.map((sport) => (
                <View key={sport} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{sport}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* settings section removed */}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 20
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
    backgroundColor: colors.gold,
    marginBottom: 16
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: colors.backgroundSecondary
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: colors.textTertiary
  },
  creditCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border
  },
  creditLabel: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 8
  },
  creditAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 24
  },
  creditCurrency: {
    fontSize: 20,
    color: colors.gold
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  topUpButtonText: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  skillsSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border
  },
  skillsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  skillsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  editButton: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: 'bold'
  },
  emptySkills: {
    alignItems: 'center',
    paddingVertical: 16
  },
  emptySkillsText: {
    fontSize: 14,
    color: colors.textDisabled,
    marginBottom: 8
  },
  addSkillButton: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '600'
  },
  skillsList: {
    gap: 12
  },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary
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
  settingsSection: {
    gap: 8
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  settingText: {
    fontSize: 16,
    color: '#e2e8f0'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  amountButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  amountButtonSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary
  },
  amountButtonTextSelected: {
    color: '#fff'
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginBottom: 16
  },
  totalLabel: {
    fontSize: 14,
    color: '#94a3b8'
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  payButton: {
    backgroundColor: '#635BFF'
  },
  successView: {
    alignItems: 'center',
    paddingVertical: 24
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  successText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24
  },
  successButton: {
    minWidth: 200
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
    borderColor: colors.border
  },
  interestChipText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13
  },

  interestsPickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  interestOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  interestOptionSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.goldDark
  },
  interestOptionText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13
  },
  interestOptionTextSelected: {
    color: '#000'
  }
});

