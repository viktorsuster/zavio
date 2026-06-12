import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../constants/colors';
import Button from '../components/Button';
import { useUser } from '../contexts/UserContext';
import { apiService } from '../services/api';
import { storageService } from '../storage';

export default function EditAccountScreen() {
  const navigation = useNavigation();
  const { user, refetch } = useUser();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; phone?: string | null }) => apiService.updateProfile(data),
    onSuccess: async (response) => {
      const merged = { ...response.user, followCounts: response.followCounts };
      storageService.setUser(merged);
      queryClient.setQueryData(['user'], merged);
      await refetch();
      Alert.alert('Uložené', 'Údaje konta boli uložené.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (error: any) => {
      Alert.alert('Chyba', error.message || 'Nepodarilo sa uložiť údaje. Skúste to znova.');
    },
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      'Zmazať účet',
      'Trvalo stratíš prístup k účtu a osobné údaje sa odstránia z aplikácie. Túto akciu nie je možné vrátiť späť.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteAccount();
              storageService.clearAll();
              queryClient.setQueryData(['user'], null);
              queryClient.invalidateQueries({ queryKey: ['user'] });
              Alert.alert('Účet bol zmazaný', 'Tvoj účet bol úspešne zmazaný.');
            } catch (error: any) {
              Alert.alert('Chyba', error?.message || 'Účet sa nepodarilo zmazať.');
            }
          }
        }
      ]
    );
  };

  if (!user) return null;

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const hasChanges = trimmedName !== user.name || trimmedPhone !== (user.phone ?? '');

  const handleSave = () => {
    if (trimmedName.length === 0) {
      Alert.alert('Chyba', 'Meno nemôže byť prázdne.');
      return;
    }

    const data: { name?: string; phone?: string | null } = {};
    if (trimmedName !== user.name) data.name = trimmedName;
    if (trimmedPhone !== (user.phone ?? '')) data.phone = trimmedPhone || null;

    updateProfileMutation.mutate(data);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upraviť konto</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Meno</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tvoje meno"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
            maxLength={255}
          />

          <Text style={styles.fieldLabel}>Telefónne číslo</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+421 9xx xxx xxx"
            placeholderTextColor={colors.textDisabled}
            keyboardType="phone-pad"
            maxLength={50}
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{user.email}</Text>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textDisabled} />
          </View>
          <Text style={styles.fieldHint}>Email zatiaľ nie je možné zmeniť.</Text>

          <Button
            variant="primary"
            onPress={handleSave}
            style={styles.saveButton}
            isLoading={updateProfileMutation.isPending}
            disabled={updateProfileMutation.isPending || !hasChanges}
          >
            Uložiť
          </Button>

          <TouchableOpacity
            style={styles.deleteAccountLink}
            onPress={handleDeleteAccount}
            disabled={updateProfileMutation.isPending}
          >
            <Text style={styles.deleteAccountLinkText}>Zmazať účet</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  flex: {
    flex: 1
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
    flexGrow: 1,
    padding: 24
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 20
  },
  inputDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.6,
    marginBottom: 8
  },
  inputDisabledText: {
    fontSize: 16,
    color: colors.textSecondary
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textDisabled,
    marginBottom: 20
  },
  saveButton: {
    marginTop: 'auto'
  },
  deleteAccountLink: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8
  },
  deleteAccountLinkText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600'
  }
});
