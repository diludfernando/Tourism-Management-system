import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { API_BASE } from '../src/config';

const API_URL = `${API_BASE}/api/hotels`;
const { width } = Dimensions.get('window');

type Hotel = {
  _id: string;
  name: string;
  location: string;
  description?: string;
  pricePerNight: number;
  totalRooms: number;
  availableRooms: number;
  amenities?: string[];
  image?: string;
  rating?: number;
  accommodationType: string;
  contactNumber?: string;
  isAvailable?: boolean;
};

type Review = {
  _id: string;
  user: { name: string; profilePhoto?: string };
  rating: number;
  comment: string;
  createdAt: string;
};
const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function HotelDetailsScreen() {
  const router = useRouter();
  const { id, transportId, tourPackId, admin, persons } = useLocalSearchParams<{ 
    id?: string; 
    transportId?: string; 
    tourPackId?: string;
    admin?: string;
    persons?: string;
  }>();

  console.log('[HotelDetails] Params:', { id, transportId, tourPackId, admin, persons });

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const isAdminMode = admin === 'true';
  const isSelectionMode = Boolean(transportId) || Boolean(tourPackId);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      if (isAdminMode) {
        router.push({ pathname: '/hotels', params: { admin: 'true' } });
      } else if (isSelectionMode) {
        router.push({
          pathname: '/hotels',
          params: { transportId, tourPackId, persons },
        });
      } else {
        router.push('/explore');
      }
    }
  }, [isAdminMode, isSelectionMode, router, transportId, tourPackId, persons]);

  const fetchHotelDetails = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`);
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to fetch hotel details');
        handleBack();
        return;
      }

      setHotel(data);
      fetchHotelReviews();
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
      handleBack();
    } finally {
      setLoading(false);
    }
  }, [handleBack, id]);

  const fetchHotelReviews = async () => {
    if (!id) return;
    try {
      setLoadingReviews(true);
      const response = await fetch(`${API_BASE}/api/feedback/target/${id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[HotelDetails] Reviews fetched:', data.count);
        setReviews(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoadingReviews(false);
    }
  };
  useEffect(() => {
    fetchHotelDetails();
  }, [fetchHotelDetails]);

  const availabilityLabel = useMemo(() => {
    if (!hotel) return '';
    if (!hotel.isAvailable || hotel.availableRooms < 1) return 'Sold out';
    if (hotel.availableRooms === 1) return '1 room left';
    return `${hotel.availableRooms} rooms left`;
  }, [hotel]);

  const availabilityTone = useMemo(() => {
    if (!hotel || !hotel.isAvailable || hotel.availableRooms < 1) return styles.availabilityDanger;
    if (hotel.availableRooms <= 3) return styles.availabilityWarn;
    return styles.availabilityGood;
  }, [hotel]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F4C81" />
      </SafeAreaView>
    );
  }

  if (!hotel) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          {hotel.image ? (
            <Image source={{ uri: hotel.image }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="image-outline" size={64} color="#CBD5E1" />
              <Text style={styles.heroPlaceholderText}>Preview unavailable</Text>
            </View>
          )}
          <View style={styles.heroOverlay} />

          <View style={styles.heroTopBar}>
            <TouchableOpacity style={styles.heroIconButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.heroTopActions}>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>{hotel.accommodationType}</Text>
              </View>
              <TouchableOpacity style={styles.heroIconButton} onPress={() => router.push('/')}>
                <Ionicons name="home-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{hotel.name}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-outline" size={16} color="#E2E8F0" />
              <Text style={styles.heroMetaText}>{hotel.location}</Text>
            </View>
            <View style={styles.heroSummaryRow}>
              <View style={styles.heroPriceBlock}>
                <Text style={styles.heroPrice}>{formatPrice(hotel.pricePerNight)}</Text>
                <Text style={styles.heroPriceLabel}>per night</Text>
              </View>
              <View style={[styles.availabilityPill, availabilityTone]}>
                <Ionicons
                  name={hotel.availableRooms > 0 && hotel.isAvailable ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  size={16}
                  color="#FFF"
                />
                <Text style={styles.availabilityText}>{availabilityLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="bed-outline" size={20} color="#0F4C81" />
              <Text style={styles.metricValue}>{hotel.totalRooms}</Text>
              <Text style={styles.metricLabel}>Total rooms</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="key-outline" size={20} color="#0F4C81" />
              <Text style={styles.metricValue}>{hotel.availableRooms}</Text>
              <Text style={styles.metricLabel}>Available</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="star-outline" size={20} color="#0F4C81" />
              <Text style={styles.metricValue}>{hotel.rating ?? 0}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Overview</Text>
            <Text style={styles.sectionTitle}>Stay profile</Text>
            <Text style={styles.bodyText}>
              {hotel.description?.trim() || 'No description has been added for this property yet.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Planning</Text>
            <Text style={styles.sectionTitle}>Booking details</Text>
            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Accommodation</Text>
                <Text style={styles.detailValue}>{hotel.accommodationType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nightly rate</Text>
                <Text style={styles.detailValue}>{formatPrice(hotel.pricePerNight)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Inventory</Text>
                <Text style={styles.detailValue}>{hotel.availableRooms} of {hotel.totalRooms} open</Text>
              </View>
              {hotel.contactNumber ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact</Text>
                  <Text style={styles.detailValue}>{hotel.contactNumber}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {hotel.amenities && hotel.amenities.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Included</Text>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesWrap}>
                {hotel.amenities.map((amenity, index) => (
                  <View key={`${amenity}-${index}`} style={styles.amenityChip}>
                    <Ionicons name="checkmark" size={14} color="#0F4C81" />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Experiences</Text>
            <Text style={styles.sectionTitle}>Guest Reviews</Text>

            {loadingReviews ? (
              <ActivityIndicator size="small" color="#0F4C81" />
            ) : reviews.length === 0 ? (
              <View style={styles.noReviews}>
                <Ionicons name="chatbubble-outline" size={32} color="#CBD5E1" />
                <Text style={styles.noReviewsText}>No reviews yet. Be the first to review after your stay!</Text>
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {reviews.map((review) => (
                  <View key={review._id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerInfo}>
                        {review.user?.profilePhoto ? (
                          <Image source={{ uri: `${API_BASE}${review.user.profilePhoto}` }} style={styles.reviewerAvatar} />
                        ) : (
                          <View style={styles.reviewerAvatarFallback}>
                            <Text style={styles.reviewerInitial}>{review.user?.name?.charAt(0) || 'U'}</Text>
                          </View>
                        )}
                        <View>
                          <Text style={styles.reviewerName}>{review.user?.name || 'Guest'}</Text>
                          <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View style={styles.reviewRating}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.reviewRatingText}>{review.rating}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewCommentText}>{review.comment}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isAdminMode ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push({ pathname: '/edit-hotel', params: { id: hotel._id, admin: 'true' } })}
          >
            <Ionicons name="create-outline" size={18} color="#FFF" />
            <Text style={styles.primaryButtonText}>Edit Property</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: '/booking',
                params: {
                  hotelId: hotel._id,
                  ...(transportId ? { transportId } : {}),
                  ...(tourPackId ? { tourPackId } : {}),
                  ...(persons ? { persons } : {}),
                },
              })
            }
          >
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={styles.primaryButtonText}>{isSelectionMode ? 'Continue Booking' : 'Book This Stay'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
  },
  scrollContent: {
    paddingBottom: 148,
  },
  hero: {
    position: 'relative',
    height: Math.min(width * 0.88, 440),
    backgroundColor: '#0F172A',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
  },
  heroPlaceholderText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  heroTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    gap: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMetaText: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
  },
  heroSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  heroPriceBlock: {
    flex: 1,
  },
  heroPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  heroPriceLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 2,
  },
  availabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  availabilityGood: {
    backgroundColor: 'rgba(5, 150, 105, 0.92)',
  },
  availabilityWarn: {
    backgroundColor: 'rgba(217, 119, 6, 0.92)',
  },
  availabilityDanger: {
    backgroundColor: 'rgba(185, 28, 28, 0.92)',
  },
  availabilityText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 28,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F4C81',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  detailList: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'right',
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EAF2FF',
    borderWidth: 1,
    borderColor: '#C7DBF7',
  },
  amenityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryButton: {
    backgroundColor: '#0F4C81',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  noReviews: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noReviewsText: {
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  reviewsList: {
    gap: 16,
  },
  reviewItem: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  reviewCommentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
});
