import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { API_BASE } from '../src/config';
import { getAuthHeaders } from '../src/auth';

type Booking = {
  _id: string;
  bookingReference: string;
  guestName: string;
  email: string;
  phone: string;
  destination: string;
  hotel?: {
    name: string;
    location: string;
  };
  tourPack?: {
    name: string;
    destination: string;
  };
  transportation?: {
    vehicleType: string;
    brandModel: string;
    plateNumber: string;
  };
  checkInDate?: string;
  checkOutDate?: string;
  adults: number;
  children: number;
  rooms: number;
  nights: number;
  stayAmount: number;
  packageAmount: number;
  transportationAmount: number;
  serviceFee: number;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
};

const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateForDisplay = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function ReceiptScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setError('Booking ID is missing');
      setLoading(false);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/bookings/${bookingId}`, { headers });
      const data = await response.json();

      if (response.ok) {
        setBooking(data);
      } else {
        setError(data.message || 'Failed to load receipt');
      }
    } catch (err) {
      setError('Connection error. Please check your internet.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#003580" />
        <Text style={styles.loadingText}>Preparing your receipt...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Text style={styles.backButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>Booking Receipt</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={48} color="#047857" />
            </View>
            <Text style={styles.successTitle}>Confirmed!</Text>
            <Text style={styles.successSubtitle}>Your reservation is now secured.</Text>
          </View>

          <View style={styles.infoPanel}>
            <View style={styles.refRow}>
              <View>
                <Text style={styles.refLabel}>REFERENCE</Text>
                <Text style={styles.refValue}>{booking.bookingReference}</Text>
              </View>
              <Text style={styles.issueDate}>
                Issued: {new Date(booking.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>GUEST DETAILS</Text>
              <Text style={styles.primaryText}>{booking.guestName}</Text>
              <Text style={styles.secondaryText}>{booking.email}</Text>
              <Text style={styles.secondaryText}>{booking.phone}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TRIP SUMMARY</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Destination</Text>
                <Text style={styles.value}>{booking.destination}</Text>
              </View>
              
              {booking.hotel && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Stay</Text>
                  <Text style={styles.value}>{booking.hotel.name}</Text>
                </View>
              )}

              {booking.tourPack && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Package</Text>
                  <Text style={styles.value}>{booking.tourPack.name}</Text>
                </View>
              )}

              {booking.checkInDate && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Check-in</Text>
                  <Text style={styles.value}>{formatDateForDisplay(booking.checkInDate)}</Text>
                </View>
              )}

              {booking.checkOutDate && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Check-out</Text>
                  <Text style={styles.value}>{formatDateForDisplay(booking.checkOutDate)}</Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.label}>Guests</Text>
                <Text style={styles.value}>{booking.adults} Adults, {booking.children} Children</Text>
              </View>

              {booking.transportation && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Transport</Text>
                  <Text style={styles.value}>{booking.transportation.vehicleType} ({booking.transportation.brandModel})</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PAYMENT SUMMARY</Text>
              
              {booking.stayAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Accommodation</Text>
                  <Text style={styles.priceValue}>{formatPrice(booking.stayAmount)}</Text>
                </View>
              )}

              {booking.packageAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Tour Package</Text>
                  <Text style={styles.priceValue}>{formatPrice(booking.packageAmount)}</Text>
                </View>
              )}

              {booking.transportationAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Transportation</Text>
                  <Text style={styles.priceValue}>{formatPrice(booking.transportationAmount)}</Text>
                </View>
              )}

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service Fee (8%)</Text>
                <Text style={styles.priceValue}>{formatPrice(booking.serviceFee)}</Text>
              </View>

              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                <Text style={styles.totalValue}>{formatPrice(booking.totalAmount)}</Text>
              </View>
              
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  Status: {booking.paymentStatus.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={() => router.push('/explore')}>
            <Text style={styles.doneButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  homeButton: {
    padding: 8,
  },
  receiptCard: {
    margin: 20,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successBadge: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#047857',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  infoPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 20,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003580',
    marginTop: 2,
  },
  issueDate: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 2,
  },
  section: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryText: {
    fontSize: 14,
    color: '#475569',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: '#64748B',
  },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003580',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  doneButton: {
    backgroundColor: '#003580',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#003580',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
