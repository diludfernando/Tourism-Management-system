import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
  Modal, Switch, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { adminTourPackDetailRoute } from '../../../src/routes/adminTourpacks';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE } from '../../../src/config';
import { getAuthHeaders } from '../../../src/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminEditTourPackScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const tourPackId = Array.isArray(id) ? id[0] : id;

  console.log('AdminEdit - tourPackId:', tourPackId, 'rawParams id:', id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [currentImageUri, setCurrentImageUri] = useState('');
  const [gallery, setGallery] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '', description: '', price: '',
    duration: '', maxGroupSize: '', destination: '',
    kilometers: '', inclusions: '', availabilityDates: [] as string[],
    category: '', tags: '', featured: false, difficulty: 'moderate',
  });
  const [errors, setErrors] = useState<any>({});
  const [error, setError] = useState('');
  const [banner, setBanner] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  

  useEffect(() => {
    const fetchTourPack = async () => {
      if (!tourPackId) {
        setError('Package ID is required.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/tourpacks/${tourPackId}`);
        const data = await response.json();
        if (data.success) {
          const pack = data.data;
          setForm({
            name: pack.name || '',
            description: pack.description || '',
            price: String(pack.price || ''),
            duration: String(pack.duration || ''),
            kilometers: String(pack.kilometers || ''),
            maxGroupSize: String(pack.maxGroupSize || ''),
            destination: pack.destination || '',
            inclusions: Array.isArray(pack.inclusions) ? pack.inclusions.join(', ') : '',
            availabilityDates: Array.isArray(pack.availabilityDates)
              ? pack.availabilityDates.map((date: string) => new Date(date).toISOString().split('T')[0])
              : [],
            category: pack.category || '',
            tags: Array.isArray(pack.tags) ? pack.tags.join(', ') : '',
            featured: pack.featured || false,
            difficulty: pack.difficulty || 'moderate',
          });
          setCurrentImageUri(pack.image ? `${API_BASE}${pack.image}` : '');
          setGallery(
            Array.isArray(pack.gallery)
              ? pack.gallery.map((img: any, index: number) => ({
                  id: `existing-${index}-${img.url}`,
                  uri: `${API_BASE}${img.url}`,
                  url: img.url,
                  caption: img.caption || '',
                  isFeatured: Boolean(img.isFeatured),
                  existing: true,
                }))
              : []
          );
        } else {
          setError(data.message || 'Tour package not found.');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTourPack();
  }, [tourPackId]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Update Image', 'Choose an option', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Add images to gallery
  const addToGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newImages = result.assets.map((asset: any, index: number) => ({
        uri: asset.uri,
        caption: '',
        isFeatured: false,
        id: Date.now() + index,
      }));
      setGallery(prev => [...prev, ...newImages]);
    }
  };

  const removeFromGallery = (id: string | number) => {
    setGallery(prev => prev.filter(img => img.id !== id));
  };

  const addDate = () => {
    const today = new Date();
    setTempDate(today);
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const action = event?.type || (event?.nativeEvent && event.nativeEvent.action);
    if (action === 'dismissed' || action === 0) {
      setShowDatePicker(false);
      return;
    }

    const currentDate = selectedDate || tempDate;
    setTempDate(currentDate);

    if (Platform.OS === 'android' && (action === 'set' || action === 1 || selectedDate)) {
      setShowDatePicker(false);
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!form.availabilityDates.includes(dateStr)) {
        setForm({ ...form, availabilityDates: [...form.availabilityDates, dateStr] });
      }
    }
  };

  const confirmDate = () => {
    const dateStr = tempDate.toISOString().split('T')[0];
    if (!form.availabilityDates.includes(dateStr)) {
      setForm({ ...form, availabilityDates: [...form.availabilityDates, dateStr] });
    }
    setShowDatePicker(false);
  };

  const removeDate = (date: string) => {
    setForm({ ...form, availabilityDates: form.availabilityDates.filter(d => d !== date) });
  };

  const validate = () => {
    const e: any = {};
    if (!form.name.trim()) e.name = 'Package name is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.price || isNaN(Number(form.price))) e.price = 'Enter a valid price';
    if (!form.duration || isNaN(Number(form.duration))) e.duration = 'Enter valid duration';
    if (form.maxGroupSize && isNaN(Number(form.maxGroupSize))) e.maxGroupSize = 'Enter a valid group size';
    if (!form.destination.trim()) e.destination = 'Destination is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('duration', form.duration);
      formData.append('kilometers', form.kilometers || '0');
      formData.append('maxGroupSize', form.maxGroupSize || '10');
      formData.append('destination', form.destination);
      if (form.inclusions) {
        const incArray = form.inclusions.split(',').map(i => i.trim()).filter(Boolean);
        incArray.forEach(inc => formData.append('inclusions[]', inc));
      }
      if (form.availabilityDates.length > 0) {
        form.availabilityDates.forEach(date => formData.append('availabilityDates[]', date));
      }
      if (form.category) formData.append('category', form.category);
      formData.append('difficulty', form.difficulty);
      if (form.tags) {
        const tagArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
        tagArray.forEach(tag => formData.append('tags[]', tag));
      }
      formData.append('featured', form.featured ? 'true' : 'false');

      const retainedExistingGallery = gallery
        .filter(img => img.existing && img.url)
        .map(img => ({
          url: img.url,
          caption: img.caption || '',
          isFeatured: Boolean(img.isFeatured),
        }));
      formData.append('retainedGalleryJson', JSON.stringify(retainedExistingGallery));

      if (selectedImage) {
        const filename = selectedImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename ?? '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', {
          uri: selectedImage.uri,
          name: filename,
          type,
        } as any);
      }

      // Attach gallery images if selected (only new local files)
      if (gallery && gallery.length > 0) {
        let galleryAdded = false;
        for (let i = 0; i < gallery.length; i++) {
          const img = gallery[i];
          try {
            if (img.existing) continue;
            const filename = img.uri?.split('/').pop() || `img-${i}.jpg`;
            // Only add if it looks like an image
            if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              formData.append('gallery', {
                uri: img.uri,
                name: filename,
                type: 'image/jpeg',
              } as any);
              galleryAdded = true;
            }
          } catch (e) {
            // Skip bad files
          }
        }
        console.log('Gallery files added:', galleryAdded);
      }

      const authHeaders = await getAuthHeaders();
      console.log('AdminEdit - authHeaders:', authHeaders);
        if (!authHeaders.Authorization) {
          console.warn('AdminEdit - no auth header available');
          // Don't auto-redirect to login to avoid losing unsaved changes.
          setBanner({ type: 'error', message: 'Session expired or not signed in. Please sign in to save changes.' });
          // Offer the user to navigate to login explicitly
          Alert.alert('Not signed in', 'Please sign in as admin to save changes.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.push('/login') },
          ]);
          setSaving(false);
          return;
        }

      console.log('AdminEdit - sending PUT to', `${API_BASE}/api/tourpacks/${tourPackId}`);
      const response = await fetch(`${API_BASE}/api/tourpacks/${tourPackId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: formData,
      });
      
      // Get response text first to debug
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      if (data.success) {
        setBanner({ type: 'success', message: 'Tour package updated successfully.' });
        setTimeout(() => {
          router.replace(adminTourPackDetailRoute(tourPackId));
        }, 1500);
      } else {
        setBanner({ type: 'error', message: data.message || 'Could not save package.' });
      }
    } catch (error: any) {
      console.error('Save error:', error);
      setBanner({ type: 'error', message: `Error: ${error?.message || 'Unknown error'}` });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (tourPackId) {
      router.replace(adminTourPackDetailRoute(tourPackId));
    } else {
      router.back();
    }
  };

  const update = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#003580" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtnAlt} onPress={() => router.back()}>
          <Text style={styles.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {banner && (
        <View style={[styles.banner, banner.type === 'success' ? styles.successBanner : styles.errorBanner]}>
          <Text style={styles.bannerText}>{banner.message}</Text>
          <TouchableOpacity onPress={() => setBanner(null)} style={styles.bannerClose}>
            <Text style={styles.bannerCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
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
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>ADMIN EDIT</Text>
            </View>
            <Text style={styles.headerSub}>LUXE TRAVEL</Text>
            <Text style={styles.headerTitle}>Edit Package</Text>
            <Text style={styles.headerDesc}>Update your Sri Lanka tour package details</Text>
          </View>
        </SafeAreaView>
      </View>
      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions} activeOpacity={0.85}>
            {selectedImage || currentImageUri ? (
              <>
                <Image
                  source={selectedImage ? { uri: selectedImage.uri } : { uri: currentImageUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <View style={styles.imageEditBadge}>
                  <Text style={styles.imageEditText}>Change Image</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>📷</Text>
                <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
                <Text style={styles.imagePlaceholderHint}>Camera or Gallery</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Gallery Section */}
          <View style={styles.field}>
            <Text style={styles.label}>📸 Gallery Images</Text>
            <TouchableOpacity style={styles.galleryAddBtn} onPress={addToGallery} activeOpacity={0.8}>
              <Text style={styles.galleryAddBtnText}>+ Add Gallery Images</Text>
            </TouchableOpacity>
            {gallery.length > 0 && (
              <View>
                <Text style={styles.galleryCount}>{gallery.length} image(s) added</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryList}>
                  {gallery.map((img, idx) => (
                    <View key={img.id} style={styles.galleryThumb}>
                      <Image source={{ uri: img.uri }} style={styles.galleryThumbImg} contentFit="cover" />
                      <TouchableOpacity
                        style={styles.galleryRemoveBtn}
                        onPress={() => removeFromGallery(img.id)}
                      >
                        <Text style={styles.galleryRemoveBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Package Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="e.g. Sigiriya Cultural Experience"
              placeholderTextColor="#BBB"
              value={form.name}
              onChangeText={value => update('name', value)}
            />
            {errors.name && <Text style={styles.errText}>{errors.name}</Text>}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Destination <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.destination && styles.inputError]}
              placeholder="e.g. Sigiriya, Sri Lanka"
              placeholderTextColor="#BBB"
              value={form.destination}
              onChangeText={value => update('destination', value)}
            />
            {errors.destination && <Text style={styles.errText}>{errors.destination}</Text>}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe this Sri Lanka experience..."
              placeholderTextColor="#BBB"
              value={form.description}
              onChangeText={value => update('description', value)}
              multiline numberOfLines={4}
            />
            {errors.description && <Text style={styles.errText}>{errors.description}</Text>}
          </View>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 10 }]}> 
              <Text style={styles.label}>Price (LKR) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                placeholder="e.g. 15000"
                placeholderTextColor="#BBB"
                value={form.price}
                onChangeText={value => update('price', value)}
                keyboardType="numeric"
              />
              {errors.price && <Text style={styles.errText}>{errors.price}</Text>}
            </View>
            <View style={[styles.field, { flex: 1 }]}> 
              <Text style={styles.label}>Duration (Days) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.duration && styles.inputError]}
                placeholder="e.g. 5"
                placeholderTextColor="#BBB"
                value={form.duration}
                onChangeText={value => update('duration', value)}
                keyboardType="numeric"
              />
              {errors.duration && <Text style={styles.errText}>{errors.duration}</Text>}
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Kilometers (Distance)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 150"
                placeholderTextColor="#BBB"
                value={form.kilometers}
                onChangeText={value => update('kilometers', value)}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Max Group Size</Text>
              <TextInput
                style={[styles.input, errors.maxGroupSize && styles.inputError]}
                placeholder="e.g. 10"
                placeholderTextColor="#BBB"
                value={form.maxGroupSize}
                onChangeText={value => update('maxGroupSize', value)}
                keyboardType="numeric"
              />
              {errors.maxGroupSize && <Text style={styles.errText}>{errors.maxGroupSize}</Text>}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Inclusions</Text>
            <Text style={styles.hint}>Separate each item with a comma</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Hotel stay, Breakfast, Transport, Guide"
              placeholderTextColor="#BBB"
              value={form.inclusions}
              onChangeText={value => update('inclusions', value)}
              multiline numberOfLines={3}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Availability Dates</Text>
            <Text style={styles.hint}>Tap dates to remove. On iOS, choose a date then press Add Date.</Text>
            <View style={styles.datesContainer}>
              {form.availabilityDates.map((date, index) => (
                <TouchableOpacity key={index} style={styles.dateChip} onPress={() => removeDate(date)}>
                  <Text style={styles.dateChipText}>{new Date(date).toLocaleDateString()}</Text>
                  <Text style={styles.dateChipRemove}>×</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addDateBtn} onPress={addDate}>
                <Text style={styles.addDateText}>+ Add Date</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Adventure, Cultural"
              placeholderTextColor="#BBB"
              value={form.category}
              onChangeText={value => update('category', value)}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {['easy', 'moderate', 'hard'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.difficultyChip,
                    form.difficulty === level && styles.difficultyChipActive,
                  ]}
                  onPress={() => setForm({ ...form, difficulty: level })}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.difficultyChipText,
                      form.difficulty === level && styles.difficultyChipTextActive,
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Tags</Text>
            <Text style={styles.hint}>Separate each tag with a comma</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Beach, Hiking, Family"
              placeholderTextColor="#BBB"
              value={form.tags}
              onChangeText={value => update('tags', value)}
            />
          </View>
          <View style={styles.field}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Featured Package</Text>
              <Switch
                value={form.featured}
                onValueChange={value => setForm({ ...form, featured: value })}
                trackColor={{ false: '#767577', true: '#003580' }}
                thumbColor={form.featured ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
      {Platform.OS === 'android' && showDatePicker ? (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      ) : null}

      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  const action = event?.type || (event as any)?.nativeEvent?.action;
                  if (action === 'dismissed') {
                    setShowDatePicker(false);
                    return;
                  }
                  if (date) setTempDate(date);
                }}
                minimumDate={new Date()}
              />
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmDate}>
                  <Text style={styles.modalConfirmText}>Add Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F8' },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#4CAF50',
  },
  successBanner: { backgroundColor: '#4CAF50' },
  errorBanner: { backgroundColor: '#F44336' },
  bannerText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  bannerClose: { padding: 4 },
  bannerCloseText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  heroHeader: { height: 250, position: 'relative' },
  headerBg: { ...StyleSheet.absoluteFillObject as any },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(2, 12, 37, 0.82)',
  },
  headerContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  backText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  adminPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  adminPillText: { color: '#0B1E44', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  headerSub: { color: 'rgba(255,255,255,0.74)', fontSize: 11, letterSpacing: 3, marginBottom: 4 },
  headerTitle: { color: '#fff', fontSize: 31, fontWeight: '900' },
  headerDesc: { color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 4 },
  formScroll: { flex: 1 },
  formCard: {
    margin: 16, backgroundColor: '#fff',
    borderRadius: 24, padding: 20,
    borderWidth: 1,
    borderColor: '#DCE4F3',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  imagePicker: {
    height: 180, borderRadius: 16,
    overflow: 'hidden', marginBottom: 20,
    backgroundColor: '#F0F4FF',
    borderWidth: 2, borderColor: '#D0D8F0',
    borderStyle: 'dashed',
  },
  imagePreview: { width: '100%', height: '100%' },
  imageEditBadge: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: '#003580',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  imageEditText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  imagePlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  imagePlaceholderIcon: { fontSize: 36, marginBottom: 8 },
  imagePlaceholderText: { fontSize: 15, fontWeight: '600', color: '#003580' },
  imagePlaceholderHint: { fontSize: 12, color: '#999', marginTop: 4 },
  row: { flexDirection: 'row' },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 7 },
  required: { color: '#E53935' },
  hint: { fontSize: 11, color: '#999', marginBottom: 6 },
  input: {
    backgroundColor: '#F8F9FF', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#1A1A2E',
    borderWidth: 1.5, borderColor: '#E8ECF4',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  inputError: { borderColor: '#E53935' },
  errText: { color: '#E53935', fontSize: 11, marginTop: 4 },
  buttonRow: {
    flexDirection: 'row', gap: 12, marginTop: 8,
  },
  cancelBtn: {
    flex: 1, backgroundColor: '#E0E0E0', borderRadius: 30,
    height: 58, justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: {
    color: '#1A1A2E', fontSize: 16, fontWeight: '700',
  },
  submitBtn: {
    flex: 1, backgroundColor: '#0B1E44', borderRadius: 30,
    height: 58, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0B1E44', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#E53935', fontSize: 15, marginBottom: 16 },
  backBtnAlt: {
    backgroundColor: '#003580', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 20,
  },
  backBtnAltText: { color: '#fff', fontWeight: '600' },
  datesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: {
    backgroundColor: '#003580', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  dateChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dateChipRemove: { color: '#fff', fontSize: 16, marginLeft: 8 },
  addDateBtn: {
    backgroundColor: '#E0E0E0', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  addDateText: { color: '#003580', fontSize: 12, fontWeight: '600' },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  difficultyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D6DDF0',
    backgroundColor: '#F8F9FF',
  },
  difficultyChipActive: {
    backgroundColor: '#003580',
    borderColor: '#003580',
  },
  difficultyChipText: {
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '700',
  },
  difficultyChipTextActive: {
    color: '#fff',
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 20, width: '80%', alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  modalConfirmBtn: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#003580',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  modalCancelText: { color: '#1A1A2E', fontWeight: '700' },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
  modalCloseBtn: {
    marginTop: 20, backgroundColor: '#003580',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  modalCloseText: { color: '#fff', fontWeight: '600' },
  galleryAddBtn: {
    backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#FFC700',
  },
  galleryAddBtnText: { color: '#003580', fontWeight: '700', fontSize: 14 },
  galleryCount: { color: '#666', fontSize: 12, marginTop: 10, marginBottom: 10 },
  galleryList: { marginTop: 10, marginBottom: 16 },
  galleryThumb: {
    width: 70, height: 70, borderRadius: 8, marginRight: 10,
    backgroundColor: '#f0f0f0', overflow: 'hidden', position: 'relative',
  },
  galleryThumbImg: { width: '100%', height: '100%' },
  galleryRemoveBtn: {
    position: 'absolute', top: -5, right: -5, width: 28, height: 28,
    borderRadius: 14, backgroundColor: '#E53935', justifyContent: 'center',
    alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  galleryRemoveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
