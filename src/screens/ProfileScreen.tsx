import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/Button';
import { User, SkillLevel } from '../types';
import { storageService } from '../storage';
import { MOCK_USER } from '../constants';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/AppNavigator';
import { apiService } from '../services/api';

type ProfileScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Profile'>;

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

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(20);
  const queryClient = useQueryClient();

  useEffect(() => {
    const savedUser = storageService.getUser();
    setUser(savedUser || MOCK_USER);
  }, []);

  // Top-up credits mutation
  const topUpMutation = useMutation({
    mutationFn: (amount: number) => apiService.topUpCredits(amount),
    onSuccess: (response) => {
      // Update user credits
      if (user) {
        const updatedUser = { ...user, credits: response.user.credits };
        setUser(updatedUser);
        storageService.setUser(updatedUser);
      }
      setShowTopUpModal(false);
      Alert.alert('Úspech', `Kredity boli úspešne dobité. Nový zostatok: ${response.user.credits.toFixed(2)} €`);
    },
    onError: (error: any) => {
      Alert.alert(
        'Chyba',
        error.message || 'Nepodarilo sa dobiť kredity. Skúste to znova.'
      );
    },
  });

  const handleLogout = () => {
    storageService.clearAll();
    (navigation as any).getParent()?.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  };

  const handlePayment = () => {
    topUpMutation.mutate(selectedAmount);
  };

  const closePaymentModal = () => {
    setShowTopUpModal(false);
    setSelectedAmount(20);
  };

  if (!user) return null;

  const PRESET_AMOUNTS = [10, 15, 20, 30, 50, 100];

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
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
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
            onPress={() => setShowTopUpModal(true)}
            variant="secondary"
            style={styles.topUpButton}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.topUpButtonText}> Dobiť kredit</Text>
          </Button>
        </View>

        <View style={styles.skillsSection}>
          <View style={styles.skillsHeader}>
            <Text style={styles.skillsTitle}>Moje Schopnosti</Text>
            <TouchableOpacity>
              <Text style={styles.editButton}>Upraviť</Text>
            </TouchableOpacity>
          </View>
          {Object.keys(user.skills).length === 0 ? (
            <View style={styles.emptySkills}>
              <Text style={styles.emptySkillsText}>
                Zatiaľ nemáš pridané žiadne schopnosti.
              </Text>
              <TouchableOpacity>
                <Text style={styles.addSkillButton}>Pridať šport +</Text>
              </TouchableOpacity>
            </View>
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

        <View style={styles.settingsSection}>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Nastavenia účtu</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>História transakcií</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showTopUpModal}
        transparent
        animationType="slide"
        onRequestClose={closePaymentModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dobiť kredit</Text>
              <TouchableOpacity onPress={closePaymentModal}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Vyberte sumu, ktorú chcete dobiť:</Text>
            <View style={styles.amountGrid}>
              {PRESET_AMOUNTS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  onPress={() => setSelectedAmount(amount)}
                  style={[
                    styles.amountButton,
                    selectedAmount === amount && styles.amountButtonSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.amountButtonText,
                      selectedAmount === amount && styles.amountButtonTextSelected
                    ]}
                  >
                    {amount} €
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Celkom k úhrade:</Text>
              <Text style={styles.totalAmount}>{selectedAmount} €</Text>
            </View>
            <Button
              onPress={handlePayment}
              disabled={topUpMutation.isPending || selectedAmount <= 0}
              loading={topUpMutation.isPending}
              style={styles.payButton}
            >
              Dobiť {selectedAmount} €
            </Button>
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
    backgroundColor: '#10b981',
    marginBottom: 16
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: '#1e293b'
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8'
  },
  creditCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155'
  },
  creditLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8
  },
  creditAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24
  },
  creditCurrency: {
    fontSize: 20,
    color: '#10b981'
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  topUpButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  skillsSection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155'
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
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  editButton: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: 'bold'
  },
  emptySkills: {
    alignItems: 'center',
    paddingVertical: 16
  },
  emptySkillsText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8
  },
  addSkillButton: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600'
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
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  amountButtonSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e2e8f0'
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
  }
});

