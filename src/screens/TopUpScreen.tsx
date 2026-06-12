import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '../constants/colors';
import { apiService } from '../services/api';
import { KREDITA_BALANCE_QUERY_KEY } from '../hooks/useKreditaBalance';
import Button from '../components/Button';

export default function TopUpScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [selectedAmount, setSelectedAmount] = useState(20);
  const [isPaying, setIsPaying] = useState(false);

  // 0.01 = testovací cent na overenie reálnej platby cez 24-pay
  const PRESET_AMOUNTS = [10, 15, 20, 30, 50, 100, 0.01];

  const handlePayment = async () => {
    setIsPaying(true);
    apiService.sendKreditaLog('topup_started', { amount: selectedAmount });
    try {
      // Deeplink, na ktorý KREDITA presmeruje browser po platbe (referer) —
      // openAuthSessionAsync ho zachytí a sám zavrie browser.
      const returnUrl = Linking.createURL('kredita-return');
      const form = await apiService.getKreditaTopUpForm({ amount: selectedAmount, returnUrl });
      apiService.sendKreditaLog('topup_form_received', {
        keys: Object.keys(form),
        preview: JSON.stringify(form).slice(0, 500),
      });

      // Tvar odpovede z KREDITA /payment/24form ešte nie je potvrdený —
      // ak príde URL, otvoríme platobnú bránu, inak zatiaľ zobrazíme čo prišlo.
      const paymentUrl = form.url || form.redirect_url || form.payment_url;
      if (paymentUrl) {
        apiService.sendKreditaLog('opening_browser', { paymentUrl, returnUrl });
        const browserResult = await WebBrowser.openAuthSessionAsync(paymentUrl, returnUrl);
        apiService.sendKreditaLog('browser_closed', browserResult);
        queryClient.invalidateQueries({ queryKey: KREDITA_BALANCE_QUERY_KEY });
        const { credit } = await apiService.getKreditaBalance();
        // Balance sync prepísal users.credits — obnoviť aj profil (booking z neho číta kredity)
        queryClient.invalidateQueries({ queryKey: ['user'] });
        Alert.alert(
          'Platba dokončená?',
          `Aktuálny zostatok kreditov: ${Number(credit).toFixed(2)}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Odpoveď platobnej brány',
          (form.html ? form.html.slice(0, 600) : JSON.stringify(form).slice(0, 600)) || 'Prázdna odpoveď'
        );
      }
    } catch (error: any) {
      apiService.sendKreditaLog('topup_error', { message: error?.message });
      Alert.alert('Chyba', error.message || 'Nepodarilo sa otvoriť platbu.');
    } finally {
      setIsPaying(false);
    }
  };

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
        <Text style={styles.headerTitle}>Dobiť kredit</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Vyberte sumu, ktorú chcete dobiť:</Text>
        
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
              <Text style={[
                styles.amountButtonText,
                selectedAmount === amount && styles.amountButtonTextSelected
              ]}>
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
          disabled={isPaying}
          isLoading={isPaying}
          variant="primary"
          style={styles.payButton}
        >
          Zaplatiť {selectedAmount} €
        </Button>
        
        <View style={styles.infoSection}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.textTertiary} />
          <Text style={styles.infoText}>Bezpečná platba cez Apple Pay / Google Pay</Text>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center'
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
    justifyContent: 'center'
  },
  amountButton: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  amountButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  amountButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  amountButtonTextSelected: {
    color: '#000', // Black text on Gold/Primary
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  payButton: {
    marginTop: 'auto',
    marginBottom: 24
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    opacity: 0.7
  },
  infoText: {
    fontSize: 12,
    color: colors.textTertiary
  }
});




