import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  AppState,
  AppStateStatus
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/AppNavigator';
import { colors } from '../constants/colors';
import { useQRCodeScanner } from '../hooks/useQRCodeScanner';

type ScanScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Scan'>;

export default function ScanScreen() {
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const isFocused = useIsFocused();
  const appState = useRef(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(appState.current === 'active');
  const [permission, requestPermission] = useCameraPermissions();

  // Custom hook pre skenovanie
  const {
    scanned,
    loading,
    result,
    error,
    handleBarCodeScanned,
    resetScanner
  } = useQRCodeScanner(() => {
    // On Success callback
    setTimeout(() => {
      navigation.navigate('Feed');
    }, 2000);
  });

  // Lifecycle manažment pre AppState (pozadie/popredie)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      appState.current = nextAppState;
      setIsAppActive(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Request permission on mount if not granted
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Reset scannera pri odchode z obrazovky alebo keď sa appka dostane do pozadia
  useEffect(() => {
    if (!isFocused || !isAppActive) {
      // Voliteľné: resetovať scanner ak chceme aby pri návrate bol fresh
      // Alebo nechať tak, len vypnúť kameru (to rieši isFocused && isAppActive v render)
    } else {
      // Pri návrate (ak nebol úspešný scan) môžeme resetnuť, aby znovu skenoval
      if (!result && error) {
        resetScanner();
      }
    }
  }, [isFocused, isAppActive]);

  const handleCreateBooking = () => {
    if (result?.field) {
      resetScanner();
      navigation.navigate('Booking');
    }
  };

  // 1. Permission Check
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

  // 2. Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Kontrolujem prístup...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Success State
  if (result && result.accessGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.gold} />
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
          <Button
            onPress={() => navigation.navigate('Feed')}
            variant="primary"
            style={styles.closeButton}
          >
            Pokračovať na Feed
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // 4. Access Denied State
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
            <Button onPress={resetScanner} variant="outline" style={styles.closeButton}>
              Zavrieť
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 5. Error State
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
          <Button onPress={resetScanner} variant="outline" style={styles.closeButton}>
            Skúsiť znova
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // 6. Camera View (Active Scanning)
  // Render Camera only when focused AND app is active to save battery/resources
  const showCamera = isFocused && isAppActive && !scanned;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {showCamera ? (
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
      ) : (
        <View style={[styles.container, { backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }]}>
          {!isFocused && <Text style={{ color: 'white' }}>Kamera pozastavená</Text>}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
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
    borderColor: colors.gold,
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
    backgroundColor: colors.gold,
    opacity: 0.8,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8
  },
  instructionText: {
    marginTop: 32,
    color: colors.textPrimary,
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
    backgroundColor: colors.background
  },
  loadingText: {
    color: colors.textPrimary,
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
    backgroundColor: `rgba(212, 175, 55, 0.2)`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8
  },
  successMessage: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24
  },
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background
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
    color: colors.textPrimary,
    marginBottom: 8
  },
  deniedMessage: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24
  },
  fieldInfo: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border
  },
  fieldName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4
  },
  fieldType: {
    fontSize: 14,
    color: colors.gold,
    marginBottom: 4
  },
  fieldLocation: {
    fontSize: 14,
    color: colors.textTertiary
  },
  bookingInfo: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border
  },
  bookingText: {
    fontSize: 14,
    color: colors.textTertiary,
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
    backgroundColor: colors.background
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
    color: colors.textPrimary,
    marginBottom: 8
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 32
  },
  closeButton: {
    minWidth: 200
  },
  text: {
    color: colors.textPrimary,
    fontSize: 16
  },
  button: {
    marginTop: 16
  }
});
