import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { apiService } from '../services/api';
import { useKreditaBalance } from '../hooks/useKreditaBalance';

interface KreditaTransaction {
  type: string;
  amount: number;
  service: string;
  description: string;
  created_at: string;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

export default function CreditHistoryScreen() {
  const navigation = useNavigation();
  // 1. stránka + aktuálny zostatok zo spoločnej query
  const balance = useKreditaBalance();
  // Ďalšie stránky si držíme lokálne (append pri scrollovaní)
  const [extraPages, setExtraPages] = useState<KreditaTransaction[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);

  const firstPage = balance.data?.transactions ?? [];
  const total = balance.data?.paginator?.total ?? 0;
  const transactions = [...firstPage, ...extraPages];
  const hasMore = transactions.length < total;

  const onRefresh = useCallback(async () => {
    setExtraPages([]);
    setNextPage(2);
    await balance.refetch();
  }, [balance.refetch]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await apiService.getKreditaBalance(nextPage);
      setExtraPages((prev) => [...prev, ...(data.transactions ?? [])]);
      setNextPage((p) => p + 1);
    } catch {
      // pri chybe necháme "load more" na ďalší pokus
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextPage]);

  const renderItem = ({ item }: { item: KreditaTransaction }) => {
    const isCredit = item.type === 'credit' || item.amount > 0;
    return (
      <View style={styles.txRow}>
        <View style={[styles.txIcon, isCredit ? styles.txIconCredit : styles.txIconDebit]}>
          <Ionicons
            name={isCredit ? 'arrow-down' : 'arrow-up'}
            size={18}
            color={isCredit ? '#16a34a' : '#ef4444'}
          />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txDescription} numberOfLines={1}>
            {item.description || item.service || (isCredit ? 'Dobitie kreditu' : 'Použitie kreditu')}
          </Text>
          <Text style={styles.txDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={[styles.txAmount, isCredit ? styles.txAmountCredit : styles.txAmountDebit]}>
          {isCredit ? '+' : ''}{Number(item.amount).toFixed(2)} €
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>História kreditov</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Aktuálny zostatok</Text>
        <Text style={styles.balanceValue}>
          {balance.data != null ? Number(balance.data.credit).toFixed(2) : '…'} €
        </Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item, index) => `${item.created_at}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={balance.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          balance.isLoading ? (
            <ActivityIndicator style={styles.emptyState} color={colors.primary} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Zatiaľ žiadne transakcie.</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : null
        }
      />
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
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  txIconDebit: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  txDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  txAmountCredit: {
    color: '#16a34a',
  },
  txAmountDebit: {
    color: '#ef4444',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 48,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
