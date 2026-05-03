import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';;
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { API_BASE } from '../src/config';

const API_URL = `${API_BASE}/api/transportation`;

const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TransportationListScreen() {
  const router = useRouter();
  const { admin } = useLocalSearchParams<{ admin?: string }>();
  const [transportation, setTransportation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdminMode = admin === 'true';

  const fetchTransportation = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      if (response.ok) {
        setTransportation(data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch transportation');
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
      fetchTransportation();
    }, [])
  );

  const executeDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        if (Platform.OS !== 'web') Alert.alert('Success', 'Vehicle deleted successfully');
        else alert('Vehicle deleted successfully');
        fetchTransportation(); // Refresh list
      } else {
        const data = await response.json();
        if (Platform.OS !== 'web') Alert.alert('Error', data.message || 'Failed to delete vehicle');
        else alert(data.message || 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error('Delete Error:', error);
      if (Platform.OS !== 'web') Alert.alert('Error', 'An error occurred while deleting.');
      else alert('An error occurred while deleting.');
    }
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this vehicle?');
      if (confirmed) {
        executeDelete(id);
      }
    } else {
      Alert.alert(
        'Delete Vehicle',
        'Are you sure you want to delete this vehicle?',
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
      <View style={styles.cardHero}>
        {item.vehicleImage ? (
          <Image source={{ uri: item.vehicleImage }} style={styles.heroImage} contentFit="cover" transition={500} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="bus-outline" size={64} color="#003580" />
          </View>
        )}
        <View style={styles.heroOverlay} />
        
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.vehicleType}</Text>
        </View>
        
        <View style={styles.priceFloatingBadge}>
          <Text style={styles.priceLabel}>Daily Rate</Text>
          <Text style={styles.priceAmount}>{formatPrice(item.price)}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          <Text style={styles.vehicleNameText}>{item.brandModel || 'Unnamed Vehicle'}</Text>
          <Text style={styles.plateText}>{item.plateNumber}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={18} color="#003580" />
            <Text style={styles.statText}>{item.capacity} Seats</Text>
          </View>
          {item.contactNumber && (
            <View style={[styles.statItem, { marginLeft: 10 }]}>
              <Ionicons name="call" size={18} color="#003580" />
              <Text style={styles.statText}>{item.contactNumber}</Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {isAdminMode && (
          <View style={styles.adminActions}>
            <TouchableOpacity 
              style={[styles.adminButton, styles.editButton]}
              onPress={() => {
                router.push({ pathname: '/edit-transportation', params: { id: item._id, admin: 'true' } });
              }}
            >
              <Ionicons name="create-outline" size={20} color="#FFF" />
              <Text style={styles.adminButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.adminButton, styles.deleteButton]}
              onPress={() => handleDelete(item._id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FFF" />
              <Text style={styles.adminButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/admin', params: { admin: 'true' } })}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Transportation</Text>
        <TouchableOpacity 
          onPress={() => router.push({ pathname: '/add-transportation', params: { admin: 'true' } })} 
          style={styles.addButton}
        >
          <Ionicons name="add" size={28} color="#003580" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#003580" />
        </View>
      ) : transportation.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="bus-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No vehicles found.</Text>
          <TouchableOpacity 
            style={styles.addFirstButton}
            onPress={() => router.push({ pathname: '/add-transportation', params: { admin: 'true' } })}
          >
            <Text style={styles.addFirstButtonText}>Add New Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transportation}
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
    borderRadius: 24,
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
    height: 200,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003580',
    textTransform: 'uppercase',
  },
  priceFloatingBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#003580',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceAmount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cardContent: {
    padding: 20,
  },
  mainInfo: {
    marginBottom: 12,
  },
  vehicleNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  plateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statText: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 20,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 12,
  },
  adminButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  adminButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
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
