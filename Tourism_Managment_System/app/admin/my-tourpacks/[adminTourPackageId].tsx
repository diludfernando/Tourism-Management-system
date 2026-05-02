import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, FlatList, Modal,
  Alert, Platform, SafeAreaView
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { adminTourPacksEditRoute, adminTourPacksListRoute } from '../../../src/routes/adminTourpacks';
import { API_BASE } from '../../../src/config';
import { getAuthHeaders } from '../../../src/auth';

const { width } = Dimensions.get('window');

type TourPack = {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  destination: string;
  maxGroupSize: number;
  image: string;
  gallery: { url: string; caption?: string; isFeatured?: boolean }[];
  inclusions: string[];
  availabilityDates: string[];
  category: string;
  tags: string[];
  featured: boolean;
};

export default function AdminTourPackDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawAdminId = (params as any).adminTourPackageId ?? (params as any).tourPackageId ?? (params as any).tourPackId;
  const rawQueryId = (params as any).id ?? (params as any)._id;
  const adminTourPackageId = Array.isArray(rawAdminId) ? rawAdminId[0] : rawAdminId;
  const queryId = Array.isArray(rawQueryId) ? rawQueryId[0] : rawQueryId;
  const currentTourPackId = adminTourPackageId || queryId;

  const [tourPack, setTourPack] = useState<TourPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const [isGalleryViewerVisible, setIsGalleryViewerVisible] = useState(false);

  useEffect(() => {
    const fetchTourPack = async () => {
      if (!currentTourPackId) {
        setError('Tour pack ID is missing.');
        setLoading(false);
        return;
      }

      if (typeof currentTourPackId === 'string' && /^(index|create|edit)$/i.test(currentTourPackId)) {
        router.replace(adminTourPacksListRoute as any);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/tourpacks/${currentTourPackId}`);
        const data = await response.json();
        if (data.success) {
          setTourPack(data.data);
        } else {
          setError('Tour pack not found');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchTourPack();
  }, [currentTourPackId]);

  const confirmDelete = () => {
    Alert.alert('Delete Package', 'Are you sure you want to delete this tour package?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
  };

  const handleDelete = async () => {
    if (!currentTourPackId) return;
    setDeleting(true);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/tourpacks/${currentTourPackId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Tour package removed.');
        router.replace(adminTourPacksListRoute);
      } else {
        Alert.alert('Error', data.message || 'Delete failed');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#003580" />
      </View>
    );
  }

  if (error || !tourPack) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Package Details</Text>
        <TouchableOpacity 
          onPress={() => router.push(`/admin/my-tourpacks/edit?id=${encodeURIComponent(currentTourPackId)}` as any)} 
          style={styles.headerBtn}
        >
          <Ionicons name="create-outline" size={24} color="#003580" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Image
            source={
              tourPack.image
                ? { uri: `${API_BASE}${tourPack.image}` }
                : require('@/assets/images/travel-hero.png')
            }
            style={styles.heroImage}
            contentFit="cover"
            transition={500}
          />
          <View style={styles.heroOverlay} />
          
          <View style={styles.heroInfo}>
            <View style={styles.destinationBadge}>
              <Ionicons name="location" size={14} color="#003580" />
              <Text style={styles.destinationText}>{tourPack.destination}</Text>
            </View>
            <Text style={styles.packageName}>{tourPack.name}</Text>
            {tourPack.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#003580" />
                <Text style={styles.featuredText}>Featured Package</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#003580" />
            <Text style={styles.statValue}>{tourPack.duration}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={24} color="#003580" />
            <Text style={styles.statValue}>{tourPack.maxGroupSize}</Text>
            <Text style={styles.statLabel}>Max Group</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={24} color="#003580" />
            <Text style={[styles.statValue, { fontSize: 16 }]}>Rs.{tourPack.price}</Text>
            <Text style={styles.statLabel}>Per Person</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Package</Text>
          <Text style={styles.descriptionText}>{tourPack.description}</Text>
        </View>

        {/* Gallery Section */}
        {tourPack.gallery?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {tourPack.gallery.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => {
                    setSelectedGalleryIndex(index);
                    setIsGalleryViewerVisible(true);
                  }}
                >
                  <Image source={{ uri: `${API_BASE}${item.url}` }} style={styles.galleryThumb} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Inclusions */}
        {tourPack.inclusions?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's Included</Text>
            {tourPack.inclusions.map((item, index) => (
              <View key={index} style={styles.inclusionItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.inclusionText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity 
          style={[styles.deleteButton, deleting && { opacity: 0.7 }]}
          onPress={confirmDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#FFF" />
              <Text style={styles.deleteButtonText}>Delete Package</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Gallery Viewer Modal */}
      <Modal visible={isGalleryViewerVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setIsGalleryViewerVisible(false)}>
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          <Image 
            source={{ uri: `${API_BASE}${tourPack.gallery[selectedGalleryIndex]?.url}` }} 
            style={styles.modalImage} 
            contentFit="contain" 
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F3F5F7',
  },
  headerBtn: {
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
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    height: 250,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  heroInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  destinationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  destinationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003580',
  },
  packageName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003580',
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 22,
  },
  galleryScroll: {
    flexDirection: 'row',
  },
  galleryThumb: {
    width: 120,
    height: 90,
    borderRadius: 15,
    marginRight: 12,
  },
  inclusionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  inclusionText: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#003580',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 15,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
});