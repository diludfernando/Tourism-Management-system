import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AdminScreen() {
  const router = useRouter();
  const { admin } = useLocalSearchParams<{ admin?: string }>();
  const [bookings, setBookings] = useState<any[]>([]);
  const isAdminMode = admin === 'true';

  useEffect(() => {
    if (!isAdminMode) {
      router.replace('/');
    }
  }, [isAdminMode, router]);

  useFocusEffect(
    useCallback(() => {
      const loadBookings = async () => {
        try {
          const response = await fetch(`${API_URL}/api/bookings`);
          const data = await response.json();
          if (response.ok) {
            setBookings(data);
          }
        } catch {
          setBookings([]);
        }
      };

      loadBookings();
    }, [])
  );

  const adminStats = useMemo(() => {
    const activeBookings = bookings.filter((booking) => booking.bookingStatus !== 'cancelled');
    const pendingCount = bookings.filter((booking) => booking.bookingStatus === 'pending').length;
    const paidCount = bookings.filter((booking) => booking.paymentStatus === 'paid').length;
    const totalRevenue = activeBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

    return [
      { title: 'Total Bookings', value: `${bookings.length}`, icon: 'calendar-outline' },
      { title: 'Trips Pending', value: `${pendingCount}`, icon: 'time-outline' },
    { title: 'Active Revenue', value: formatPrice(totalRevenue), icon: 'cash-outline' },
      { title: 'Paid Journeys', value: `${paidCount}`, icon: 'checkmark-done-outline' },
    ];
  }, [bookings]);

  if (!isAdminMode) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="home-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {adminStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={32} color="#003580" />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="people-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>User Management</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="map-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Add New Destination</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/add-transportation', params: { admin: 'true' } })}
          >
            <Ionicons name="bus-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Add New Transportation</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/add-hotel', params: { admin: 'true' } })}
          >
            <Ionicons name="home-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Add new Hotel / Accommodation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/hotels', params: { admin: 'true' } })}
          >
            <Ionicons name="business-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Manage Hotels</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/booking-management', params: { admin: 'true' } })}
          >
            <Ionicons name="calendar-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Booking Management</Text>
          </TouchableOpacity>
        
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#d32f2f' }]}
            onPress={() => router.push('/')}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    padding: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#FFF',
    width: '48%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003580',
    marginVertical: 5,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#003580',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
