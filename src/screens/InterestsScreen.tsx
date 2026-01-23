import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import Button from '../components/Button';
import { useUser } from '../contexts/UserContext';
import { apiService } from '../services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storageService } from '../storage';

const AVAILABLE_INTERESTS = ['Futbal', 'Tenis', 'Padel', 'Basketbal', 'Bedminton', 'Volejbal', 'Florbal'];

export default function InterestsScreen() {
  const navigation = useNavigation();
  const { user, updateUser, refetch } = useUser();
  const queryClient = useQueryClient();

  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => apiService.getSports(),
    staleTime: 1000 * 60 * 60, // 1 hodina
    retry: 1,
  });

  const availableInterests = sportsData?.data || AVAILABLE_INTERESTS;

  const initial = useMemo(() => (user?.interests ?? []).slice(), [user?.interests]);
  const [draftInterests, setDraftInterests] = useState<string[]>(initial);

  useEffect(() => {
    setDraftInterests(initial);
  }, [initial]);

  if (!user) return null;

  const toggleInterest = (sport: string) => {
    setDraftInterests((prev) => (prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]));
  };

  const updateInterestsMutation = useMutation({
    mutationFn: (interests: string[]) => apiService.updateInterests(interests),
    onSuccess: async (response) => {
      // Aktualizovať storage
      storageService.setUser(response.user);
      // Aktualizovať cache priamo s fresh dátami z API
      queryClient.setQueryData(['user'], response.user);
      // Explicitne refetch z API, aby sme mali najnovšie dáta (vrátane interests)
      await refetch();
      Alert.alert('Uložené', 'Záujmy boli uložené.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (error: any) => {
      Alert.alert('Chyba', error.message || 'Nepodarilo sa uložiť záujmy. Skúste to znova.');
    },
  });

  const handleSave = () => {
    const sortedInterests = [...new Set(draftInterests)].sort((a, b) => a.localeCompare(b, 'sk'));
    updateInterestsMutation.mutate(sortedInterests);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Záujmy</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Vyber športy, o ktoré sa zaujímaš:</Text>

        <View style={styles.interestsWrap}>
          {availableInterests.map((sport) => {
            const selected = draftInterests.includes(sport);
            return (
              <TouchableOpacity
                key={sport}
                onPress={() => toggleInterest(sport)}
                style={[styles.interestOption, selected && styles.interestOptionSelected]}
                activeOpacity={0.85}
              >
                <Text style={[styles.interestOptionText, selected && styles.interestOptionTextSelected]}>
                  {sport}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button 
          variant="primary" 
          onPress={handleSave} 
          style={styles.saveButton}
          isLoading={updateInterestsMutation.isPending}
          disabled={updateInterestsMutation.isPending}
        >
          Uložiť
        </Button>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  closeButton: {
    padding: 8,
    marginLeft: -8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  content: {
    flex: 1,
    padding: 24
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center'
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center'
  },
  interestOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border
  },
  interestOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  interestOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary
  },
  interestOptionTextSelected: {
    color: '#000'
  },
  saveButton: {
    marginTop: 'auto'
  }
});



