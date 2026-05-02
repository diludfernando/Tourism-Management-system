import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE } from '@/src/config';
import { getAuthToken, getAuthRole, clearAuthSession } from '@/src/auth';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  profilePhoto?: string;
  createdAt: string;
}

export default function AdminProfileScreen() {
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

  useEffect(() => {
    const checkRoleAndFetch = async () => {
      const role = await getAuthRole();
      if (role !== 'admin') {
        // Not an admin, redirect to home
        router.replace('/');
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
        const uri = selectedPhoto;
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

        // Convert URI to blob for proper file upload in React Native
        const response_blob = await fetch(uri);
        const blob = await response_blob.blob();
        formData.append('profilePhoto', blob, filename);
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

  const handleCancel = () => {
    setEditedName(user?.name || '');
    setEditedPhone(user?.phoneNumber || '');
    setSelectedPhoto(null);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await clearAuthSession();
          router.replace('/login');
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#FF6B35" />
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
              router.push('/admin');
            }}
          >
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Admin Profile</Text>
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

        {user && (
          <View>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
              <View style={styles.avatarContainer}>
                {selectedPhoto ? (
                  <Image source={{ uri: selectedPhoto }} style={styles.profileImage} />
                ) : user.profilePhoto ? (
                  <Image source={{ uri: `${API_BASE}${user.profilePhoto}` }} style={styles.profileImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{editedName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userName}>{editedName}</Text>
              <Text style={styles.userRole}>Administrator</Text>
            </View>

            {/* Details Section */}
            {isEditing ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Edit Profile</Text>

                {/* Change Photo Button */}
                <View style={styles.formGroup}>
                  <TouchableOpacity 
                    style={[styles.changePhotoButton, styles.adminChangePhotoButton]} 
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.changePhotoButtonText, styles.adminChangePhotoButtonText]}>
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
                    <Text style={styles.detailLabel}>Admin Since</Text>
                    <Text style={styles.detailValue}>{formatDate(user.createdAt)}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>User ID</Text>
                    <Text style={styles.detailValue}>{user._id}</Text>
                  </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsSection}>
                  <Text style={styles.sectionTitle}>Admin Tools</Text>
                  <TouchableOpacity
                    style={styles.toolButton}
                    onPress={() => router.push({ pathname: '/admin/users', params: { admin: 'true' } } as any)}
                  >
                    <Text style={styles.toolButtonText}>👥 Manage Users</Text>
                  </TouchableOpacity>
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
    color: '#FF6B35',
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    color: '#FF6B35',
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
  adminBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 12,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
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
  statsSection: {
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
  adminChangePhotoButton: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff3e0',
  },
  changePhotoButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  adminChangePhotoButtonText: {
    color: '#FF6B35',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
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
  toolButton: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  toolButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
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
});
