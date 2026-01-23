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
import { colors } from '../constants/colors';
import { useUser } from '../contexts/UserContext';
import Button from '../components/Button';

export default function TopUpScreen() {
  const navigation = useNavigation();
  const { topUpCreditsMutation } = useUser();
  const [selectedAmount, setSelectedAmount] = useState(20);

  const PRESET_AMOUNTS = [10, 15, 20, 30, 50, 100];

  const handlePayment = () => {
    topUpCreditsMutation.mutate(selectedAmount, {
      onSuccess: (response) => {
        Alert.alert(
          'Úspech', 
          `Kredity boli úspešne dobité. Nový zostatok: ${response.user.credits.toFixed(2)} €`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      },
      onError: (error: any) => {
        Alert.alert('Chyba', error.message || 'Nepodarilo sa dobiť kredity.');
      }
    });
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
          disabled={topUpCreditsMutation.isPending}
          isLoading={topUpCreditsMutation.isPending}
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




