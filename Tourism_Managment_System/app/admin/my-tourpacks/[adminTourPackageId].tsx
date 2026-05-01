import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, FlatList, Modal,
  Alert, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { adminTourPacksEditRoute, adminTourPacksListRoute } from '../../../src/routes/adminTourpacks';
import { API_BASE } from '../../../src/config';
import { getAuthHeaders } from '../../../src/auth';

const { height, width } = Dimensions.get('window');

type TourPack = {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  destination: string;
  maxGroupSize: number;
  kilometers: number;
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

  console.log('AdminTourPackDetail - resolved ID:', currentTourPackId, 'rawParams:', params);
  const [tourPack, setTourPack] = useState<TourPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const [isGalleryViewerVisible, setIsGalleryViewerVisible] = useState(false);

  useEffect(() => {
    const fetchTourPack = async () => {
      if (!currentTourPackId) {
        setError('Tour pack ID is missing.');
        setLoading(false);
        return;
      }

      // Guard against routing to the literal 'index'/'create'/'edit' path being interpreted as an ID
      if (typeof currentTourPackId === 'string' && /^(index|create|edit)$/i.test(currentTourPackId)) {
        console.warn('Admin detail opened with invalid id segment:', currentTourPackId);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#003580" />
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert('Delete package', 'Are you sure you want to delete this tour package?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
  };

  const handleDelete = async () => {
    if (!currentTourPackId) {
      Alert.alert('Error', 'Tour pack ID is missing.');
      return;
    }
    setDeleting(true);
    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders.Authorization) {
        Alert.alert('Session expired', 'Please sign in again as admin.');
        router.replace('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/api/tourpacks/${currentTourPackId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await response.json();
      if (data.success) {
        setBanner({ type: 'success', message: 'Tour package removed.' });
        setTimeout(() => {
          router.replace(adminTourPacksListRoute);
        }, 1500);
      } else {
        setBanner({ type: 'error', message: data.message || 'Delete failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  if (error || !tourPack) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAlt}>
          <Text style={styles.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {banner && (
        <View style={[styles.banner, banner.type === 'success' ? styles.successBanner : styles.errorBanner]}>
          <Text style={styles.bannerText}>{banner.message}</Text>
          <TouchableOpacity onPress={() => setBanner(null)} style={styles.bannerClose}>
            <Text style={styles.bannerCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Image */}
        <View style={styles.heroContainer}>
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>ADMIN DETAIL</Text>
            </View>
            <Text style={styles.destinationText}>📍 {tourPack.destination}</Text>
            <Text style={styles.heroTitle}>{tourPack.name}</Text>
            {tourPack.featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>⭐ Featured</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tourPack.duration}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tourPack.maxGroupSize}</Text>
            <Text style={styles.statLabel}>Max Group</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tourPack.kilometers}</Text>
            <Text style={styles.statLabel}>Km</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#003580' }]}>Rs.{tourPack.price}</Text>
            <Text style={styles.statLabel}>Per Person</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Description */}
          <Text style={styles.sectionTitle}>About This Package</Text>
          <Text style={styles.description}>{tourPack.description}</Text>

          {/* Gallery */}
          <Text style={styles.sectionTitle}>Gallery</Text>
          {tourPack.gallery?.length > 0 ? (
            <>
              <Text style={styles.galleryCount}>{tourPack.gallery.length} image(s) uploaded</Text>
              <Text style={styles.galleryHint}>Swipe to browse gallery images</Text>

              <View style={styles.galleryCarouselWrap}>
                <FlatList
                  data={tourPack.gallery}
                  keyExtractor={(item, index) => `${item.url}-${index}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={width - 40}
                  decelerationRate="fast"
                  bounces={false}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
                    setSelectedGalleryIndex(Math.max(0, Math.min(index, tourPack.gallery.length - 1)));
                  }}
                  renderItem={({ item, index }) => (
                    <View style={styles.gallerySlide}>
                      <TouchableOpacity activeOpacity={0.95} onPress={() => setIsGalleryViewerVisible(true)}>
                        <Image
                          source={{ uri: `${API_BASE}${item.url}` }}
                          style={styles.galleryMainImage}
                          contentFit="cover"
                          transition={350}
                        />
                      </TouchableOpacity>
                      <View style={styles.galleryCounterPill}>
                        <Text style={styles.galleryCounterText}>{index + 1} / {tourPack.gallery.length}</Text>
                      </View>
                      {item.caption ? (
                        <View style={styles.galleryCaptionPill}>
                          <Text style={styles.galleryCaptionText}>{item.caption}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                />
              </View>

              <View style={styles.galleryDotsRow}>
                {tourPack.gallery.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.galleryDot, selectedGalleryIndex === index && styles.galleryDotActive]}
                    onPress={() => setSelectedGalleryIndex(index)}
                    activeOpacity={0.8}
                  />
                ))}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryList}>
                {tourPack.gallery.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.url}-${index}`}
                    style={[styles.galleryThumbWrap, selectedGalleryIndex === index && styles.galleryThumbWrapActive]}
                    onPress={() => setSelectedGalleryIndex(index)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: `${API_BASE}${item.url}` }}
                      style={styles.galleryThumb}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <Text style={styles.emptyNote}>No gallery images uploaded yet.</Text>
          )}

          {/* Inclusions */}
          {tourPack.inclusions?.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Included</Text>
              {tourPack.inclusions.map((item, index) => (
                <View key={index} style={styles.inclusionItem}>
                  <Text style={styles.inclusionIcon}>✓</Text>
                  <Text style={styles.inclusionText}>{item}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyNote}>No inclusions listed for this package.</Text>
          )}

          {/* Category */}
          {tourPack.category && (
            <>
              <Text style={styles.sectionTitle}>Category</Text>
              <Text style={styles.description}>{tourPack.category}</Text>
            </>
          )}

          {/* Tags */}
          {tourPack.tags?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {tourPack.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Available Dates */}
          {tourPack.availabilityDates?.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Available Dates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {tourPack.availabilityDates.map((date, index) => (
                  <View key={index} style={styles.dateBadge}>
                    <Text style={styles.dateText}>
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <Text style={styles.emptyNote}>No availability dates set yet.</Text>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => currentTourPackId && router.push(`/admin/my-tourpacks/edit?id=${encodeURIComponent(currentTourPackId)}` as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
              onPress={confirmDelete}
              disabled={deleting}
              activeOpacity={0.85}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.deleteBtnText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <Modal
        visible={isGalleryViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGalleryViewerVisible(false)}
      >
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerCloseBtn} onPress={() => setIsGalleryViewerVisible(false)}>
              <Text style={styles.viewerCloseText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.viewerCounterText}>{selectedGalleryIndex + 1} / {tourPack.gallery?.length || 0}</Text>
          </View>

          <FlatList
            data={tourPack.gallery || []}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedGalleryIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setSelectedGalleryIndex(Math.max(0, Math.min(index, (tourPack.gallery?.length || 1) - 1)));
            }}
            renderItem={({ item }) => (
              <View style={styles.viewerSlide}>
                <Image source={{ uri: `${API_BASE}${item.url}` }} style={styles.viewerImage} contentFit="contain" transition={250} />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F8' },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#4CAF50',
  },
  successBanner: { backgroundColor: '#4CAF50' },
  errorBanner: { backgroundColor: '#F44336' },
  bannerText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  bannerClose: { padding: 4 },
  bannerCloseText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  heroContainer: { height: height * 0.45, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 12, 37, 0.72)',
  },
  backBtn: {
    position: 'absolute', top: 55, left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  backBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  heroContent: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  adminPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  adminPillText: { color: '#0B1E44', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  destinationText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 20, marginTop: -24, borderRadius: 16,
    padding: 20, justifyContent: 'space-around', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: '#ECECEC' },
  content: { padding: 20, marginTop: 16 },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#1A1A2E',
    marginBottom: 12, marginTop: 8,
  },
  description: { fontSize: 15, color: '#555', lineHeight: 24, marginBottom: 16 },
  galleryCount: { fontSize: 13, color: '#003580', marginBottom: 10, fontWeight: '600' },
  galleryHint: { fontSize: 12, color: '#72809C', marginBottom: 10 },
  galleryCarouselWrap: {
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E9EEF7',
  },
  gallerySlide: {
    width: width - 40,
    height: 250,
    position: 'relative',
  },
  galleryMainImage: { width: '100%', height: '100%' },
  galleryCounterPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.90)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  galleryCounterText: { color: '#0B1E44', fontSize: 11, fontWeight: '800' },
  galleryCaptionPill: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '82%',
  },
  galleryCaptionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  galleryDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  galleryDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#C6D0E0',
    marginHorizontal: 4,
  },
  galleryDotActive: {
    width: 22,
    backgroundColor: '#003580',
  },
  galleryList: { marginBottom: 16 },
  galleryThumbWrap: {
    width: 120,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#fff',
  },
  galleryThumbWrapActive: {
    borderColor: '#003580',
    transform: [{ scale: 1.03 }],
  },
  galleryThumb: { width: '100%', height: '100%' },
  inclusionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  inclusionIcon: {
    color: '#fff', backgroundColor: '#003580',
    width: 22, height: 22, borderRadius: 11,
    textAlign: 'center', lineHeight: 22,
    fontSize: 12, marginRight: 10, fontWeight: '700',
  },
  inclusionText: { fontSize: 14, color: '#444' },
  dateBadge: {
    backgroundColor: '#EEF2FF', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20, marginRight: 10,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  dateText: { color: '#003580', fontSize: 13, fontWeight: '500' },
  emptyNote: { fontSize: 14, color: '#777', marginBottom: 16 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 12,
    marginTop: 24,
  },
  editBtn: {
    flex: 1, backgroundColor: '#0B1E44', paddingVertical: 14,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    flex: 1, backgroundColor: '#E53935', paddingVertical: 14,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  deleteBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorText: { color: '#E53935', fontSize: 15, marginBottom: 16 },
  backBtnAlt: {
    backgroundColor: '#003580', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 20,
  },
  backBtnAltText: { color: '#fff', fontWeight: '600' },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  tagText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  featuredBadge: {
    backgroundColor: '#FFD700',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  featuredText: {
    color: '#003580',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.96)',
    paddingTop: 54,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewerCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  viewerCloseText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  viewerCounterText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  viewerSlide: { width, flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '100%' },
});