import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE } from '../src/config';
import { resolveImageUrl } from '../src/utils';
import { getAuthHeaders, getAuthToken, getAuthRole, clearAuthSession } from '../src/auth';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  profilePhoto?: string;
  createdAt: string;
}

interface Review {
  _id: string;
  feedbackType: string;
  targetId: any;
  rating: number;
  title: string;
  comment: string;
  status: string;
  createdAt: string;
}

interface AvailableBooking {
  _id: string;
  bookingReference: string;
  hotel?: any;
  tourPack?: any;
  transportation?: any;
}

interface UserBooking {
  _id: string;
  bookingReference: string;
  destination: string;
  guestName: string;
  email: string;
  phone: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults: number;
  children: number;
  guests: number;
  rooms: number;
  nights: number;
  stayAmount: number;
  packageAmount: number;
  transportationAmount: number;
  serviceFee: number;
  totalAmount: number;
  bookingStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'deposit_due' | 'paid' | 'refunded';
  travelStyle?: string;
  specialRequests?: string;
  itineraryNotes?: string[];
  createdAt: string;
  hotel?: {
    name?: string;
    location?: string;
  };
  tourPack?: {
    name?: string;
    destination?: string;
    duration?: string;
  };
  transportation?: {
    vehicleType?: string;
    brandModel?: string;
    plateNumber?: string;
  };
}
export default function UserProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Tabs and Reviews state
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'reviews'>('profile');
  const [myBookings, setMyBookings] = useState<UserBooking[]>([]);
  const [loadingBookingsList, setLoadingBookingsList] = useState(false);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  // Review Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<'hotel' | 'tourpack' | 'transportation' | 'general'>('hotel');
  const [availableBookings, setAvailableBookings] = useState<AvailableBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  useEffect(() => {
    const checkRoleAndFetch = async () => {
      const role = await getAuthRole();
      if (role === 'admin') {
        // Redirect admins to their admin profile
        router.replace('/admin/profile');
        return;
      }
      if (!role) {
        // Not logged in
        router.replace('/login');
        return;
      }
      fetchUserProfile();
    };

    checkRoleAndFetch();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE}/api/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
      setUser(data);
      setEditedName(data.name);
      setEditedPhone(data.phoneNumber);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyReviews = async () => {
    try {
      setLoadingReviews(true);
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/api/feedback/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMyReviews(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      setLoadingBookingsList(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/bookings/my-bookings`, { headers });
      const data = await response.json();

      if (response.ok) {
        setMyBookings(Array.isArray(data.data) ? data.data : []);
      } else {
        console.error('Failed to fetch user bookings:', data?.message || response.status);
      }
    } catch (err) {
      console.error('Failed to fetch user bookings:', err);
    } finally {
      setLoadingBookingsList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchMyBookings();
    }
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchMyReviews();
    }
  }, [activeTab]);

  const fetchAvailableBookings = async (type: string) => {
    if (type === 'general') {
      setAvailableBookings([]);
      setSelectedBooking('');
      return;
    }
    try {
      setLoadingBookings(true);
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/api/feedback/available-bookings/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const bookingsList = data.data || [];
        setAvailableBookings(bookingsList);
        if (bookingsList.length > 0) {
          setSelectedBooking(bookingsList[0]._id);
        } else {
          setSelectedBooking('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (showReviewModal) {
      fetchAvailableBookings(reviewType);
    }
  }, [reviewType, showReviewModal]);

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }
    if (reviewType !== 'general' && !selectedBooking) {
      Alert.alert('Error', 'Please select a booking to review');
      return;
    }

    try {
      setSubmittingReview(true);
      const token = await getAuthToken();
      
      const booking = availableBookings.find(b => b._id === selectedBooking);
      let targetId = null;
      if (booking) {
        if (reviewType === 'hotel') targetId = booking.hotel?._id;
        else if (reviewType === 'tourpack') targetId = booking.tourPack?._id;
        else if (reviewType === 'transportation') targetId = booking.transportation?._id;
      }

      const payload = {
        feedbackType: reviewType,
        rating,
        comment,
        bookingId: reviewType !== 'general' ? selectedBooking : undefined,
        targetId: reviewType !== 'general' ? targetId : undefined,
      };

      const response = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowReviewModal(false);
        setComment('');
        setRating(5);
        fetchMyReviews();
        Alert.alert('Success', 'Your review has been submitted successfully.');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to submit review');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE}/api/feedback/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              fetchMyReviews();
            }
          } catch (err) {
            console.error('Delete error', err);
          }
        }
      }
    ]);
  };
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedPhoto(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (!editedPhone.trim()) {
      Alert.alert('Error', 'Phone number cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      const token = await getAuthToken();

      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const formData = new FormData();
      formData.append('name', editedName.trim());
      formData.append('phoneNumber', editedPhone.trim());

      if (selectedPhoto) {
        if (Platform.OS === 'web') {
          // Web approach: use blob
          const response_blob = await fetch(selectedPhoto);
          const blob = await response_blob.blob();
          formData.append('profilePhoto', blob, 'profile.jpg');
        } else {
          // Native approach: use object with uri, name, and type
          const uri = selectedPhoto;
          const filename = uri.split('/').pop() || 'profile.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
          
          formData.append('profilePhoto', {
            uri,
            name: filename,
            type,
          } as any);
        }
      }

      const response = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setSelectedPhoto(null);
      setIsEditing(false);
      setError('');
      setSuccess('✓ Profile updated successfully');
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      Alert.alert('Error', message);
      console.error('Profile update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Password complexity regex: 8+ chars, upper, lower, number, special
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError('Password must be 8+ chars with uppercase, lowercase, number, and special character');
      return;
    }

    try {
      setIsChangingPassword(true);
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE}/api/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      Alert.alert('Success', 'Your password has been updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancel = () => {
    setEditedName(user?.name || '');
    setEditedPhone(user?.phoneNumber || '');
    setSelectedPhoto(null);
    setIsEditing(false);
    setShowPasswordSection(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleLogout = async () => {
    console.log('handleLogout called');
    
    const performLogout = async () => {
      try {
        console.log('Proceeding with logout...');
        await clearAuthSession();
        console.log('Auth session cleared, navigating to home...');
        if (Platform.OS === 'web') {
          window.location.href = '/';
        } else {
          router.replace('/');
        }
      } catch (err) {
        console.error('Logout error:', err);
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        await performLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', onPress: () => console.log('Logout cancelled') },
        { text: 'Logout', onPress: performLogout },
      ]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatMoney = (amount: number) =>
    `LKR ${Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getBookingStatusColor = (status: UserBooking['bookingStatus']) => {
    switch (status) {
      case 'confirmed':
        return '#0f9d58';
      case 'completed':
        return '#2563eb';
      case 'cancelled':
        return '#dc2626';
      default:
        return '#f59e0b';
    }
  };

  const getPaymentStatusColor = (status: UserBooking['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return '#0f9d58';
      case 'refunded':
        return '#7c3aed';
      default:
        return '#f59e0b';
    }
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            activeOpacity={0.6}
            style={styles.headerButton}
            onPress={() => {
              console.log('Back button pressed');
              router.push('/explore');
            }}
          >
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity 
            activeOpacity={0.6}
            style={styles.headerButton}
            onPress={() => (isEditing ? handleCancel() : setIsEditing(true))}
          >
            <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {/* Custom Tab Bar */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>My Reviews</Text>
          </TouchableOpacity>
        </View>

        {user && activeTab === 'profile' && (
          <View>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                {selectedPhoto ? (
                  <Image source={{ uri: selectedPhoto }} style={styles.profileImage} contentFit="cover" transition={300} />
                ) : user.profilePhoto ? (
                  <Image source={{ uri: resolveImageUrl(user.profilePhoto) ?? undefined }} style={styles.profileImage} contentFit="cover" transition={300} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{editedName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userName}>{editedName}</Text>
              <Text style={styles.userRole}>Regular User</Text>
            </View>

            {/* Details Section */}
            {isEditing ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Edit Profile</Text>

                {/* Change Photo Button */}
                <View style={styles.formGroup}>
                  <TouchableOpacity 
                    style={styles.changePhotoButton} 
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changePhotoButtonText}>
                      {selectedPhoto || user.profilePhoto ? 'Change Photo' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    value={editedPhone}
                    onChangeText={setEditedPhone}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>

                {/* Password Reset Section Toggle */}
                <TouchableOpacity 
                  style={styles.passwordToggle} 
                  onPress={() => setShowPasswordSection(!showPasswordSection)}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPasswordSection ? 'Cancel Password Change' : 'Change Password'}
                  </Text>
                </TouchableOpacity>

                {showPasswordSection && (
                  <View style={styles.passwordSection}>
                    <Text style={styles.passwordSectionTitle}>Update Password</Text>
                    
                    <Text style={styles.requirementHint}>
                      Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.
                    </Text>

                    {passwordError ? (
                      <View style={styles.inlineErrorContainer}>
                        <Text style={styles.inlineErrorText}>{passwordError}</Text>
                      </View>
                    ) : null}

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Current Password</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>New Password</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Min. 8 characters"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Confirm New Password</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Re-type new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholderTextColor="#999"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.changePasswordButton, isChangingPassword && styles.buttonDisabled]}
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      <Text style={styles.changePasswordButtonText}>
                        {isChangingPassword ? 'Updating...' : 'Update Password'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={styles.detailValue}>{user.email}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Phone Number</Text>
                    <Text style={styles.detailValue}>{user.phoneNumber}</Text>
                  </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Account Information</Text>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Account Type</Text>
                    <Text style={styles.detailValue}>{user.role}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Member Since</Text>
                    <Text style={styles.detailValue}>{formatDate(user.createdAt)}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>User ID</Text>
                    <Text style={styles.detailValue}>{user._id}</Text>
                  </View>
                </View>
              </>
            )}

            {/* Action Buttons */}
            {!isEditing && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={styles.logoutButton} 
                  onPress={() => {
                    console.log('Logout button pressed');
                    handleLogout();
                  }}
                >
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 30 }} />
          </View>
        )}
        {user && activeTab === 'bookings' && (
          <View style={styles.bookingsContainer}>
            <View style={styles.bookingsHeaderRow}>
              <View>
                <Text style={styles.bookingsTitle}>My Reservations</Text>
                <Text style={styles.bookingsSubtitle}>All your booking details in one place.</Text>
              </View>
              <TouchableOpacity style={styles.refreshBookingsButton} onPress={fetchMyBookings}>
                <Ionicons name="refresh" size={18} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {loadingBookingsList ? (
              <ActivityIndicator size="large" color="#007AFF" style={styles.bookingsLoader} />
            ) : myBookings.length === 0 ? (
              <View style={styles.emptyBookingsCard}>
                <Ionicons name="calendar-clear-outline" size={52} color="#cbd5e1" />
                <Text style={styles.emptyBookingsTitle}>No bookings yet</Text>
                <Text style={styles.emptyBookingsMessage}>
                  Your hotel stays, packages, and transportation bookings will appear here.
                </Text>
              </View>
            ) : (
              myBookings.map((booking) => (
                <View key={booking._id} style={styles.bookingDetailsCard}>
                  <View style={styles.bookingTopRow}>
                    <View style={styles.bookingTopLeft}>
                      <Text style={styles.bookingReference}>{booking.bookingReference}</Text>
                      <Text style={styles.bookingCreatedDate}>Booked on {formatDate(booking.createdAt)}</Text>
                    </View>
                    <View style={styles.bookingBadgeColumn}>
                      <View style={[styles.statusPill, { backgroundColor: `${getBookingStatusColor(booking.bookingStatus)}18` }]}>
                        <Text style={[styles.statusPillText, { color: getBookingStatusColor(booking.bookingStatus) }]}>
                          {booking.bookingStatus.toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: `${getPaymentStatusColor(booking.paymentStatus)}18` }]}>
                        <Text style={[styles.statusPillText, { color: getPaymentStatusColor(booking.paymentStatus) }]}>
                          {booking.paymentStatus.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bookingSection}>
                    <Text style={styles.bookingSectionTitle}>Trip Details</Text>
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Destination</Text>
                      <Text style={styles.bookingInfoValue}>{booking.destination || booking.tourPack?.destination || 'N/A'}</Text>
                    </View>
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Guest</Text>
                      <Text style={styles.bookingInfoValue}>{booking.guestName}</Text>
                    </View>
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Contact</Text>
                      <Text style={styles.bookingInfoValue}>{booking.email} | {booking.phone}</Text>
                    </View>
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Party Size</Text>
                      <Text style={styles.bookingInfoValue}>
                        {booking.adults} adult(s), {booking.children} child(ren), {booking.guests} guest(s)
                      </Text>
                    </View>
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Travel Style</Text>
                      <Text style={styles.bookingInfoValue}>{booking.travelStyle || 'N/A'}</Text>
                    </View>
                  </View>

                  {(booking.hotel || booking.tourPack || booking.transportation) && (
                    <View style={styles.bookingSection}>
                      <Text style={styles.bookingSectionTitle}>Reservation Items</Text>
                      {booking.hotel && (
                        <>
                          <View style={styles.bookingInfoRow}>
                            <Text style={styles.bookingInfoLabel}>Hotel</Text>
                            <Text style={styles.bookingInfoValue}>{booking.hotel.name || 'N/A'}</Text>
                          </View>
                          <View style={styles.bookingInfoRow}>
                            <Text style={styles.bookingInfoLabel}>Location</Text>
                            <Text style={styles.bookingInfoValue}>{booking.hotel.location || 'N/A'}</Text>
                          </View>
                        </>
                      )}
                      {booking.tourPack && (
                        <>
                          <View style={styles.bookingInfoRow}>
                            <Text style={styles.bookingInfoLabel}>Package</Text>
                            <Text style={styles.bookingInfoValue}>{booking.tourPack.name || 'N/A'}</Text>
                          </View>
                          <View style={styles.bookingInfoRow}>
                            <Text style={styles.bookingInfoLabel}>Duration</Text>
                            <Text style={styles.bookingInfoValue}>{booking.tourPack.duration || 'N/A'}</Text>
                          </View>
                        </>
                      )}
                      {booking.transportation && (
                        <>
                          <View style={styles.bookingInfoRow}>
                            <Text style={styles.bookingInfoLabel}>Transport</Text>
                            <Text style={styles.bookingInfoValue}>
                              {[booking.transportation.vehicleType, booking.transportation.brandModel].filter(Boolean).join(' - ') || 'N/A'}
                            </Text>
                          </View>
                          <View style={styles.bookingInfoRow}>
                            <Text style={styles.bookingInfoLabel}>Plate Number</Text>
                            <Text style={styles.bookingInfoValue}>{booking.transportation.plateNumber || 'N/A'}</Text>
                          </View>
                        </>
                      )}
                    </View>
                  )}

                  <View style={styles.bookingSection}>
                    <Text style={styles.bookingSectionTitle}>Schedule & Amounts</Text>
                    {booking.checkInDate ? (
                      <View style={styles.bookingInfoRow}>
                        <Text style={styles.bookingInfoLabel}>Check-in</Text>
                        <Text style={styles.bookingInfoValue}>{formatDate(booking.checkInDate)}</Text>
                      </View>
                    ) : null}
                    {booking.checkOutDate ? (
                      <View style={styles.bookingInfoRow}>
                        <Text style={styles.bookingInfoLabel}>Check-out</Text>
                        <Text style={styles.bookingInfoValue}>{formatDate(booking.checkOutDate)}</Text>
                      </View>
                    ) : null}
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Rooms / Nights</Text>
                      <Text style={styles.bookingInfoValue}>{booking.rooms} room(s) / {booking.nights} night(s)</Text>
                    </View>
                    {booking.stayAmount > 0 && (
                      <View style={styles.bookingInfoRow}>
                        <Text style={styles.bookingInfoLabel}>Stay Amount</Text>
                        <Text style={styles.bookingInfoValue}>{formatMoney(booking.stayAmount)}</Text>
                      </View>
                    )}
                    {booking.packageAmount > 0 && (
                      <View style={styles.bookingInfoRow}>
                        <Text style={styles.bookingInfoLabel}>Package Amount</Text>
                        <Text style={styles.bookingInfoValue}>{formatMoney(booking.packageAmount)}</Text>
                      </View>
                    )}
                    {booking.transportationAmount > 0 && (
                      <View style={styles.bookingInfoRow}>
                        <Text style={styles.bookingInfoLabel}>Transportation</Text>
                        <Text style={styles.bookingInfoValue}>{formatMoney(booking.transportationAmount)}</Text>
                      </View>
                    )}
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Service Fee</Text>
                      <Text style={styles.bookingInfoValue}>{formatMoney(booking.serviceFee)}</Text>
                    </View>
                    <View style={[styles.bookingInfoRow, styles.bookingTotalRow]}>
                      <Text style={styles.bookingTotalLabel}>Total Amount</Text>
                      <Text style={styles.bookingTotalValue}>{formatMoney(booking.totalAmount)}</Text>
                    </View>
                  </View>

                  {(booking.specialRequests || (booking.itineraryNotes && booking.itineraryNotes.length > 0)) && (
                    <View style={styles.bookingSection}>
                      <Text style={styles.bookingSectionTitle}>Notes</Text>
                      {booking.specialRequests ? (
                        <Text style={styles.bookingNotesText}>{booking.specialRequests}</Text>
                      ) : null}
                      {booking.itineraryNotes?.filter(Boolean).map((note, index) => (
                        <Text key={`${booking._id}-note-${index}`} style={styles.bookingNotesText}>
                          - {note}
                        </Text>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.viewReceiptButton}
                    onPress={() => router.push({ pathname: '/receipt', params: { bookingId: booking._id } })}
                  >
                    <Ionicons name="receipt-outline" size={18} color="#fff" />
                    <Text style={styles.viewReceiptButtonText}>View Receipt</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <View style={{ height: 30 }} />
          </View>
        )}
        {user && activeTab === 'reviews' && (
          <View style={styles.reviewsContainer}>
            <TouchableOpacity 
              style={styles.writeReviewButton}
              onPress={() => setShowReviewModal(true)}
            >
              <Ionicons name="pencil" size={20} color="#fff" />
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>

            {loadingReviews ? (
              <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
            ) : myReviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Ionicons name="chatbubble-ellipses-outline" size={50} color="#ccc" />
                <Text style={styles.emptyReviewsText}>You haven&apos;t written any reviews yet.</Text>
              </View>
            ) : (
              myReviews.map((review) => (
                <View key={review._id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewType}>
                        {review.feedbackType === 'hotel' ? '🏨 Hotel' :
                         review.feedbackType === 'tourpack' ? '🧳 Tour Package' :
                         review.feedbackType === 'transportation' ? '🚗 Transportation' : '⭐ General App'}
                      </Text>
                      {review.targetId?.name && <Text style={styles.reviewTarget}>{review.targetId.name}</Text>}
                      {review.targetId?.title && <Text style={styles.reviewTarget}>{review.targetId.title}</Text>}
                    </View>
                    <View style={styles.reviewStatusContainer}>
                      <Text style={[styles.reviewStatus, review.status === 'hidden' && styles.reviewStatusHidden]}>
                        {review.status === 'published' ? 'Published' : 'Hidden by Admin'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons 
                        key={star} 
                        name={star <= review.rating ? "star" : "star-outline"} 
                        size={16} 
                        color="#FFD700" 
                      />
                    ))}
                  </View>

                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  
                  <View style={styles.reviewFooter}>
                    <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                    <TouchableOpacity onPress={() => handleDeleteReview(review._id)}>
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 30 }} />
          </View>
        )}

        {/* Write Review Modal */}
        <Modal visible={showReviewModal} animationType="slide" transparent={true}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Write a Review</Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.label}>What are you reviewing?</Text>
                <View style={styles.typeSelector}>
                  {(['hotel', 'tourpack', 'transportation', 'general'] as const).map(type => (
                    <TouchableOpacity 
                      key={type}
                      style={[styles.typeButton, reviewType === type && styles.typeButtonActive]}
                      onPress={() => setReviewType(type)}
                    >
                      <Text style={[styles.typeButtonText, reviewType === type && styles.typeButtonTextActive]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {reviewType !== 'general' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Select Booking</Text>
                    {loadingBookings ? (
                      <ActivityIndicator color="#007AFF" />
                    ) : availableBookings.length === 0 ? (
                      <Text style={styles.noBookingsText}>No available completed/confirmed bookings to review.</Text>
                    ) : (
                      <View style={styles.pickerContainer}>
                        {availableBookings.map(b => (
                          <TouchableOpacity 
                            key={b._id}
                            style={[styles.bookingOption, selectedBooking === b._id && styles.bookingOptionActive]}
                            onPress={() => setSelectedBooking(b._id)}
                          >
                            <Text style={styles.bookingOptionText}>
                              {b.hotel?.name || b.tourPack?.name || b.transportation?.brandModel || b.transportation?.vehicleType || b.bookingReference}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {(reviewType === 'general' || availableBookings.length > 0) && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Rating</Text>
                      <View style={styles.starsSelector}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Ionicons 
                              name={star <= rating ? "star" : "star-outline"} 
                              size={32} 
                              color="#FFD700" 
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Comment</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Share your experience..."
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>

                    <TouchableOpacity 
                      style={[styles.submitReviewButton, submittingReview && styles.buttonDisabled]}
                      onPress={handleSubmitReview}
                      disabled={submittingReview}
                    >
                      <Text style={styles.submitReviewButtonText}>
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
    minWidth: 50,
    justifyContent: 'center',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  errorContainer: {
    backgroundColor: '#fee',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#c33',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#e8f5e9',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fafafa',
  },
  changePhotoButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  changePhotoButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  passwordToggle: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  passwordToggleText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  passwordSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  passwordSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  changePasswordButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  requirementHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  inlineErrorContainer: {
    backgroundColor: '#FFF5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  inlineErrorText: {
    color: '#C53030',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },

  bookingsContainer: {
    padding: 16,
  },
  bookingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  bookingsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  bookingsSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  refreshBookingsButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf3ff',
  },
  bookingsLoader: {
    marginTop: 32,
  },
  emptyBookingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyBookingsTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  emptyBookingsMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
  },
  bookingDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  bookingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  bookingTopLeft: {
    flex: 1,
  },
  bookingReference: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  bookingCreatedDate: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  bookingBadgeColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bookingSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  bookingSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  bookingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  bookingInfoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  bookingInfoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
  },
  bookingTotalRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  bookingTotalLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  bookingTotalValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'right',
  },
  bookingNotesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 6,
  },
  viewReceiptButton: {
    marginTop: 18,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewReceiptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  
  // Reviews Styles
  reviewsContainer: {
    padding: 16,
  },
  writeReviewButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  writeReviewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyReviewsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  reviewTarget: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  reviewStatusContainer: {
    alignItems: 'flex-end',
  },
  reviewStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4caf50',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewStatusHidden: {
    color: '#ff9800',
    backgroundColor: '#fff3e0',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  reviewDate: {
    fontSize: 13,
    color: '#999',
  },
  
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8f8f8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  noBookingsText: {
    color: '#ff4444',
    fontStyle: 'italic',
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  bookingOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  bookingOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  bookingOptionText: {
    fontSize: 15,
    color: '#333',
  },
  starsSelector: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  textArea: {
    height: 100,
  },
  submitReviewButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitReviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
