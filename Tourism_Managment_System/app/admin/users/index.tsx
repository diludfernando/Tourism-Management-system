import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE } from '../../../src/config';
import { getAuthHeaders, getAuthRole } from '../../../src/auth';

type UserItem = {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  createdAt?: string;
  updatedAt?: string;
};

const API_URL = `${API_BASE}/api/users`;

export default function AdminUsersScreen() {
  const router = useRouter();
  const { admin } = useLocalSearchParams<{ admin?: string }>();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasVerifiedRole, setHasVerifiedRole] = useState(false);
  const isAdminMode = admin === 'true';

  useEffect(() => {
    const verifyRole = async () => {
      const role = await getAuthRole();

      if (role !== 'admin') {
        router.replace('/explore');
      }

      setHasVerifiedRole(true);
    };

    verifyRole();
  }, [isAdminMode, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_URL, { headers });
      const data = await response.json();

      if (response.ok) {
        setUsers(Array.isArray(data) ? data : []);
      } else {
        Alert.alert('Error', data?.message || 'Failed to load users');
      }
    } catch {
      Alert.alert('Error', 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phoneNumber || '').toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
      );
    });
  }, [searchText, users]);

  const adminCount = useMemo(() => users.filter((user) => user.role === 'admin').length, [users]);
  const userCount = useMemo(() => users.length - adminCount, [users.length, adminCount]);

  const deleteUser = async (user: UserItem) => {
    Alert.alert(
      'Delete user',
      `Remove ${user.name} from the system?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(user._id);
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/${user._id}`, {
                method: 'DELETE',
                headers,
              });
              const raw = await response.text();
              let data: any = {};
              try {
                data = raw ? JSON.parse(raw) : {};
              } catch {
                data = {};
              }

              if (!response.ok) {
                Alert.alert('Error', data?.message || 'Failed to delete user');
                return;
              }

              await loadUsers();
              Alert.alert('Success', data?.message || 'User deleted successfully');
            } catch {
              Alert.alert('Error', 'Unable to connect to server');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (!hasVerifiedRole) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/admin', params: { admin: 'true' } } as any)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#003580" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>Administration</Text>
          <Text style={styles.headerTitle}>User Management</Text>
        </View>
        <View style={styles.headerIconWrap}>
          <Ionicons name="people" size={18} color="#003580" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>People directory</Text>
              <Text style={styles.heroSubtitle}>
                Review registered users and manage access from a single place.
              </Text>
            </View>
            <View style={styles.heroAvatar}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#003580" />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{users.length}</Text>
              <Text style={styles.metricLabel}>Total Users</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{adminCount}</Text>
              <Text style={styles.metricLabel}>Admins</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{userCount}</Text>
              <Text style={styles.metricLabel}>Members</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name, email, phone, or role"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#003580" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name={searchText ? 'search-outline' : 'people-outline'} size={36} color="#003580" />
            <Text style={styles.emptyTitle}>{searchText ? 'No matching users' : 'No users found'}</Text>
            <Text style={styles.emptyText}>
              {searchText
                ? 'Try a different search term or clear the search box.'
                : 'Registered users will appear here.'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user._id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={22} color="#FFF" />
                </View>
                <View style={styles.userMeta}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.inlineMetaRow}>
                    <Ionicons name="call-outline" size={14} color="#6B7280" />
                    <Text style={styles.userPhone}>{user.phoneNumber || 'No phone number'}</Text>
                  </View>
                </View>
                <View style={[styles.roleBadge, user.role === 'admin' ? styles.adminBadge : styles.userBadge]}>
                  <Text style={styles.roleBadgeText}>{user.role.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.cardMetaPill}>
                  <Ionicons name="calendar-outline" size={14} color="#003580" />
                  <Text style={styles.cardMetaText}>
                    Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'recently'}
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => router.push({ pathname: `/admin/users/${user._id}` })}
                >
                  <Ionicons name="eye-outline" size={16} color="#003580" />
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteButton, deletingId === user._id && styles.deleteButtonDisabled]}
                  onPress={() => deleteUser(user)}
                  disabled={deletingId === user._id}
                >
                  {deletingId === user._id ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                  )}
                  <Text style={styles.deleteButtonText}>
                    {deletingId === user._id ? 'Deleting...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
    gap: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003580',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: '#003580',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#00224D',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    paddingRight: 12,
  },
  heroAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  loadingBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  emptyBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 6,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#003580',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    marginTop: 3,
    color: '#4B5563',
    fontSize: 13,
  },
  inlineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  userPhone: {
    color: '#6B7280',
    fontSize: 13,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 10,
  },
  adminBadge: {
    backgroundColor: '#D1FAE5',
  },
  userBadge: {
    backgroundColor: '#DBEAFE',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  cardMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F9FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardMetaText: {
    color: '#003580',
    fontSize: 12,
    fontWeight: '700',
  },
  updatedText: {
    color: '#6B7280',
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E0E7FF',
    borderRadius: 10,
    paddingVertical: 12,
  },
  viewButtonText: {
    color: '#003580',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
  },
  deleteButtonDisabled: {
    opacity: 0.75,
  },
  deleteButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
});