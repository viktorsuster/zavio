import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/AppNavigator';
import { apiService, QRValidationResponse } from '../services/api';

type ScanScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Scan'>;

// Extrahovanie UUID z QR kódu
const extractQRCodeId = (qrData: string): string | null => {
  try {
    const url = new URL(qrData);
    return url.pathname.split('/').pop() || null;
  } catch {
    // Ak to nie je URL, skúsiť extrahovať priamo
    return qrData.split('/').pop() || null;
  }
};

export default function ScanScreen() {
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QRValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Extrahuj UUID z QR kódu
      const qrCodeId = extractQRCodeId(data);
      
      if (!qrCodeId) {
        Alert.alert('Chyba', 'Neplatný QR kód. Skontrolujte, či je QR kód správny.');
        setScanned(false);
        setLoading(false);
        return;
      }

      // Volaj API
      const response = await apiService.validateQRCode(qrCodeId);
      setResult(response);
      
      if (response.accessGranted) {
        // Úspech - zobrazí sa v UI
      } else {
        // Prístup zamietnutý - zobrazí sa v UI
      }
    } catch (err: any) {
      // Spracovanie chýb
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        Alert.alert('Chyba', 'Musíte byť prihlásený', [
          {
            text: 'OK',
            onPress: () => {
              // Navigácia na Login sa rieši v AppNavigator na základe tokenu
            }
          }
        ]);
      } else if (err.message?.includes('404') || err.message?.includes('Not Found')) {
        Alert.alert('Chyba', 'Ihrisko nebolo nájdené. Skontrolujte, či je QR kód platný.');
      } else if (err.message?.includes('500')) {
        Alert.alert('Chyba', 'Nastala chyba pri validácii QR kódu. Skúste to znova.');
      } else {
        setError(err.message || 'Nastala nečakaná chyba');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setScanned(false);
    setResult(null);
    setError(null);
  };

  const handleCreateBooking = () => {
    if (result?.field) {
      handleClose();
      navigation.navigate('Booking');
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Žiadam o povolenie kamery...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Potrebujeme prístup ku kamere</Text>
        <Button onPress={requestPermission} style={styles.button}>
          Povoliť kameru
        </Button>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Kontrolujem prístup...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success state - access granted
  if (result && result.accessGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Vstup povolený!</Text>
          <Text style={styles.successMessage}>{result.message}</Text>
          {result.field && (
            <View style={styles.fieldInfo}>
              <Text style={styles.fieldName}>{result.field.name}</Text>
              <Text style={styles.fieldType}>{result.field.type}</Text>
              <Text style={styles.fieldLocation}>{result.field.location}</Text>
            </View>
          )}
          {result.booking && (
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingText}>
                Rezervácia: {result.booking.date} {result.booking.startTime} - {result.booking.endTime}
              </Text>
            </View>
          )}
          <Button onPress={handleClose} variant="outline" style={styles.closeButton}>
            Zavrieť
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Access denied state
  if (result && !result.accessGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.deniedContainer}>
          <View style={styles.deniedIcon}>
            <Ionicons name="close-circle" size={64} color="#ef4444" />
          </View>
          <Text style={styles.deniedTitle}>Prístup zamietnutý</Text>
          <Text style={styles.deniedMessage}>{result.message}</Text>
          {result.field && (
            <View style={styles.fieldInfo}>
              <Text style={styles.fieldName}>{result.field.name}</Text>
              <Text style={styles.fieldType}>{result.field.type}</Text>
              <Text style={styles.fieldLocation}>{result.field.location}</Text>
            </View>
          )}
          <View style={styles.buttonContainer}>
            <Button onPress={handleCreateBooking} style={styles.createBookingButton}>
              Vytvoriť rezerváciu
            </Button>
            <Button onPress={handleClose} variant="outline" style={styles.closeButton}>
              Zavrieť
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={64} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>Chyba</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button onPress={handleClose} variant="outline" style={styles.closeButton}>
            Skúsiť znova
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr']
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <View style={styles.scanLine} />
          </View>
          <Text style={styles.instructionText}>
            Namier na QR kód pri vstupe
          </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  camera: {
    flex: 1
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  scanFrame: {
    width: 256,
    height: 256,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#10b981',
    borderWidth: 4
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#10b981',
    opacity: 0.8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8
  },
  instructionText: {
    marginTop: 32,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  successMessage: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24
  },
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#000'
  },
  deniedIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  deniedMessage: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24
  },
  fieldInfo: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155'
  },
  fieldName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  fieldType: {
    fontSize: 14,
    color: '#10b981',
    marginBottom: 4
  },
  fieldLocation: {
    fontSize: 14,
    color: '#94a3b8'
  },
  bookingInfo: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155'
  },
  bookingText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },
  buttonContainer: {
    width: '100%',
    gap: 12
  },
  createBookingButton: {
    width: '100%'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#000'
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  errorMessage: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32
  },
  closeButton: {
    minWidth: 200
  },
  text: {
    color: '#fff',
    fontSize: 16
  },
  button: {
    marginTop: 16
  }
});

