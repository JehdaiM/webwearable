import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Vibration,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// ============ CONFIGURACIÓN ============
const CONFIG = {
  TARGET_LOCATION: {
    latitude: 19.3398369,
    longitude:  -99.4755256,
    name: 'Docencia 1'
  },
  MAX_DISTANCE_METERS: 10,
  PRECISION_THRESHOLD: 10,
  START_TIME: '08:00',
  END_TIME: '08:15',
  TOLERANCE_TIME: '08:20',
};

// ============ FUNCIÓN HAVERSINE ============
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (angle) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ============ APP PRINCIPAL ============
export default function App() {
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        setPermissionGranted(newStatus === 'granted');
        if (newStatus !== 'granted') {
          Alert.alert('Permiso requerido', 'Learnify necesita acceso a tu ubicación.');
        }
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const getLocation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!permissionGranted) {
        await checkPermissions();
        if (!permissionGranted) {
          setError('Permiso de ubicación denegado');
          setIsLoading(false);
          return;
        }
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      
      setLocation(loc);
      
      const dist = haversineDistance(
        loc.coords.latitude,
        loc.coords.longitude,
        CONFIG.TARGET_LOCATION.latitude,
        CONFIG.TARGET_LOCATION.longitude
      );
      setDistance(dist);

      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      let attendanceResult;
      
      if (loc.coords.accuracy > 10) {
        attendanceResult = {
          status: 'error',
          message: 'PRECISIÓN INSUFICIENTE',
          details: `${Math.round(loc.coords.accuracy)}m`,
          icon: '📡',
          color: '#FF5252'
        };
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      else if (dist > 10) {
        attendanceResult = {
          status: 'out_of_area',
          message: 'FUERA DEL ÁREA',
          details: `${Math.round(dist)}m`,
          icon: '📍',
          color: '#FF6B6B'
        };
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      else if (timeStr >= '08:00' && timeStr <= '08:15') {
        attendanceResult = {
          status: 'success',
          message: 'ASISTENCIA',
          details: `${dist.toFixed(1)}m • ${timeStr}`,
          icon: '✅',
          color: '#4ECB71'
        };
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([100, 50, 100, 50, 100]);
      } 
      else if (timeStr > '08:15' && timeStr <= '08:20') {
        attendanceResult = {
          status: 'warning',
          message: 'RETARDO',
          details: `${timeStr} • Tolerancia`,
          icon: '⏰',
          color: '#FFB74D'
        };
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Vibration.vibrate([100, 50, 100]);
      } 
      else if (timeStr > '08:20') {
        attendanceResult = {
          status: 'error',
          message: 'RECHAZADO',
          details: `${timeStr} • Fuera de horario`,
          icon: '❌',
          color: '#FF5252'
        };
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Vibration.vibrate([200, 100, 200]);
      }
      else {
        attendanceResult = {
          status: 'warning',
          message: 'TEMPRANO',
          details: `${timeStr} • Espera`,
          icon: '⏳',
          color: '#FFB74D'
        };
      }
      
      setResult(attendanceResult);
      setIsLoading(false);
      
    } catch (err) {
      setError('Error: ' + err.message);
      setIsLoading(false);
    }
  };

  const resetApp = () => {
    setLocation(null);
    setDistance(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ============ PANTALLA DE CARGA ============
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
        <View style={styles.watchContainer}>
          <View style={styles.watchFace}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingRing}>
                <Ionicons name="location" size={48} color="#6C63FF" />
              </View>
              <Text style={styles.loadingText}>Buscando GPS</Text>
              <Text style={styles.loadingSubtext}>Por favor espera...</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ============ PANTALLA PRINCIPAL ============
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      
      <View style={styles.watchContainer}>
        <View style={styles.watchFace}>
          
          {/* HEADER SMARTWATCH */}
          <View style={styles.watchHeader}>
            <Ionicons name="watch" size={16} color="#6C63FF" />
            <Text style={styles.watchTitle}>LEARNIFY</Text>
            <View style={styles.watchDot} />
          </View>

          {/* HORA */}
          <Text style={styles.watchTime}>{formatTime(currentTime)}</Text>

          {/* ESTADO PRINCIPAL */}
          {error ? (
            <View style={styles.statusContainer}>
              <Ionicons name="alert-circle" size={56} color="#FF5252" />
              <Text style={styles.statusError}>{error}</Text>
              <TouchableOpacity style={styles.watchButton} onPress={getLocation}>
                <Text style={styles.watchButtonText}>REINTENTAR</Text>
              </TouchableOpacity>
            </View>
          ) : result ? (
            <View style={styles.statusContainer}>
              <Text style={[styles.statusIcon, { color: result.color }]}>
                {result.icon}
              </Text>
              <Text style={[styles.statusMessage, { color: result.color }]}>
                {result.message}
              </Text>
              <Text style={styles.statusDetails}>{result.details}</Text>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.gpsPulse}>
                <Ionicons name="location-outline" size={48} color="#6C63FF" />
              </View>
              <Text style={styles.statusWaiting}>Esperando GPS</Text>
              <Text style={styles.statusSubtext}>Presiona el botón</Text>
            </View>
          )}

          {/* INFORMACIÓN EXTRA - TIPO SMARTWATCH */}
          <View style={styles.watchInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={14} color="#6C63FF" />
              <Text style={styles.infoLabel}>Distancia</Text>
              <Text style={styles.infoValue}>
                {distance !== null ? `${distance.toFixed(1)}m` : '--'}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="radio" size={14} color="#6C63FF" />
              <Text style={styles.infoLabel}>Precisión</Text>
              <Text style={styles.infoValue}>
                {location ? `${Math.round(location.coords.accuracy)}m` : '--'}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="location-sharp" size={14} color="#6C63FF" />
              <Text style={styles.infoLabel}>Destino</Text>
              <Text style={styles.infoValue}>Docencia 1</Text>
            </View>
          </View>

          {/* BOTÓN PRINCIPAL - ESTILO SMARTWATCH */}
          {!result && !error ? (
            <TouchableOpacity style={styles.watchButtonMain} onPress={getLocation}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.watchButtonMainText}>VERIFICAR</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.watchButtonSecondary} onPress={resetApp}>
              <Ionicons name="refresh" size={20} color="#6C63FF" />
              <Text style={styles.watchButtonSecondaryText}>REINICIAR</Text>
            </TouchableOpacity>
          )}

          {/* FOOTER SMARTWATCH */}
          {result && (
            <View style={styles.watchFooter}>
              <Text style={styles.watchFooterText}>
                {result.status === 'success' && '✅ Registrado'}
                {result.status === 'warning' && '⚠️ Con retraso'}
                {result.status === 'error' && '❌ No registrado'}
                {result.status === 'out_of_area' && '📍 Fuera del área'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============ ESTILOS SMARTWATCH ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  watchFace: {
    width: Math.min(width - 40, 400),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 40,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  
  // HEADER
  watchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  watchTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
  watchDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4ECB71',
  },
  
  // HORA
  watchTime: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  
  // ESTADO
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 160,
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  statusDetails: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statusWaiting: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  statusSubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    marginTop: 4,
  },
  statusError: {
    color: '#FF5252',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  
  // GPS PULSE
  gpsPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  
  // LOADING
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6C63FF',
    marginBottom: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    marginTop: 4,
  },
  
  // INFO WATCH
  watchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  infoDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  // BOTONES SMARTWATCH
  watchButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 12,
    gap: 10,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  watchButtonMainText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  watchButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#6C63FF',
    gap: 10,
  },
  watchButtonSecondaryText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  watchButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#6C63FF',
    borderRadius: 20,
  },
  watchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 1,
  },
  
  // FOOTER
  watchFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  watchFooterText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});