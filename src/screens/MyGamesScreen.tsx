import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Booking, User } from '../types';
import { storageService } from '../storage';
import { MOCK_USER } from '../constants';
import { apiService } from '../services/api';

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export default function MyGamesScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    const savedUser = storageService.getUser();
    setUser(savedUser || MOCK_USER);
  }, []);

  // Fetch bookings from API
  const { data: bookingsData, isLoading: isLoadingBookings, error: bookingsError } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => apiService.getBookings(),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  if (!user) return null;

  const bookings = bookingsData?.bookings || [];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeMin = now.getHours() * 60 + now.getMinutes();

  const sortedBookings = [...bookings].sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? 1 : -1;
    return a.startTime > b.startTime ? 1 : -1;
  });

  const upcomingGames = sortedBookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    if (b.date > todayStr) return true;
    if (b.date === todayStr) return timeToMinutes(b.startTime) + b.duration > currentTimeMin;
    return false;
  });

  const historyGames = sortedBookings.filter((b) => {
    if (b.status === 'cancelled') return true;
    if (b.date < todayStr) return true;
    if (b.date === todayStr) return timeToMinutes(b.startTime) + b.duration <= currentTimeMin;
    return false;
  }).reverse();

  const displayList = activeTab === 'upcoming' ? upcomingGames : historyGames;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Moje Hry</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab('upcoming')}
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'upcoming' && styles.tabTextActive
              ]}
            >
              Nadchádzajúce
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'history' && styles.tabTextActive
              ]}
            >
              História
            </Text>
          </TouchableOpacity>
        </View>

        {isLoadingBookings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Načítavam rezervácie...</Text>
          </View>
        ) : bookingsError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorTitle}>Chyba pri načítaní</Text>
            <Text style={styles.errorText}>
              {bookingsError instanceof Error ? bookingsError.message : 'Nepodarilo sa načítať rezervácie'}
            </Text>
          </View>
        ) : displayList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#64748b" />
            <Text style={styles.emptyTitle}>Žiadne hry</Text>
            <Text style={styles.emptyText}>
              V tejto kategórii zatiaľ nemáš žiadne záznamy.
            </Text>
          </View>
        ) : (
          <View style={styles.gamesList}>
            {displayList.map((booking) => (
              <View key={booking.id} style={styles.gameCard}>
                <View style={styles.gameHeader}>
                  <Text style={styles.gameTitle}>
                    {booking.fieldName || 'Neznáme ihrisko'}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      booking.status === 'confirmed' &&
                        activeTab === 'upcoming' &&
                        styles.statusBadgeActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        booking.status === 'confirmed' &&
                          activeTab === 'upcoming' &&
                          styles.statusTextActive
                      ]}
                    >
                      {activeTab === 'upcoming' ? 'Potvrdené' : 'Ukončené'}
                    </Text>
                  </View>
                </View>
                <View style={styles.gameInfo}>
                  <Ionicons name="calendar-outline" size={16} color="#10b981" />
                  <Text style={styles.gameInfoText}>
                    {new Date(booking.date).toLocaleDateString('sk-SK', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={styles.gameInfo}>
                  <Ionicons name="time-outline" size={16} color="#10b981" />
                  <Text style={styles.gameInfoText}>
                    {booking.startTime} • {booking.duration} min
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  tabActive: {
    backgroundColor: '#10b981'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8'
  },
  tabTextActive: {
    color: '#fff'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    opacity: 0.5
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },
  gamesList: {
    gap: 12
  },
  gameCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569'
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#94a3b8'
  },
  statusTextActive: {
    color: '#10b981'
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  gameInfoText: {
    fontSize: 14,
    color: '#e2e8f0'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  }
});

