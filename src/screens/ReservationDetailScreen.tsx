import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import { apiService } from '../services/api';

type ReservationDetailRoute = RouteProp<RootStackParamList, 'ReservationDetail'>;

export default function ReservationDetailScreen() {
  const route = useRoute<ReservationDetailRoute>();
  const queryClient = useQueryClient();
  const bookingId = Number(route.params?.bookingId);
  const booking = route.params?.booking;
  const [loading, setLoading] = useState(true);
  const [splits, setSplits] = useState<any[]>([]);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await apiService.getBookingSplits(bookingId);
        if (mounted) setSplits(response.splits || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (Number.isFinite(bookingId)) void load();
    return () => {
      mounted = false;
    };
  }, [bookingId]);

  const acceptedCount = useMemo(
    () => splits.filter((split) => split.status === 'accepted').length,
    [splits]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{booking?.fieldName || 'Rezervácia'}</Text>
        <Text style={styles.subTitle}>
          {booking?.date ? new Date(booking.date).toLocaleDateString('sk-SK') : ''} {booking?.startTime ? `• ${String(booking.startTime).slice(0, 5)}` : ''}
        </Text>
        <Text style={styles.counter}>Potvrdení hráči: {acceptedCount}/{splits.length}</Text>
      </View>

      <Pressable
        onPress={() => {
          if (!Number.isFinite(bookingId) || cancelling) return;
          Alert.alert('Zrušiť rezerváciu?', 'Naozaj chceš zrušiť túto rezerváciu? Kredity sa vrátia podľa stavu splitov.', [
            { text: 'Nie', style: 'cancel' },
            {
              text: cancelling ? 'Zrušujem...' : 'Áno, zrušiť',
              style: 'destructive',
              onPress: async () => {
                setCancelling(true);
                try {
                  await apiService.cancelBooking(bookingId);
                  queryClient.invalidateQueries({ queryKey: ['user'] });
                  queryClient.invalidateQueries({ queryKey: ['bookings'] });
                  Alert.alert('Hotovo', 'Rezervácia bola zrušená.');
                } catch (error: any) {
                  Alert.alert('Nepodarilo sa zrušiť rezerváciu', error?.message || 'Skús to prosím znova.');
                } finally {
                  setCancelling(false);
                }
              }
            }
          ]);
        }}
        style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
      >
        <Text style={styles.cancelButtonText}>{cancelling ? 'Zrušujem...' : 'Zrušiť rezerváciu'}</Text>
      </Pressable>

      {splits.map((split) => (
        <View key={split.id} style={styles.splitRow}>
          <View>
            <Text style={styles.playerName}>{split.invitee_name || `Hráč #${split.invitee_user_id}`}</Text>
            <Text style={styles.amount}>{Number(split.amount || 0).toFixed(2)} €</Text>
          </View>
          <Text style={[styles.status, split.status === 'accepted' ? styles.statusOk : styles.statusPending]}>
            {split.status === 'accepted'
              ? 'Potvrdené'
              : split.status === 'declined'
              ? 'Odmietnuté'
              : split.status === 'expired'
              ? 'Expirované'
              : 'Čaká sa'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    padding: 14,
    marginBottom: 12
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  subTitle: { color: colors.textSecondary, marginTop: 4 },
  counter: { color: colors.textPrimary, fontWeight: '700', marginTop: 10 },
  splitRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 14
  },
  cancelButtonDisabled: {
    opacity: 0.65
  },
  cancelButtonText: {
    color: '#fecaca',
    fontWeight: '800'
  },
  playerName: { color: colors.textPrimary, fontWeight: '600' },
  amount: { color: colors.textSecondary, marginTop: 2 },
  status: { fontSize: 12, fontWeight: '700' },
  statusOk: { color: '#10b981' },
  statusPending: { color: '#fbbf24' }
});
