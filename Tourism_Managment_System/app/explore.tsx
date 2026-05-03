import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { API_BASE } from '../src/config';
import { resolveImageUrl } from '../src/utils';
import { getAuthToken, getAuthRole, getAuthHeaders } from '../src/auth';

const API_URL = `${API_BASE}/api/tourpacks`;
const { width } = Dimensions.get('window');

type TourPack = {
  _id: string;
  name: string;
  destination: string;
  description?: string;
  image?: string;
  rating?: number;
  price: number;
  duration: number;
  distance?: number;
  category?: string;
  featured?: boolean;
};

const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const categoryForPackage = (pkg: TourPack) => {
  return pkg.category || 'Featured';
};

export default function Explore() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<TourPack[]>([]);
  const [userProfile, setUserProfile] = useState<{ profilePhoto?: string } | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      if (response.ok && data.success) {
        setPackages(Array.isArray(data.data) ? data.data : []);
      } else {
        setPackages([]);
      }
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const checkAdminAndLoad = async () => {
        const role = await getAuthRole();
        if (role === 'admin') {
          router.replace({ pathname: '/admin', params: { admin: 'true' } });
          return;
        }
        
        fetchPackages();

        // Fetch user profile for the icon
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(`${API_BASE}/api/users/me`, { headers });
          if (response.ok) {
            const data = await response.json();
            setUserProfile(data);
          }
        } catch (error) {
          console.error('Error fetching profile in explore:', error);
        }
      };
      checkAdminAndLoad();
    }, [])
  );

  const categories = useMemo(() => {
    const dynamicCategories = Array.from(new Set(packages.map(categoryForPackage)));
    return ['All', ...dynamicCategories];
  }, [packages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((item) => {
      const category = categoryForPackage(item);
      const matchesCategory = activeCategory === 'All' || category === activeCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, packages, searchQuery]);

  const renderPackageCard = ({ item, index }: { item: TourPack; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(700)} style={styles.cardContainer}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.card}
        onPress={() => {
          router.push({ pathname: "/my-tourpacks/[tourPackageId]", params: { tourPackageId: item._id } });
        }}
      >
        {item.image ? (
          <Image source={{ uri: resolveImageUrl(item.image) ?? undefined }} style={styles.cardImage} contentFit="cover" transition={500} />
        ) : (
          <View style={styles.cardImageFallback}>
            <Ionicons name="map-outline" size={52} color="#CBD5E1" />
          </View>
        )}

        <View style={styles.cardOverlay} />

        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
        </View>

        <View style={styles.availabilityBadge}>
          <Text style={styles.availabilityText}>
            {item.duration}D {item.distance ? `• ${item.distance}km` : ''}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FACC15" />
              <Text style={styles.ratingText}>{(item.rating ?? 4.5).toFixed(1)}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryForPackage(item)}</Text>
            </View>
          </View>

          <View>
            <Text style={styles.destinationName}>{item.name}</Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={14} color="#E2E8F0" />
              <Text style={styles.destinationLocation}>{item.destination}</Text>
            </View>
            <Text style={styles.accommodationType}>{item.category || 'General Tour'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Explore Packages</Text>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileButton}>
          {userProfile?.profilePhoto ? (
            <Image 
              source={{ uri: resolveImageUrl(userProfile.profilePhoto) ?? undefined }} 
              style={styles.profileButtonImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <Ionicons name="person-outline" size={22} color="#111827" />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredPackages}
        keyExtractor={(item) => item._id}
        renderItem={renderPackageCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Animated.View entering={FadeInDown.delay(140)} style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#888" />
                <TextInput
                  placeholder="Search packages by name, destination, or category..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#888"
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(220)}>
              <FlatList
                data={categories}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setActiveCategory(item)}
                    style={[styles.categoryChip, activeCategory === item && styles.activeCategoryChip]}
                  >
                    <Text
                      style={[styles.categoryText, activeCategory === item && styles.activeCategoryText]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(280)} style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Adventure awaits</Text>
                <Text style={styles.sectionSubtitle}>Discover Sri Lanka's finest tour packages</Text>
              </View>
              <TouchableOpacity onPress={fetchPackages}>
                <Text style={styles.seeAllText}>Refresh</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#003580" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No packages found</Text>
              <Text style={styles.emptyText}>Try another search term or category.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileButtonImage: {
    width: '100%',
    height: '100%',
  },
  listContent: {
    paddingBottom: 36,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  searchBar: {
    height: 54,
    backgroundColor: '#FFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeCategoryChip: {
    backgroundColor: '#003580',
    borderColor: '#003580',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeCategoryText: {
    color: '#FFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 26,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
  },
  seeAllText: {
    fontSize: 14,
    color: '#003580',
    fontWeight: '600',
  },
  cardContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignSelf: 'stretch',
    height: 255,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  priceBadge: {
    position: 'absolute',
    top: 18,
    left: 18,
    backgroundColor: '#003580',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  priceText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  availabilityText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    gap: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: 'rgba(15,23,42,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  categoryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  destinationName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  destinationLocation: {
    color: '#E2E8F0',
    fontSize: 14,
  },
  accommodationType: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
});
