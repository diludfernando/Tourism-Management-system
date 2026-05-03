import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, TextInput, SafeAreaView, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { adminTourPackDetailRoute, adminTourPacksCreateRoute } from '../../../src/routes/adminTourpacks';
import { API_BASE } from '../../../src/config';

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
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const latestRequestIdRef = useRef(0);

  const clearAllFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setMinDuration('');
    setMaxDuration('');
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
      if (selectedDifficulty.trim()) params.append('difficulty', selectedDifficulty.trim());
      if (sortBy.trim()) params.append('sortBy', sortBy.trim());

      const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;
      const response = await fetch(url);
      const data = await response.json();

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
  }, [minPrice, maxPrice, minDuration, maxDuration, selectedDifficulty, sortBy]);

  const filteredTourPacks = tourPacks.filter(pack =>
    pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pack.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pack.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCard = ({ item }: { item: TourPack }) => (
    <View style={styles.card}>
      <View style={styles.cardHero}>
        <Image
          source={
            item.image
              ? { uri: `${API_BASE}${item.image}` }
              : require('@/assets/images/travel-hero.png')
          }
          style={styles.heroImage}
          contentFit="cover"
          transition={500}
        />
        <View style={styles.heroOverlay} />
        
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color="#003580" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        
        <View style={styles.priceFloatingBadge}>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.priceAmount}>LKR {item.price.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          <Text style={styles.nameText}>{item.name}</Text>
          <Text style={styles.destinationText}>📍 {item.destination}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color="#003580" />
            <Text style={styles.statText}>{item.duration} Days</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={18} color="#003580" />
            <Text style={styles.statText}>{item.maxGroupSize} Max</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => router.push(`/admin/my-tourpacks/${encodeURIComponent(item._id)}` as any)}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/admin', params: { admin: 'true' } })}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Tour Packages</Text>
        <TouchableOpacity 
          onPress={() => router.push(adminTourPacksCreateRoute as any)} 
          style={styles.headerBtn}
        >
          <Ionicons name="add" size={28} color="#003580" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTourPacks}
        keyExtractor={(item) => item._id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTourPacks(); }} colors={['#003580']} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search packages..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Toggle */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons name="options-outline" size={20} color={showFilters ? "#FFF" : "#003580"} />
                <Text style={[styles.filterBtnText, showFilters && { color: '#FFF' }]}>Filters</Text>
                {activeFilters.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{activeFilters.length}</Text></View>}
              </TouchableOpacity>
              
              {activeFilters.length > 0 && (
                <TouchableOpacity onPress={clearAllFilters} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {showFilters && (
              <View style={styles.filtersPanel}>
                <Text style={styles.panelTitle}>Filter Options</Text>
                
                <View style={styles.filterGroup}>
                  <Text style={styles.groupLabel}>Budget Range</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity style={styles.chip} onPress={() => { setMinPrice(''); setMaxPrice('50000'); }}>
                      <Text style={styles.chipText}>Under 50k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chip} onPress={() => { setMinPrice('50000'); setMaxPrice('100000'); }}>
                      <Text style={styles.chipText}>50k - 100k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chip} onPress={() => { setMinPrice('100000'); setMaxPrice(''); }}>
                      <Text style={styles.chipText}>100k+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.filterGroup}>
                  <Text style={styles.groupLabel}>Difficulty</Text>
                  <View style={styles.chipRow}>
                    {['easy', 'moderate', 'hard'].map(level => (
                      <TouchableOpacity
                        key={level}
                        style={[styles.chip, selectedDifficulty === level && styles.chipActive]}
                        onPress={() => setSelectedDifficulty(selectedDifficulty === level ? '' : level)}
                      >
                        <Text style={[styles.chipText, selectedDifficulty === level && { color: '#FFF' }]}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterGroup}>
                  <Text style={styles.groupLabel}>Sort By</Text>
                  <View style={styles.chipRow}>
                    {[
                      { value: 'featured', label: 'Featured' },
                      { value: 'price-asc', label: 'Price: Low' },
                      { value: 'price-desc', label: 'Price: High' },
                    ].map(sort => (
                      <TouchableOpacity
                        key={sort.value}
                        style={[styles.chip, sortBy === sort.value && styles.chipActive]}
                        onPress={() => setSortBy(sort.value)}
                      >
                        <Text style={[styles.chipText, sortBy === sort.value && { color: '#FFF' }]}>
                          {sort.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {activeFilters.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
                {activeFilters.map(filter => (
                  <TouchableOpacity key={filter.key} style={styles.activeChip} onPress={filter.onRemove}>
                    <Text style={styles.activeChipText}>{filter.label}</Text>
                    <Ionicons name="close-circle" size={16} color="#003580" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Ionicons name="compass-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No packages found.</Text>
          </View>
        }
      />
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
    letterSpacing: -0.5,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  listHeader: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  filterBtnActive: {
    backgroundColor: '#003580',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#003580',
  },
  badge: {
    backgroundColor: '#FFD700',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003580',
  },
  clearBtn: {
    padding: 5,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#E53935',
    fontWeight: '600',
  },
  filtersPanel: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  filterGroup: {
    marginBottom: 15,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#F3F5F7',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#003580',
    borderColor: '#003580',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  activeFiltersScroll: {
    marginTop: 15,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#003580',
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
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  featuredBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '800',
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
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  destinationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
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
  viewButton: {
    backgroundColor: '#003580',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
  },
  viewButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#A0AEC0',
    marginTop: 10,
    fontWeight: '600',
  },
});