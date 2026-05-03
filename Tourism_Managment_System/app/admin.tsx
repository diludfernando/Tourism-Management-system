import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { API_BASE } from '../src/config';
import { clearAuthSession, getAuthHeaders, getAuthRole } from '../src/auth';

const API_URL = `${API_BASE}/api/bookings`;
const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AdminScreen() {
  const router = useRouter();
  const { admin } = useLocalSearchParams<{ admin?: string }>();
  const [bookings, setBookings] = useState<any[]>([]);
  const [hasVerifiedRole, setHasVerifiedRole] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [userProfile, setUserProfile] = useState<{ profilePhoto?: string } | null>(null);

  useEffect(() => {
    const verifyRole = async () => {
      console.log('[Admin] Verifying role...');
      const role = await getAuthRole();
      console.log('[Admin] Role found:', role);
      
      const allowed = role === 'admin';
      setIsAdminMode(allowed);
      setHasVerifiedRole(true);

      if (!allowed) {
        console.log('[Admin] Access denied, redirecting to explore...');
        router.replace('/explore');
      } else {
        console.log('[Admin] Access granted.');
      }
    };

    verifyRole();
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const headers = await getAuthHeaders();
          
          // Fetch bookings
          const bookingsResponse = await fetch(API_URL, { headers });
          const bookingsData = await bookingsResponse.json();
          if (bookingsResponse.ok) {
            setBookings(bookingsData.data || []);
          }

          // Fetch user profile for the icon
          const profileResponse = await fetch(`${API_BASE}/api/users/me`, { headers });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setUserProfile(profileData);
          }
        } catch (error) {
          console.error('Error loading admin dashboard data:', error);
          setBookings([]);
        }
      };

      loadData();
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

  if (!hasVerifiedRole || !isAdminMode) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 44 }} />
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity 
          style={styles.profileIconButton}
          onPress={() => router.push('/admin/profile')}
        >
          {userProfile?.profilePhoto ? (
            <Image 
              source={{ uri: `${API_BASE}${userProfile.profilePhoto}` }} 
              style={styles.profileImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <Ionicons name="person-circle-outline" size={32} color="#FF6B35" />
          )}
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

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/admin/users', params: { admin: 'true' } } as any)}
          >
            <Ionicons name="people-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>User Management</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/transportation', params: { admin: 'true' } })}
          >
            <Ionicons name="car-sport-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Transportation Management</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/my-tourpacks/index')}
          >
            <Ionicons name="briefcase-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Tour Packages Managment</Text>
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
            style={styles.actionButton}
            onPress={() => router.push('/admin/feedback')}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Feedback Moderation</Text>
          </TouchableOpacity>
        
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#d32f2f' }]}
            onPress={async () => {
              await clearAuthSession();
              if (Platform.OS === 'web') {
                window.location.href = '/';
              } else {
                router.replace('/');
              }
            }}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  profileIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Ensure image stays within bounds
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
