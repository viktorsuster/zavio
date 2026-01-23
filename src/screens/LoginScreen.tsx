import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/Button';
import { storageService } from '../storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, LoginRequest, RegisterRequest } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';
import { colors } from '../constants/colors';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  onLogin?: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => apiService.login(data),
    onSuccess: (response) => {
      console.log('[LoginScreen] Login success, saving token and user...');
      // Map API response to our User type
      const user: User = {
        id: response.user.id.toString(),
        name: response.user.name,
        email: response.user.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(response.user.name)}&background=000000&color=fff`,
        credits: response.user.credits || 0
      };

      storageService.setToken(response.token);
      storageService.setUser(user);
      
      // Aktualizovať user v query cache
      queryClient.setQueryData<User | null>(['user'], user);
      
      console.log('[LoginScreen] Token and user saved, navigating...');

      if (onLogin) {
        onLogin();
      } else {
        navigation.replace('Main');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Chyba prihlásenia', error.message || 'Nesprávny email alebo heslo');
    }
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => apiService.register(data),
    onSuccess: (response) => {
      console.log('[LoginScreen] Register success, saving token and user...');
      // Map API response to our User type
      const user: User = {
        id: response.user.id.toString(),
        name: response.user.name,
        email: response.user.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(response.user.name)}&background=000000&color=fff`,
        credits: parseFloat(response.user.credits) || 0
      };

      storageService.setToken(response.token);
      storageService.setUser(user);
      
      // Aktualizovať user v query cache
      queryClient.setQueryData<User | null>(['user'], user);
      
      console.log('[LoginScreen] Token and user saved, navigating...');

      if (onLogin) {
        onLogin();
      } else {
        navigation.replace('Main');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Chyba registrácie', error.message || 'Nepodarilo sa zaregistrovať');
    }
  });

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Chyba', 'Vyplňte email a heslo');
      return;
    }

    if (isRegister) {
      if (!name.trim() || !phone.trim()) {
        Alert.alert('Chyba', 'Vyplňte všetky polia');
        return;
      }
      registerMutation.mutate({ email, password, name, phone });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>sportvia</Text>
            <Text style={styles.subtitle}>Tvoje ihrisko, tvoja hra</Text>

            <View style={styles.form}>
              {isRegister && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Meno</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Zadajte meno"
                      placeholderTextColor="#6b6b6b"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Telefón</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+421 901 234 567"
                      placeholderTextColor="#6b6b6b"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  placeholderTextColor="#6b6b6b"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Heslo</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Zadajte heslo"
                    placeholderTextColor="#6b6b6b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    variant="ghost"
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#a0a0a0"
                    />
                  </Button>
                </View>
              </View>

              <Button
                fullWidth
                onPress={handleSubmit}
                loading={isLoading}
                style={styles.submitButton}
              >
                {isRegister ? 'Registrovať sa' : 'Prihlásiť sa'}
              </Button>

              <Button
                fullWidth
                variant="ghost"
                onPress={() => setIsRegister(!isRegister)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>
                  {isRegister
                    ? 'Už máte účet? Prihláste sa'
                    : 'Nemáte účet? Zaregistrujte sa'}
                </Text>
              </Button>
            </View>

            <Text style={styles.disclaimer}>
              Pokračovaním súhlasíte s podmienkami používania.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  logoContainer: {
    marginBottom: 40
  },
  logo: {
    width: 140,
    height: 140
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 15,
    color: '#a0a0a0',
    marginBottom: 48,
    textAlign: 'center',
    fontWeight: '400'
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: 16
  },
  inputContainer: {
    gap: 8
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c0c0c0',
    marginBottom: 6,
    letterSpacing: 0.2
  },
  input: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a'
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16
  },
  eyeButton: {
    padding: 8,
    marginRight: 4
  },
  submitButton: {
    marginTop: 8
  },
  toggleButton: {
    marginTop: 8
  },
  toggleText: {
    color: '#a0a0a0',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400'
  },
  disclaimer: {
    marginTop: 32,
    fontSize: 11,
    color: '#6b6b6b',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 16
  }
});
