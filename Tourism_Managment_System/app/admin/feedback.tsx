import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';;
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../../src/config';
import { getAuthHeaders, getAuthRole } from '../../src/auth';

interface Feedback {
  _id: string;
  user: { name: string; email: string };
  feedbackType: string;
  targetId?: { name?: string; title?: string };
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
}

export default function AdminFeedbackScreen() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const checkAdmin = async () => {
    const role = await getAuthRole();
    if (role !== 'admin') {
      router.replace('/explore');
      return false;
    }
    return true;
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      let url = `${API_BASE}/api/feedback/all?`;
      if (filterType !== 'all') url += `type=${filterType}&`;
      if (filterStatus !== 'all') url += `status=${filterStatus}`;

      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks', error);
      Alert.alert('Error', 'Failed to load feedbacks');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkAdmin().then((isAdmin) => {
        if (isAdmin) fetchFeedbacks();
      });
    }, [filterType, filterStatus])
  );

  const handleModerate = async (id: string, newStatus: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/feedback/${id}/moderate`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchFeedbacks();
      } else {
        Alert.alert('Error', 'Failed to update feedback status');
      }
    } catch (error) {
      console.error('Moderate error', error);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Feedback', 'Are you sure you want to permanently delete this feedback?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE}/api/feedback/${id}`, {
              method: 'DELETE',
              headers,
            });
            if (response.ok) {
              fetchFeedbacks();
            } else {
              Alert.alert('Error', 'Failed to delete feedback');
            }
          } catch (error) {
            console.error('Delete error', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/admin')}>
          <Ionicons name="arrow-back" size={24} color="#003580" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Moderation</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['all', 'hotel', 'tourpack', 'transportation', 'general'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, filterType === type && styles.filterChipActive]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.statusFilters}>
          {(['all', 'published', 'hidden'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusTab, filterStatus === status && styles.statusTabActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.statusTabText, filterStatus === status && styles.statusTabTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#003580" style={{ marginTop: 40 }} />
      ) : feedbacks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No feedbacks found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {feedbacks.map((item) => (
            <View key={item._id} style={[styles.card, item.status === 'hidden' && styles.cardHidden]}>
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.user?.name || 'Unknown User'}</Text>
                  <Text style={styles.userEmail}>{item.user?.email || ''}</Text>
                </View>
                <View style={[styles.badge, item.status === 'published' ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={[styles.badgeText, item.status === 'published' ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.typeText}>
                  {item.feedbackType.toUpperCase()} {item.targetId ? `- ${item.targetId.name || item.targetId.title}` : ''}
                </Text>
                <View style={styles.ratingBox}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>

              <Text style={styles.commentText}>{item.comment}</Text>
              <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString()}</Text>

              <View style={styles.actionsRow}>
                {item.status === 'published' ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.hideBtn]}
                    onPress={() => handleModerate(item._id, 'hidden')}
                  >
                    <Ionicons name="eye-off-outline" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Hide</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.restoreBtn]}
                    onPress={() => handleModerate(item._id, 'published')}
                  >
                    <Ionicons name="eye-outline" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Publish</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item._id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#d32f2f" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#003580',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  statusFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  statusTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  statusTabActive: {
    borderBottomColor: '#003580',
  },
  statusTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  statusTabTextActive: {
    color: '#003580',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50', // Default green for published
  },
  cardHidden: {
    borderLeftColor: '#ff9800', // Orange for hidden
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeSuccess: {
    backgroundColor: '#e8f5e9',
  },
  badgeWarning: {
    backgroundColor: '#fff3e0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#2e7d32',
  },
  badgeTextWarning: {
    color: '#ef6c00',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#003580',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffb300',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  commentText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  hideBtn: {
    backgroundColor: '#ff9800',
  },
  restoreBtn: {
    backgroundColor: '#4caf50',
  },
  deleteBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteBtnText: {
    color: '#d32f2f',
    fontWeight: '600',
    fontSize: 14,
  },
});
