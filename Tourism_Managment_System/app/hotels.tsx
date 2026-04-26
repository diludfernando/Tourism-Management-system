import React, { useState, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export default function HotelListScreen() {
  const router = useRouter();
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/hotels`);
      const data = await response.json();
      if (response.ok) {
        setHotels(data);
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
      const response = await fetch(`${API_URL}/api/hotels/${id}`, {
        method: 'DELETE',
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
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push({ pathname: '/hotel-details', params: { id: item._id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.hotelName}>{item.name}</Text>
        <Text style={styles.hotelType}>{item.accommodationType}</Text>
      </View>
      <Text style={styles.hotelLocation}>
        <Ionicons name="location-outline" size={14} /> {item.location}
      </Text>
      <View style={styles.cardDetails}>
        <Text style={styles.priceText}>LKR {item.pricePerNight} / night</Text>
        <Text style={[styles.statusText, item.isAvailable ? styles.available : styles.unavailable]}>
          {item.isAvailable ? `Available (${item.availableRooms} rooms)` : 'Sold Out'}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={(e: any) => {
            if (e && e.stopPropagation) e.stopPropagation();
            router.push({ pathname: '/edit-hotel', params: { id: item._id } });
          }}
        >
          <Ionicons name="create-outline" size={16} color="#FFF" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={(e: any) => {
            if (e && e.stopPropagation) e.stopPropagation();
            handleDelete(item._id);
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#FFF" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Accommodations</Text>
        <TouchableOpacity onPress={() => router.push('/add-hotel')} style={styles.addButton}>
          <Ionicons name="add" size={28} color="#003580" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#003580" />
        </View>
      ) : hotels.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="business-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No accommodations found.</Text>
          <TouchableOpacity 
            style={styles.addFirstButton}
            onPress={() => router.push('/add-hotel')}
          >
            <Text style={styles.addFirstButtonText}>Add New Accommodation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hotels}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  addButton: {
    padding: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  addFirstButton: {
    backgroundColor: '#003580',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  hotelType: {
    fontSize: 12,
    color: '#003580',
    backgroundColor: '#E6F0FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hotelLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  available: {
    color: '#2E7D32',
  },
  unavailable: {
    color: '#D32F2F',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 5,
  },
  editButton: {
    backgroundColor: '#F57C00',
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
