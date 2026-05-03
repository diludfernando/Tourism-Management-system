import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE } from '../../../src/config';
import { resolveImageUrl } from '../../../src/utils';
import { getAuthHeaders, getAuthRole } from '../../../src/auth';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  profilePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

const API_URL = `${API_BASE}/api/users`;

export default function UserDetailsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  // Edit form states
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedRole, setEditedRole] = useState<'user' | 'admin'>('user');

  useEffect(() => {
    const verifyAndLoad = async () => {
      try {
        const role = await getAuthRole();
        if (role !== 'admin') {
          router.replace('/explore');
          return;
        }

        if (!userId) {
          setError('User ID not found');
          setLoading(false);
          return;
        }

        fetchCurrentAdminId();
        loadUserDetails();
      } catch (err) {
        console.error('Verification error:', err);
        setError('Failed to verify admin access');
        setLoading(false);
      }
    };

    const fetchCurrentAdminId = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/api/users/me`, { headers });
        const data = await response.json();
        if (response.ok && data._id) {
          setCurrentAdminId(data._id);
        }
      } catch (err) {
        console.error('Failed to fetch current admin ID:', err);
      }
    };
    verifyAndLoad();
  }, [userId, router]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/${userId}`, { headers });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setUser(data);
      setEditedName(data.name);
      setEditedPhone(data.phoneNumber);
      setEditedRole(data.role);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load user';
      setError(message);
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedName.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty');
      return;
    }

    if (!editedPhone.trim()) {
      Alert.alert('Validation Error', 'Phone number cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/${userId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedName.trim(),
          phoneNumber: editedPhone.trim(),
          role: editedRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || 'Failed to update user');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Success', 'User details updated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      Alert.alert('Error', message);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditedName(user.name);
      setEditedPhone(user.phoneNumber);
      setEditedRole(user.role);
    }
    setIsEditing(false);
  };

  const handleDeleteUser = () => {
    if (!user) return;

    const confirmationMessage = `Are you sure you want to permanently delete ${user.name}?`;

    const runDelete = async () => {
      try {
        setDeletingUser(true);
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/${userId}`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data?.message || 'Failed to delete user');
        }

        router.back();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to delete user';
        if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
          globalThis.alert(message);
        } else {
          Alert.alert('Error', message);
        }
      } finally {
        setDeletingUser(false);
      }
    };

    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      const confirmed = globalThis.confirm(`Delete User\n\n${confirmationMessage}`);
      if (!confirmed) return;
      runDelete();
      return;
    }

    Alert.alert('Delete User', confirmationMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: runDelete,
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#003580" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#003580" size="large" />
          <Text style={styles.loadingText}>Loading user details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#003580" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color="#DC2626" />
          <Text style={styles.errorTitle}>Error Loading User</Text>
          <Text style={styles.errorText}>{error || 'User not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#003580" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity
          onPress={() => (isEditing ? handleCancel() : setIsEditing(true))}
          style={styles.editHeaderButton}
        >
          <Ionicons name={isEditing ? 'close' : 'pencil'} size={20} color="#003580" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            {user.profilePhoto ? (
              <Image 
                source={{ uri: resolveImageUrl(user.profilePhoto) ?? undefined }} 
                style={styles.profileImage}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
              </View>
            )}
            <View style={[styles.roleBadge, user.role === 'admin' ? styles.adminBadge : styles.userBadge]}>
              <Ionicons name={user.role === 'admin' ? 'shield' : 'person'} size={14} color="#FFF" />
              <Text style={styles.roleBadgeText}>{user.role === 'admin' ? 'Admin' : 'User'}</Text>
            </View>
          </View>

          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Member</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.role}</Text>
              <Text style={styles.statLabel}>Role</Text>
            </View>
          </View>
        </View>

        {/* Edit Form */}
        {isEditing && (
          <View style={styles.editCard}>
            <Text style={styles.sectionTitle}>Edit User Information</Text>

            {/* Name Field */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Phone Field */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={editedPhone}
                  onChangeText={setEditedPhone}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Role Field */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>User Role</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleButton, editedRole === 'user' && styles.roleButtonActive]}
                  onPress={() => setEditedRole('user')}
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={editedRole === 'user' ? '#FFF' : '#6B7280'}
                  />
                  <Text style={[styles.roleButtonText, editedRole === 'user' && styles.roleButtonTextActive]}>
                    User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, editedRole === 'admin' && styles.roleButtonActive]}
                  onPress={() => setEditedRole('admin')}
                >
                  <Ionicons
                    name="shield-outline"
                    size={18}
                    color={editedRole === 'admin' ? '#FFF' : '#6B7280'}
                  />
                  <Text style={[styles.roleButtonText, editedRole === 'admin' && styles.roleButtonTextActive]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={isSaving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* User Information Sections */}
        {!isEditing && (
          <>
            {/* Contact Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderView}>
                <Ionicons name="mail-outline" size={20} color="#003580" />
                <Text style={styles.sectionTitle}>Contact Information</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{user.phoneNumber || 'Not provided'}</Text>
              </View>
            </View>

            {/* Account Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderView}>
                <Ionicons name="shield-outline" size={20} color="#003580" />
                <Text style={styles.sectionTitle}>Account Information</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>User ID</Text>
                <Text style={[styles.infoValue, styles.monoText]}>{user._id}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Created</Text>
                <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>{formatDate(user.updatedAt)}</Text>
              </View>
            </View>

            {/* Danger Zone */}
            {user._id !== currentAdminId && (
              <View style={styles.dangerSection}>
                <View style={styles.sectionHeaderView}>
                  <Ionicons name="warning-outline" size={20} color="#DC2626" />
                  <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
                </View>
                <Text style={styles.dangerText}>
                  Deleting this user will permanently remove all their data from the system. This action cannot be undone.
                </Text>

                <TouchableOpacity
                  style={[styles.deleteButton, deletingUser && styles.buttonDisabled]}
                  onPress={handleDeleteUser}
                  disabled={deletingUser}
                >
                  {deletingUser ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color="#FFF" />
                      <Text style={styles.deleteButtonText}>Delete User Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 30 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  editHeaderButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E0E7FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#003580',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#003580',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFF',
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  adminBadge: {
    backgroundColor: '#DC2626',
  },
  userBadge: {
    backgroundColor: '#3B82F6',
  },
  roleBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003580',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  editCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderLeftWidth: 4,
    borderLeftColor: '#003580',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeaderView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  dangerTitle: {
    color: '#DC2626',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#9CA3AF',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  roleButtonActive: {
    backgroundColor: '#003580',
    borderColor: '#003580',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#FFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#003580',
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dangerSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerText: {
    fontSize: 13,
    color: '#991B1B',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
