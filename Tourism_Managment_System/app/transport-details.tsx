import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';;
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { API_BASE } from '../src/config';
import { StatusBar } from 'expo-status-bar';

const API_URL = `${API_BASE}/api/transportation`;

interface Vehicle {
  _id: string;
  vehicleType: string;
  brandModel?: string;
  plateNumber: string;
  capacity: number;
  price: number;
  description?: string;
  vehicleImage?: string;
  contactNumber?: string;
}

const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TransportDetailsScreen() {
  const router = useRouter();
  const { id, hotelId, tourPackId, persons } = useLocalSearchParams<{ 
    id: string; 
    hotelId?: string; 
    tourPackId?: string;
    persons?: string;
  }>();
  const { width } = useWindowDimensions();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push({
        pathname: '/transport-selection',
        params: { hotelId, tourPackId, persons },
      });
    }
  }, [router, hotelId, tourPackId]);

  const fetchVehicleDetails = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`);
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to fetch vehicle details');
        handleBack();
        return;
      }

      setVehicle(data);
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
      handleBack();
    } finally {
      setLoading(false);
    }
  }, [handleBack, id]);

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  const getVehicleIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('bus')) return 'bus-outline';
    if (t.includes('car')) return 'car-outline';
    if (t.includes('van')) return 'car-sport-outline';
    if (t.includes('bike') || t.includes('scooter')) return 'bicycle-outline';
    return 'navigate-outline';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003580" />
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { height: Math.min(width * 0.85, 400) }]}>
          {vehicle.vehicleImage ? (
            <Image source={{ uri: vehicle.vehicleImage }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name={getVehicleIcon(vehicle.vehicleType) as any} size={80} color="#CBD5E1" />
              <Text style={styles.heroPlaceholderText}>Preview unavailable</Text>
            </View>
          )}
          <View style={styles.heroOverlay} />

          <View style={styles.heroTopBar}>
            <TouchableOpacity style={styles.heroIconButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.heroTopActions}>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>{vehicle.vehicleType}</Text>
              </View>
              <TouchableOpacity style={styles.heroIconButton} onPress={() => router.push('/')}>
                <Ionicons name="home-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{vehicle.brandModel || `${vehicle.vehicleType} Vehicle`}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="id-card-outline" size={16} color="#E2E8F0" />
              <Text style={styles.heroMetaText}>{vehicle.plateNumber}</Text>
            </View>
            <View style={styles.heroSummaryRow}>
              <View style={styles.heroPriceBlock}>
                <Text style={styles.heroPrice}>{formatPrice(vehicle.price)}</Text>
                <Text style={styles.heroPriceLabel}>per trip / day</Text>
              </View>
              <View style={styles.capacityPill}>
                <Ionicons name="people-outline" size={16} color="#FFF" />
                <Text style={styles.capacityText}>{vehicle.capacity} Seats</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="car-outline" size={24} color="#003580" />
              <Text style={styles.metricValue}>{vehicle.vehicleType}</Text>
              <Text style={styles.metricLabel}>Vehicle Type</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="people-outline" size={24} color="#003580" />
              <Text style={styles.metricValue}>{vehicle.capacity}</Text>
              <Text style={styles.metricLabel}>Max Seats</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="cash-outline" size={24} color="#003580" />
              <Text style={[styles.metricValue, { fontSize: 16 }]}>{formatPrice(vehicle.price).split(' ')[1]}</Text>
              <Text style={styles.metricLabel}>Base Fare</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Overview</Text>
            <Text style={styles.sectionTitle}>About this transport</Text>
            <Text style={styles.bodyText}>
              {vehicle.description?.trim() || 'Enjoy a comfortable and safe journey with our premium transport service. All vehicles are well-maintained and driven by experienced professionals.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Technical</Text>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Brand & Model</Text>
                <Text style={styles.detailValue}>{vehicle.brandModel || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plate Number</Text>
                <Text style={styles.detailValue}>{vehicle.plateNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Seating Capacity</Text>
                <Text style={styles.detailValue}>{vehicle.capacity} persons</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Standard Rate</Text>
                <Text style={styles.detailValue}>{formatPrice(vehicle.price)}</Text>
              </View>
              {vehicle.contactNumber ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact Info</Text>
                  <Text style={styles.detailValue}>{vehicle.contactNumber}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: '/hotels',
              params: {
                transportId: vehicle._id,
                ...(hotelId ? { hotelId } : {}),
                ...(tourPackId ? { tourPackId } : {}),
                ...(persons ? { persons } : {}),
              },
            })
          }
        >
          <Text style={styles.primaryButtonText}>Select & Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    position: 'relative',
    backgroundColor: '#003580',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#E2E8F0',
  },
  heroPlaceholderText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 53, 128, 0.4)',
  },
  heroTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMetaText: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  heroSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  heroPriceBlock: {
    flex: 1,
  },
  heroPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  heroPriceLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },
  capacityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  capacityText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 28,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  section: {
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003580',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  detailList: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryButton: {
    backgroundColor: '#003580',
    borderRadius: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#003580',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
