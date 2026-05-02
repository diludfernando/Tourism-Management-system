import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, FlatList, Modal,
  TextInput, Alert
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { API_BASE } from '../../src/config';
import { getAuthToken } from '../../src/auth';

const { height, width } = Dimensions.get('window');

type TourPack = {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  destination: string;
  maxGroupSize: number;
  image: string;
  gallery?: { url: string; caption: string; isFeatured: boolean }[];
  inclusions: string[];
  availabilityDates: string[];
  category: string;
  tags: string[];
  featured: boolean;
};

export default function TourPackDetailScreen() {
  const router = useRouter();
  const { tourPackageId } = useLocalSearchParams();
  const currentTourPackId = Array.isArray(tourPackageId) ? tourPackageId[0] : tourPackageId;
  const [tourPack, setTourPack] = useState<TourPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const [isGalleryViewerVisible, setIsGalleryViewerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [persons, setPersons] = useState(1);



  useEffect(() => {
    const fetchTourPack = async () => {

      if (!currentTourPackId) {
        setError('Tour pack ID is missing.');
        setLoading(false);
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
            <Text style={[styles.statValue, { color: '#003580' }]}>Rs.{tourPack.price}</Text>
            <Text style={styles.statLabel}>Per Person</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Attendee Selector */}
          <View style={styles.selectorSection}>
            <Text style={styles.sectionTitle}>Number of Attendees</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity 
                style={styles.counterBtn} 
                onPress={() => setPersons(Math.max(1, persons - 1))}
              >
                <Ionicons name="remove" size={24} color="#003580" />
              </TouchableOpacity>
              
              <View style={styles.countDisplay}>
                <Text style={styles.countText}>{persons}</Text>
                <Text style={styles.countLabel}>{persons === 1 ? 'Person' : 'Persons'}</Text>
              </View>

              <TouchableOpacity 
                style={styles.counterBtn} 
                onPress={() => {
                  if (persons < tourPack.maxGroupSize) {
                    setPersons(persons + 1);
                  } else {
                    Alert.alert(
                      'Limit Reached', 
                      `Maximum group size for this tour is ${tourPack.maxGroupSize} persons.`
                    );
                  }
                }}
              >
                <Ionicons name="add" size={24} color="#003580" />
              </TouchableOpacity>
            </View>
            <Text style={styles.limitHint}>Maximum allowed: {tourPack.maxGroupSize} persons</Text>
          </View>

          {/* Gallery */}
          {tourPack.gallery && tourPack.gallery.length > 0 && (
            <View style={styles.carGallerySection}>
              <Text style={styles.sectionTitle}>Gallery</Text>
              <Text style={styles.carGalleryHint}>Swipe left or right to browse</Text>
              {(() => {
                const galleryItems = tourPack.gallery ?? [];
                const galleryCount = galleryItems.length;
                return (
                  <>

                    <View style={styles.carGalleryCarouselWrap}>
                      <FlatList
                        data={galleryItems}
                        keyExtractor={(item, index) => `${item.url}-${index}`}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={width - 40}
                        decelerationRate="fast"
                        bounces={false}
                        onMomentumScrollEnd={(event) => {
                          const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
                          setSelectedGalleryIndex(Math.max(0, Math.min(index, galleryCount - 1)));
                        }}
                        renderItem={({ item, index }) => (
                          <View style={styles.carGallerySlide}>
                            <TouchableOpacity activeOpacity={0.95} onPress={() => setIsGalleryViewerVisible(true)}>
                              <Image
                                source={{ uri: `${API_BASE}${item.url}` }}
                                style={styles.carGalleryMainImage}
                                contentFit="cover"
                                transition={350}
                              />
                            </TouchableOpacity>
                            {item.caption ? (
                              <View style={styles.carGalleryCaptionPill}>
                                <Text style={styles.carGalleryCaptionText}>{item.caption}</Text>
                              </View>
                            ) : null}
                            <View style={styles.carGalleryCounterPill}>
                              <Text style={styles.carGalleryCounterText}>{index + 1} / {galleryCount}</Text>
                            </View>
                          </View>
                        )}
                      />
                    </View>

                    <View style={styles.carGalleryDotsRow}>
                      {galleryItems.map((_, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[styles.carGalleryDot, selectedGalleryIndex === index && styles.carGalleryDotActive]}
                          onPress={() => setSelectedGalleryIndex(index)}
                          activeOpacity={0.8}
                        />
                      ))}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carGalleryThumbnails}>
                      {galleryItems.map((image, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setSelectedGalleryIndex(index)}
                          style={[styles.carThumbnail, selectedGalleryIndex === index && styles.carThumbnailActive]}
                        >
                          <Image
                            source={{ uri: `${API_BASE}${image.url}` }}
                            style={styles.carThumbnailImage}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                );
              })()}
            </View>
          )}

          {/* Description */}
          <Text style={styles.sectionTitle}>About This Package</Text>
          <Text style={styles.description}>{tourPack.description}</Text>

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

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>Total Price ({persons} {persons === 1 ? 'person' : 'persons'})</Text>
          <Text style={styles.bottomPrice}>Rs.{tourPack.price * persons}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.85}
          onPress={async () => {
            const token = await getAuthToken();
            if (!token) {
              Alert.alert(
                "Sign In Required",
                "Please sign in to book this tour package.",
                [{ text: "OK", onPress: () => router.push("/login") }]
              );
              return;
            }

            if (persons > tourPack.maxGroupSize) {
              Alert.alert('Invalid Group Size', `This tour only supports up to ${tourPack.maxGroupSize} persons.`);
              return;
            }
            router.push({
              pathname: '/transport-selection',
              params: { 
                tourPackId: currentTourPackId,
                persons: persons.toString()
              }
            });
          }}
        >
          <Text style={styles.bookBtnText}>Next</Text>
        </TouchableOpacity>
      </View>



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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  heroContainer: { height: height * 0.45, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backBtn: {
    position: 'absolute', top: 55, left: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  backBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  heroContent: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  destinationText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  featuredBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  featuredText: { color: '#000', fontSize: 12, fontWeight: '700' },
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
  gallerySection: { marginBottom: 8 },
  galleryHint: { fontSize: 12, color: '#72809C', marginBottom: 10 },
  galleryCarouselWrap: {
    marginBottom: 10,
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
  galleryCounterPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  galleryCounterText: { color: '#0B1E44', fontSize: 11, fontWeight: '800' },
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
  galleryThumbnails: { marginBottom: 4 },
  thumbnail: {
    width: 76,
    height: 58,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.75,
  },
  thumbnailActive: {
    borderColor: '#003580',
    opacity: 1,
    transform: [{ scale: 1.04 }],
  },
  thumbnailImage: { width: '100%', height: '100%' },
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
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#ECECEC',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 10,
  },
  bottomPriceLabel: { color: '#999', fontSize: 12 },
  bottomPrice: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  perPerson: { fontSize: 13, fontWeight: '400', color: '#999' },
  bookBtn: {
    backgroundColor: '#003580', paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 30,
  },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyNote: { fontSize: 14, color: '#777', marginBottom: 16 },
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
    fontWeight: '500',
  },
  carGallerySection: { marginTop: 8, marginBottom: 8 },
  carGalleryHint: { fontSize: 12, color: '#72809C', marginBottom: 10 },
  carGalleryCarouselWrap: {
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E9EEF7',
  },
  carGallerySlide: {
    width: width - 40,
    height: 250,
    position: 'relative',
  },
  carGalleryMainImage: { width: '100%', height: '100%' },
  carGalleryCaptionPill: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '82%',
  },
  carGalleryCaptionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  carGalleryCounterPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.90)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  carGalleryCounterText: { color: '#0B1E44', fontSize: 11, fontWeight: '800' },
  carGalleryDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  carGalleryDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#C6D0E0',
    marginHorizontal: 4,
  },
  carGalleryDotActive: {
    width: 22,
    backgroundColor: '#003580',
  },
  carGalleryThumbnails: { marginBottom: 16 },
  carThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  carThumbnailActive: {
    borderColor: '#003580',
  },
  carThumbnailImage: {
    width: '100%',
    height: '100%',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bookingModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 24,
  },
  bookingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  bookingModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  closeModalText: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  bookingFormScroll: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  partyRow: {
    flexDirection: 'row',
  },
  priceSummary: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  priceSummaryLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceSummaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E40AF',
    marginTop: 4,
  },
  confirmBookingBtn: {
    backgroundColor: '#003580',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#003580',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 40,
  },
  confirmBookingBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  selectorSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginVertical: 10,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  countDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  countText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#003580',
  },
  countLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  limitHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#777',
    marginTop: 10,
    fontStyle: 'italic',
  },
});