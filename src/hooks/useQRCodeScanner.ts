import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { apiService, QRValidationResponse } from '../services/api';

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

export const useQRCodeScanner = (onSuccess?: () => void) => {
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QRValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
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
      const response = await apiService.validateQrCode(qrCodeId);
      setResult(response);
      
      if (response.accessGranted) {
        // Úspech
        if (onSuccess) {
            onSuccess();
        }
      }
    } catch (err: any) {
      // Spracovanie chýb
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        Alert.alert('Chyba', 'Musíte byť prihlásený', [
          {
            text: 'OK',
            onPress: () => {
              // Navigácia by sa mala riešiť v UI vrstve alebo globálne
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
  }, [scanned, loading, onSuccess]);

  const resetScanner = useCallback(() => {
    setScanned(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    scanned,
    loading,
    result,
    error,
    handleBarCodeScanned,
    resetScanner
  };
};
