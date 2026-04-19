import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  ActivityIndicator, 
  RefreshControl,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

// Configuration for API URL
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  brandModel?: string;
  plateNumber: string;
  capacity: number;
  price: number;
  description?: string;
  vehicleImage?: string;
}

export default function TransportSelectionScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transportation`);
      const data = await response.json();
      if (response.ok) {
        setVehicles(data);
      } else {
        console.error('Failed to fetch vehicles:', data.message);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicles();
  }, []);

  const getVehicleIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('bus')) return 'bus-outline';
    if (t.includes('car')) return 'car-outline';
    if (t.includes('van')) return 'car-sport-outline';
    if (t.includes('bike') || t.includes('scooter')) return 'bicycle-outline';
    return 'navigate-outline';
  };

  const renderVehicleCard = ({ item }: { item: Vehicle }) => (
    <View style={styles.card}>
      {/* Hero Image Section */}
      <View style={styles.cardHero}>
        {item.vehicleImage ? (
          <Image source={{ uri: item.vehicleImage }} style={styles.heroImage} contentFit="cover" transition={500} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name={getVehicleIcon(item.vehicleType) as any} size={64} color="#003580" />
          </View>
        )}
        <View style={styles.heroOverlay} />
        
        {/* Floating Badges */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.vehicleType}</Text>
        </View>
        
        <View style={styles.priceFloatingBadge}>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.priceAmount}>LKR {item.price.toLocaleString()}</Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          <Text style={styles.vehicleNameText}>{item.vehicleName}</Text>
          <Text style={styles.brandModelText}>{item.brandModel || 'Luxury Edition'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={18} color="#003580" />
            <Text style={styles.statText}>{item.capacity} Seats</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="id-card" size={18} color="#003580" />
            <Text style={styles.statText}>{item.plateNumber}</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <TouchableOpacity 
          style={styles.actionButton}
          activeOpacity={0.85}
          onPress={() => alert(`Reserved: ${item.vehicleName}`)}
        >
          <Text style={styles.actionButtonText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Transport</Text>
          <TouchableOpacity style={styles.filterIconButton}>
            <Ionicons name="options-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#003580" />
          </View>
        ) : (
          <FlatList
            data={vehicles}
            renderItem={renderVehicleCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003580']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={80} color="#E0E0E0" />
                <Text style={styles.emptyText}>No vehicles available at the moment.</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                  <Text style={styles.refreshButtonText}>Refresh List</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7', 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F3F5F7',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  filterIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHero: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9EDF2',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  typeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backdropFilter: 'blur(10px)', // For web support if applicable
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003580',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  priceFloatingBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#003580',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#003580',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceAmount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cardContent: {
    padding: 24,
  },
  mainInfo: {
    marginBottom: 16,
  },
  vehicleNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  brandModelText: {
    fontSize: 14,
    color: '#6e7c87',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F3F5',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#003580',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#003580',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
    maxWidth: '70%',
  },
  refreshButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshButtonText: {
    color: '#003580',
    fontWeight: '700',
    fontSize: 14,
  },
});

