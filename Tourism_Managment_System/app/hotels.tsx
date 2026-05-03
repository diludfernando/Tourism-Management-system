import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { API_BASE } from '../src/config';
import { resolveImageUrl } from '../src/utils';
import { getAuthHeaders, getAuthRole } from '../src/auth';

const API_URL = `${API_BASE}/api/hotels`;
const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function HotelListScreen() {
  const router = useRouter();
  const { transportId, tourPackId, admin, persons } = useLocalSearchParams<{ 
    transportId?: string; 
    tourPackId?: string; 
    admin?: string;
    persons?: string;
  }>();
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasVerifiedRole, setHasVerifiedRole] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const isSelectionMode = Boolean(transportId) || Boolean(tourPackId);

  useEffect(() => {
    const verifyRole = async () => {
      if (admin !== 'true') {
        setIsAdminMode(false);
        setHasVerifiedRole(true);
        return;
      }

      const role = await getAuthRole();
      const allowed = role === 'admin';
      setIsAdminMode(allowed);
      setHasVerifiedRole(true);
    };

    verifyRole();
  }, [admin]);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      if (response.ok) {
        let filteredHotels = data;
        
        if (tourPackId) {
          try {
            const tpResponse = await fetch(`${API_BASE}/api/tourpacks/${tourPackId}`);
            const tpData = await tpResponse.json();
            const destination = tpData.data?.destination || tpData.destination;
            if (tpResponse.ok && destination) {
              const dest = destination.toLowerCase();
              filteredHotels = data.filter((hotel: any) => 
                hotel.location && hotel.location.toLowerCase().includes(dest)
              );
            }
          } catch (tpError) {
            console.error('Failed to fetch tour package for filtering:', tpError);
          }
        }
        
        setHotels(filteredHotels);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch hotels');
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHotels();
    }, [])
  );

  const executeDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (response.ok) {
        if (Platform.OS !== 'web') Alert.alert('Success', 'Hotel deleted successfully');
        else alert('Hotel deleted successfully');
        fetchHotels(); // Refresh list
      } else {
        const data = await response.json();
        if (Platform.OS !== 'web') Alert.alert('Error', data.message || 'Failed to delete hotel');
        else alert(data.message || 'Failed to delete hotel');
      }
    } catch (error) {
      console.error('Delete Error:', error);
      if (Platform.OS !== 'web') Alert.alert('Error', 'An error occurred while deleting.');
      else alert('An error occurred while deleting.');
    }
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this accommodation?');
      if (confirmed) {
        executeDelete(id);
      }
    } else {
      Alert.alert(
        'Delete Hotel',
        'Are you sure you want to delete this accommodation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => executeDelete(id)
          }
        ]
      );
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {/* Hero Image Section */}
      <View style={styles.cardHero}>
        {item.image ? (
          <Image source={{ uri: resolveImageUrl(item.image) ?? undefined }} style={styles.heroImage} contentFit="cover" transition={500} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="business-outline" size={64} color="#003580" />
          </View>
        )}
        <View style={styles.heroOverlay} />
        
        {/* Floating Badges */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.accommodationType}</Text>
        </View>
        
        <View style={styles.priceFloatingBadge}>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.priceAmount}>{formatPrice(item.pricePerNight)}</Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          <Text style={styles.hotelNameText}>{item.name}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="location" size={18} color="#003580" />
            <Text style={styles.statText}>{item.location}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="bed" size={18} color="#003580" />
            <Text style={styles.statText}>{item.availableRooms} Left</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() =>
              router.push({
                pathname: '/hotel-details',
                params: {
                  id: String(item._id),
                  ...(isAdminMode ? { admin: 'true' } : {}),
                  ...(transportId ? { transportId } : {}),
                  ...(tourPackId ? { tourPackId } : {}),
                  ...(persons ? { persons } : {}),
                },
              })
            }
          >
            <Text style={styles.actionButtonText}>{isAdminMode ? 'Manage' : 'Next'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>

          {isAdminMode && (
            <View style={styles.adminActions}>
              <TouchableOpacity 
                style={[styles.adminButton, styles.editButton]}
                onPress={(e: any) => {
                  if (e && e.stopPropagation) e.stopPropagation();
                  router.push({ pathname: '/edit-hotel', params: { id: item._id, admin: 'true' } });
                }}
              >
                <Ionicons name="create-outline" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.adminButton, styles.deleteButton]}
                onPress={(e: any) => {
                  if (e && e.stopPropagation) e.stopPropagation();
                  handleDelete(item._id);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              if (isAdminMode) {
                router.push({ pathname: '/admin', params: { admin: 'true' } });
              } else if (transportId) {
                router.push({ pathname: '/transport-selection', params: { tourPackId, persons } });
              } else if (tourPackId) {
                router.push({ pathname: `/my-tourpacks/${tourPackId}`, params: { persons } } as any);
              } else {
                router.push('/explore');
              }
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAdminMode ? 'Manage Accommodations' : isSelectionMode ? 'Choose Accommodation' : 'Browse Accommodations'}
        </Text>
        {!isAdminMode ? (
          <View style={{ width: 44 }} /> // Placeholder to keep title centered if needed, or just remove
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/add-hotel', params: { admin: 'true' } })} style={styles.addButton}>
              <Ionicons name="add" size={28} color="#003580" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#003580" />
        </View>
      ) : hotels.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="business-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No accommodations found.</Text>
          {isAdminMode ? (
            <TouchableOpacity 
              style={styles.addFirstButton}
              onPress={() => router.push({ pathname: '/add-hotel', params: { admin: 'true' } })}
            >
              <Text style={styles.addFirstButtonText}>Add New Accommodation</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={hotels}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
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
  addButton: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  hotelNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statText: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '700',
    flexShrink: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
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
  adminActions: {
    flexDirection: 'row',
    gap: 8,
  },
  adminButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#F57C00',
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
  emptyText: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
    maxWidth: '70%',
  },
  addFirstButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#003580',
    borderRadius: 16,
  },
  addFirstButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
