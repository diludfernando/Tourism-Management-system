import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;

const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type Booking = {
  _id: string;
  bookingReference: string;
  guestName: string;
  email: string;
  destination?: string;
  adults?: number;
  children?: number;
  guests?: number;
  nights: number;
  rooms: number;
  totalAmount: number;
  bookingStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'deposit_due' | 'paid' | 'refunded';
  createdAt: string;
  hotel?: {
    name: string;
    location: string;
  };
  transportation?: {
    brandModel?: string;
    vehicleType: string;
  };
};

type FeedbackState = {
  type: 'error' | 'success' | 'warning';
  title: string;
  message: string;
} | null;

type PendingAction =
  | {
      type: 'confirm' | 'complete' | 'cancel' | 'delete';
      booking: Booking;
      title: string;
      message: string;
      buttonLabel: string;
      buttonStyle: 'primary' | 'danger' | 'warning';
    }
  | null;

const parseResponseBody = async (response: Response) => {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
};

export default function BookingManagementScreen() {
  const router = useRouter();
  const { admin } = useLocalSearchParams<{ admin?: string }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const isAdminMode = admin === 'true';

  useEffect(() => {
    if (!isAdminMode) {
      router.replace('/');
    }
  }, [isAdminMode, router]);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bookings`);
      const data = await parseResponseBody(response);
      if (response.ok) {
        setBookings(Array.isArray(data) ? data : []);
      } else {
        setFeedback({
          type: 'error',
          title: 'Load Failed',
          message: data?.message || 'Failed to fetch bookings.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not connect to the booking service.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const filteredBookings = useMemo(() => {
    if (activeFilter === 'all') {
      return bookings;
    }
    return bookings.filter((booking) => booking.bookingStatus === activeFilter);
  }, [activeFilter, bookings]);

  const metrics = useMemo(() => {
    const confirmedRevenue = bookings
      .filter((booking) => booking.bookingStatus !== 'cancelled')
      .reduce((sum, booking) => sum + booking.totalAmount, 0);

    return {
      total: bookings.length,
      pending: bookings.filter((booking) => booking.bookingStatus === 'pending').length,
      activeRevenue: confirmedRevenue,
      paid: bookings.filter((booking) => booking.paymentStatus === 'paid').length,
    };
  }, [bookings]);

  const patchBooking = async (id: string, payload: Partial<Booking>) => {
    setProcessingId(id);
    try {
      const response = await fetch(`${API_URL}/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseResponseBody(response);
      if (!response.ok) {
        setFeedback({
          type: 'error',
          title: 'Update Failed',
          message: data?.message || 'Could not update booking.',
        });
        return;
      }
      setBookings((current) => current.map((booking) => (booking._id === id ? data : booking)));
      setFeedback({
        type: 'success',
        title: 'Booking Updated',
        message: `Booking ${data?.bookingReference || ''} was updated successfully.`.trim(),
      });
    } catch {
      setFeedback({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not update booking.',
      });
    } finally {
      setProcessingId((current) => (current === id ? null : current));
    }
  };

  const deleteBooking = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`${API_URL}/api/bookings/${id}`, { method: 'DELETE' });
      const data = await parseResponseBody(response);
      if (!response.ok) {
        setFeedback({
          type: 'error',
          title: 'Delete Failed',
          message: data?.message || 'Could not remove booking.',
        });
        return;
      }
      setBookings((current) => current.filter((booking) => booking._id !== id));
      setFeedback({
        type: 'success',
        title: 'Booking Deleted',
        message: data?.message || 'Booking was removed successfully.',
      });
    } catch {
      setFeedback({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not remove booking.',
      });
    } finally {
      setProcessingId((current) => (current === id ? null : current));
    }
  };

  const handleDelete = (booking: Booking) => {
    setPendingAction({
      type: 'delete',
      booking,
      title: 'Delete Booking',
      message: `Delete booking ${booking.bookingReference}? This permanently removes the record.`,
      buttonLabel: 'Delete Booking',
      buttonStyle: 'danger',
    });
  };

  const handleConfirm = (booking: Booking) => {
    setPendingAction({
      type: 'confirm',
      booking,
      title: 'Confirm Booking',
      message: `Confirm booking ${booking.bookingReference} and mark payment as paid?`,
      buttonLabel: 'Confirm Booking',
      buttonStyle: 'primary',
    });
  };

  const handleComplete = (booking: Booking) => {
    setPendingAction({
      type: 'complete',
      booking,
      title: 'Complete Booking',
      message: `Mark booking ${booking.bookingReference} as completed?`,
      buttonLabel: 'Complete Booking',
      buttonStyle: 'primary',
    });
  };

  const handleCancel = (booking: Booking) => {
    setPendingAction({
      type: 'cancel',
      booking,
      title: 'Cancel Booking',
      message: `Cancel booking ${booking.bookingReference} and mark payment as refunded?`,
      buttonLabel: 'Cancel Booking',
      buttonStyle: 'warning',
    });
  };

  const executePendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    const { booking, type } = pendingAction;
    setPendingAction(null);

    if (type === 'delete') {
      await deleteBooking(booking._id);
      return;
    }

    if (type === 'confirm') {
      await patchBooking(booking._id, { bookingStatus: 'confirmed', paymentStatus: 'paid' });
      return;
    }

    if (type === 'complete') {
      await patchBooking(booking._id, { bookingStatus: 'completed', paymentStatus: 'paid' });
      return;
    }

    await patchBooking(booking._id, {
      bookingStatus: 'cancelled',
      paymentStatus: 'refunded',
    });
  };

  const statusColor = (status: Booking['bookingStatus']) => {
    switch (status) {
      case 'confirmed':
        return '#166534';
      case 'completed':
        return '#1D4ED8';
      case 'cancelled':
        return '#B91C1C';
      default:
        return '#92400E';
    }
  };

  const paymentLabel = (status: Booking['paymentStatus']) => {
    if (status === 'deposit_due') return 'Deposit Due';
    if (status === 'paid') return 'Paid';
    return 'Refunded';
  };

  const getAvailableActions = (booking: Booking) => ({
    canConfirm: booking.bookingStatus === 'pending',
    canComplete: booking.bookingStatus === 'confirmed',
    canCancel: booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed',
    canDelete: true,
  });

  const renderBooking = ({ item }: { item: Booking }) => {
    const actions = getAvailableActions(item);
    const isProcessing = processingId === item._id;

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reference}>{item.bookingReference}</Text>
            <Text style={styles.guestName}>{item.guestName}</Text>
            <Text style={styles.metaText}>
              {item.hotel?.name} - {item.destination || item.hotel?.location}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor(item.bookingStatus)}18` },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: statusColor(item.bookingStatus) },
              ]}
            >
              {item.bookingStatus}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="people-outline" size={14} color="#003580" />
            <Text style={styles.statPillText}>
              {item.adults ?? item.guests ?? 0} adult(s)
              {typeof item.children === 'number' ? `, ${item.children} child(ren)` : ''}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="moon-outline" size={14} color="#003580" />
            <Text style={styles.statPillText}>{item.nights} night(s)</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="bed-outline" size={14} color="#003580" />
            <Text style={styles.statPillText}>{item.rooms} room(s)</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="card-outline" size={14} color="#003580" />
            <Text style={styles.statPillText}>{paymentLabel(item.paymentStatus)}</Text>
          </View>
        </View>

        <Text style={styles.transportText}>
          {item.transportation
            ? `Transfer: ${item.transportation.brandModel || item.transportation.vehicleType}`
            : 'Transfer: none'}
        </Text>
        <Text style={styles.amountText}>{formatPrice(item.totalAmount)}</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.confirmButton,
              (!actions.canConfirm || isProcessing) && styles.actionButtonDisabled,
            ]}
            disabled={!actions.canConfirm || isProcessing}
            onPress={() => handleConfirm(item)}
          >
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.completeButton,
              (!actions.canComplete || isProcessing) && styles.actionButtonDisabled,
            ]}
            disabled={!actions.canComplete || isProcessing}
            onPress={() => handleComplete(item)}
          >
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.cancelButton,
              (!actions.canCancel || isProcessing) && styles.actionButtonDisabled,
            ]}
            disabled={!actions.canCancel || isProcessing}
            onPress={() => handleCancel(item)}
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteButton,
              (isProcessing || !actions.canDelete) && styles.actionButtonDisabled,
            ]}
            disabled={isProcessing || !actions.canDelete}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!isAdminMode) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/admin', params: { admin: 'true' } })}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Command Center</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.iconButton}>
            <Ionicons name="home-outline" size={20} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setRefreshing(true);
              fetchBookings();
            }}
            style={styles.iconButton}
          >
            <Ionicons name="refresh" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item._id}
        renderItem={renderBooking}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchBookings();
            }}
            colors={['#003580']}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {feedback ? (
              <View
                style={[
                  styles.feedbackBanner,
                  feedback.type === 'error'
                    ? styles.feedbackBannerError
                    : feedback.type === 'warning'
                      ? styles.feedbackBannerWarning
                      : styles.feedbackBannerSuccess,
                ]}
              >
                <View style={styles.feedbackBannerContent}>
                  <Text style={styles.feedbackBannerTitle}>{feedback.title}</Text>
                  <Text style={styles.feedbackBannerText}>{feedback.message}</Text>
                </View>
                <TouchableOpacity onPress={() => setFeedback(null)} style={styles.feedbackBannerClose}>
                  <Ionicons name="close" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { backgroundColor: '#E0F2FE' }]}>
                <Text style={styles.metricValue}>{metrics.total}</Text>
                <Text style={styles.metricLabel}>Total bookings</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.metricValue}>{metrics.pending}</Text>
                <Text style={styles.metricLabel}>Pending</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.metricValue}>{formatPrice(metrics.activeRevenue)}</Text>
                <Text style={styles.metricLabel}>Active revenue</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#F3E8FF' }]}>
                <Text style={styles.metricValue}>{metrics.paid}</Text>
                <Text style={styles.metricLabel}>Paid trips</Text>
              </View>
            </View>

            <View style={styles.filters}>
              {STATUS_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    activeFilter === filter && styles.filterChipActive,
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      activeFilter === filter && styles.filterChipTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#003580" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={72} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptyText}>
                Create a reservation from a hotel detail page to start managing trips here.
              </Text>
            </View>
          )
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={Boolean(pendingAction)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAction(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogModal}>
            <Text style={styles.dialogTitle}>{pendingAction?.title}</Text>
            <Text style={styles.dialogMessage}>{pendingAction?.message}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogSecondaryButton} onPress={() => setPendingAction(null)}>
                <Text style={styles.dialogSecondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogPrimaryButton,
                  pendingAction?.buttonStyle === 'danger'
                    ? styles.dialogDangerButton
                    : pendingAction?.buttonStyle === 'warning'
                      ? styles.dialogWarningButton
                      : styles.dialogDefaultButton,
                ]}
                onPress={executePendingAction}
              >
                <Text style={styles.dialogPrimaryText}>{pendingAction?.buttonLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  listHeader: { gap: 14, marginBottom: 14 },
  feedbackBanner: {
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  feedbackBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackBannerWarning: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  feedbackBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  feedbackBannerContent: { flex: 1, gap: 4 },
  feedbackBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  feedbackBannerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  feedbackBannerClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  metricRow: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, borderRadius: 18, padding: 16 },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  metricLabel: { fontSize: 13, color: '#475569', marginTop: 6 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#003580' },
  filterChipText: {
    color: '#334155',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterChipTextActive: { color: '#FFF' },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  reference: {
    color: '#003580',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  guestName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  metaText: { fontSize: 14, color: '#64748B' },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { fontWeight: '700', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statPillText: { color: '#1E3A8A', fontWeight: '600', fontSize: 12 },
  transportText: { fontSize: 14, color: '#475569', marginBottom: 8 },
  amountText: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: { opacity: 0.45 },
  confirmButton: { backgroundColor: '#166534' },
  completeButton: { backgroundColor: '#1D4ED8' },
  cancelButton: { backgroundColor: '#B45309' },
  deleteButton: { backgroundColor: '#B91C1C' },
  actionButtonText: { color: '#FFF', fontWeight: '700' },
  centered: { paddingVertical: 80, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 18,
    marginBottom: 8,
  },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  dialogModal: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 22,
    gap: 14,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  dialogMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  dialogSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  dialogSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  dialogPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogDefaultButton: { backgroundColor: '#003580' },
  dialogWarningButton: { backgroundColor: '#B45309' },
  dialogDangerButton: { backgroundColor: '#B91C1C' },
  dialogPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
