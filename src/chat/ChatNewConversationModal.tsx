import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';

export default function ChatNewConversationModal() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Nový chat</Text>
        <Text style={styles.subtitle}>Použi tlačidlo „Novy chat“ v Chat tabu pre direct alebo group chat.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Zavrieť</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, marginTop: 8 },
  button: { marginTop: 14, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: '700' }
});
