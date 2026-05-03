import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { tourPackDetailRoute } from '../../src/routes/tourpacks';
import { API_BASE } from '../../src/config';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = `${API_BASE}/api/tourpacks`;

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
  category: string;
  tags: string[];
  featured: boolean;
  difficulty?: string;
};

export default function TourPackList() {
  const router = useRouter();
  const [tourPacks, setTourPacks] = useState<TourPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [minKilometers, setMinKilometers] = useState('');
  const [maxKilometers, setMaxKilometers] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const latestRequestIdRef = useRef(0);

  const clearAllFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setMinDuration('');
    setMaxDuration('');
    setMinKilometers('');
    setMaxKilometers('');
    setSelectedDifficulty('');
    setSortBy('featured');
  };

  const formatPriceChip = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value;
    if (num >= 1000) return `${Math.round(num / 1000)}k`;
    return `${num}`;
  };

  const activeFilters = [
    minPrice ? { key: 'minPrice', label: `Min ${formatPriceChip(minPrice)}`, onRemove: () => setMinPrice('') } : null,
    maxPrice ? { key: 'maxPrice', label: `Max ${formatPriceChip(maxPrice)}`, onRemove: () => setMaxPrice('') } : null,
    minDuration ? { key: 'minDuration', label: `Min ${minDuration} days`, onRemove: () => setMinDuration('') } : null,
    maxDuration ? { key: 'maxDuration', label: `Max ${maxDuration} days`, onRemove: () => setMaxDuration('') } : null,
    minKilometers ? { key: 'minKilometers', label: `Min ${minKilometers}km`, onRemove: () => setMinKilometers('') } : null,
    maxKilometers ? { key: 'maxKilometers', label: `Max ${maxKilometers}km`, onRemove: () => setMaxKilometers('') } : null,
    selectedDifficulty
      ? {
          key: 'difficulty',
          label: selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1),
          onRemove: () => setSelectedDifficulty(''),
        }
      : null,
    sortBy && sortBy !== 'featured'
      ? {
          key: 'sortBy',
          label: `Sort: ${sortBy.replace('-', ' ')}`,
          onRemove: () => setSortBy('featured'),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const fetchTourPacks = async () => {
    const requestId = ++latestRequestIdRef.current;
    try {
      const params = new URLSearchParams();
      if (minPrice.trim()) params.append('minPrice', minPrice.trim());
      if (maxPrice.trim()) params.append('maxPrice', maxPrice.trim());
      if (minDuration.trim()) params.append('minDuration', minDuration.trim());
      if (maxDuration.trim()) params.append('maxDuration', maxDuration.trim());
      if (minKilometers.trim()) params.append('minKilometers', minKilometers.trim());
      if (maxKilometers.trim()) params.append('maxKilometers', maxKilometers.trim());
      if (selectedDifficulty.trim()) params.append('difficulty', selectedDifficulty.trim());
      if (sortBy.trim()) params.append('sortBy', sortBy.trim());

      const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;
      const response = await fetch(url);
      const data = await response.json();

      // Ignore stale responses from older requests.
      if (requestId !== latestRequestIdRef.current) return;

      if (data.success) {
        setTourPacks(data.data);
        setError('');
      } else {
        setError('Failed to load tour packages');
      }
    } catch {
      if (requestId === latestRequestIdRef.current) {
        setError('Network error. Please try again.');
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchTourPacks();
  }, [minPrice, maxPrice, minDuration, maxDuration, minKilometers, maxKilometers, selectedDifficulty, sortBy]);

  const filteredTourPacks = tourPacks.filter(pack =>
    pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pack.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pack.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCard = ({ item }: { item: TourPack }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() => router.push(tourPackDetailRoute(item._id) as any)}
    >
      {/* Background Image */}
      <Image
        source={
          item.image
            ? { uri: `${API_BASE}${item.image}` }
            : require('@/assets/images/travel-hero.png')
        }
        style={styles.cardBg}
        contentFit="cover"
        transition={600}
      />

      {/* Gradient Overlay */}
      <View style={styles.cardOverlay} />

      {/* Top Row */}
      <View style={styles.cardTop}>
        <View style={styles.durationPill}>
          <Text style={styles.durationText}>🕐 {item.duration} Days</Text>
        </View>
        <View style={styles.groupPill}>
          <Text style={styles.groupText}>👥 {item.maxGroupSize}</Text>
        </View>
      </View>

      {item.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>FEATURED</Text>
        </View>
      )}

      {/* Bottom Content */}
      <View style={styles.cardBottom}>
        <Text style={styles.cardDestination}>📍 {item.destination}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardFooterRow}>
          <View>
            <Text style={styles.fromLabel}>From</Text>
            <Text style={styles.priceText}>LKR {item.price.toLocaleString()}</Text>
          </View>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View Details →</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Hero Header */}
      <View style={styles.heroHeader}>
        <Image
          source={require('@/assets/images/travel-hero.png')}
          style={styles.headerBg}
          contentFit="cover"
        />
        <View style={styles.headerOverlay} />
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerSub}>LUXE TRAVEL</Text>
              <Text style={styles.headerTitle}>Tour Packages</Text>
              <Text style={styles.headerDesc}>Discover Sri Lanka&apos;s finest experiences</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search packages by name, destination, or category..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters Actions */}
      <View style={styles.filtersActionRow}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.85}
        >
          <Text style={styles.filterBtnText}>{showFilters ? 'Close Filters' : 'Filters'}</Text>
          {activeFilters.length > 0 && <Text style={styles.filterBadge}>{activeFilters.length}</Text>}
        </TouchableOpacity>

        {activeFilters.length > 0 && (
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearAllFilters} activeOpacity={0.85}>
            <Text style={styles.clearFiltersBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <ScrollView
          style={styles.activeFiltersScroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersRow}
        >
          {activeFilters.map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={styles.activeFilterChip}
              onPress={filter.onRemove}
              activeOpacity={0.8}
            >
              <Text style={styles.activeFilterChipText}>{filter.label}  x</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filtersPanelHeader}>
            <Text style={styles.filtersPanelTitle}>Filter Options</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)} activeOpacity={0.8}>
              <Text style={styles.filtersDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersPanelScroll} showsVerticalScrollIndicator={false}>
            {/* Quick Presets */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Quick Budget</Text>
              <View style={styles.sortRow}>
                <TouchableOpacity style={styles.sortBtn} onPress={() => { setMinPrice(''); setMaxPrice('50000'); }}>
                  <Text style={styles.sortBtnText}>Under 50k</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sortBtn} onPress={() => { setMinPrice('50000'); setMaxPrice('100000'); }}>
                  <Text style={styles.sortBtnText}>50k - 100k</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sortBtn} onPress={() => { setMinPrice('100000'); setMaxPrice(''); }}>
                  <Text style={styles.sortBtnText}>100k+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Quick Duration</Text>
              <View style={styles.sortRow}>
                <TouchableOpacity style={styles.sortBtn} onPress={() => { setMinDuration('1'); setMaxDuration('3'); }}>
                  <Text style={styles.sortBtnText}>1-3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sortBtn} onPress={() => { setMinDuration('4'); setMaxDuration('7'); }}>
                  <Text style={styles.sortBtnText}>4-7 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sortBtn} onPress={() => { setMinDuration('8'); setMaxDuration(''); }}>
                  <Text style={styles.sortBtnText}>8+ Days</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Price Range (Rs.)</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Min"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={styles.separator}>-</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Max"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>
            </View>

            {/* Duration Range */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Duration (Days)</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Min"
                  keyboardType="numeric"
                  value={minDuration}
                  onChangeText={setMinDuration}
                />
                <Text style={styles.separator}>-</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Max"
                  keyboardType="numeric"
                  value={maxDuration}
                  onChangeText={setMaxDuration}
                />
              </View>
            </View>

            {/* Distance Range */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Distance (Kilometers)</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Min"
                  keyboardType="numeric"
                  value={minKilometers}
                  onChangeText={setMinKilometers}
                />
                <Text style={styles.separator}>-</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Max"
                  keyboardType="numeric"
                  value={maxKilometers}
                  onChangeText={setMaxKilometers}
                />
              </View>
            </View>

            {/* Difficulty */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Difficulty</Text>
              <View style={styles.difficultyRow}>
                {['easy', 'moderate', 'hard'].map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.difficultyBtn, selectedDifficulty === level && styles.difficultyBtnActive]}
                    onPress={() => setSelectedDifficulty(selectedDifficulty === level ? '' : level)}
                  >
                    <Text style={[styles.difficultyBtnText, selectedDifficulty === level && styles.difficultyBtnTextActive]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.sortRow}>
                {[
                  { value: 'featured', label: 'Featured' },
                  { value: 'price-asc', label: 'Price: Low' },
                  { value: 'price-desc', label: 'Price: High' },
                  { value: 'duration-asc', label: 'Duration' }
                ].map(sort => (
                  <TouchableOpacity
                    key={sort.value}
                    style={[styles.sortBtn, sortBy === sort.value && styles.sortBtnActive]}
                    onPress={() => setSortBy(sort.value)}
                  >
                    <Text style={[styles.sortBtnText, sortBy === sort.value && styles.sortBtnTextActive]}>
                      {sort.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#003580" />
          <Text style={styles.loadingText}>Loading packages...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTourPacks}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTourPacks}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTourPacks(); }} colors={['#003580']} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>🏖️</Text>
              <Text style={styles.emptyTitle}>No packages available</Text>
              <Text style={styles.emptyText}>Check back later for exciting tours</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },

  // Hero Header
  heroHeader: { height: 260, position: 'relative' },
  headerBg: { ...StyleSheet.absoluteFillObject as any },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0, 20, 60, 0.72)',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  backText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  headerTextBlock: { marginBottom: 8 },
  headerSub: {
    color: 'rgba(255,255,255,0.6)', fontSize: 11,
    letterSpacing: 3, marginBottom: 4,
  },
  headerTitle: {
    color: '#fff', fontSize: 32,
    fontWeight: '800', letterSpacing: 0.5,
  },
  headerDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  addBtn: {
    backgroundColor: '#003580',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Cards
  list: { padding: 16, gap: 20 },
  card: {
    height: 260, borderRadius: 24,
    overflow: 'hidden', backgroundColor: '#001a4d',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  cardBg: { ...StyleSheet.absoluteFillObject as any },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0, 10, 40, 0.45)',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 16,
  },
  featuredBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 2,
  },
  featuredBadgeText: {
    color: '#003580',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  durationPill: {
    backgroundColor: '#003580',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  durationText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  groupPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  groupText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  cardBottom: {
    position: 'absolute', bottom: 0,
    left: 0, right: 0, padding: 18,
    backgroundColor: 'rgba(0,10,40,0.6)',
  },
  cardDestination: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12, marginBottom: 4, letterSpacing: 0.5,
  },
  cardName: {
    color: '#fff', fontSize: 20,
    fontWeight: '800', marginBottom: 12, lineHeight: 26,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-end',
  },
  fromLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  priceText: { color: '#FFD700', fontSize: 18, fontWeight: '800' },
  viewBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  viewBtnText: { color: '#003580', fontSize: 12, fontWeight: '700' },

  // Search
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20, marginTop: -20, marginBottom: 20,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  searchInput: {
    backgroundColor: '#F8F9FF', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#1A1A2E',
    borderWidth: 1, borderColor: '#E8ECF4',
  },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { color: '#003580', marginTop: 12, fontSize: 14 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { color: '#333', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#003580', paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center' },

  // Filters
  filtersActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -8,
    marginBottom: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003580',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#0028A0',
  },
  filterBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterBadge: {
    marginLeft: 8,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    textAlign: 'center',
    backgroundColor: '#FFD700',
    color: '#003580',
    fontSize: 12,
    fontWeight: '800',
  },
  clearFiltersBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: '#FFCACA',
  },
  clearFiltersBtnText: {
    color: '#C62828',
    fontWeight: '700',
    fontSize: 12,
  },
  activeFiltersRow: {
    paddingHorizontal: 16,
    paddingRight: 24,
    paddingBottom: 10,
    paddingTop: 2,
    alignItems: 'center',
  },
  activeFiltersScroller: {
    minHeight: 44,
  },
  activeFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E8F0FF',
    borderWidth: 1,
    borderColor: '#C6D8FF',
    marginRight: 8,
    flexShrink: 0,
  },
  activeFilterChipText: {
    color: '#1E4AA8',
    fontSize: 12,
    fontWeight: '700',
  },
  filtersPanel: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 12, borderWidth: 1,
    borderColor: '#E8ECF4',
    maxHeight: 290,
  },
  filtersPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filtersPanelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  filtersDoneText: {
    color: '#003580',
    fontWeight: '700',
    fontSize: 13,
  },
  filtersPanelScroll: {
    maxHeight: 240,
  },
  filterGroup: { marginBottom: 14 },
  filterLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  filterInput: {
    flex: 1, backgroundColor: '#F8F9FF', borderRadius: 10,
    padding: 10, fontSize: 13, color: '#333',
    borderWidth: 1, borderColor: '#E8ECF4',
  },
  priceInputRow: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  separator: { color: '#999', fontSize: 16, fontWeight: '600' },
  difficultyRow: {
    flexDirection: 'row', gap: 8,
  },
  difficultyBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#E8ECF4',
    backgroundColor: '#F8F9FF',
    alignItems: 'center',
  },
  difficultyBtnActive: {
    backgroundColor: '#003580', borderColor: '#003580',
  },
  difficultyBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  difficultyBtnTextActive: { color: '#fff' },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#E8ECF4',
    backgroundColor: '#F8F9FF',
  },
  sortBtnActive: {
    backgroundColor: '#FFD700', borderColor: '#FFD700',
  },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
  sortBtnTextActive: { color: '#003580' },
});