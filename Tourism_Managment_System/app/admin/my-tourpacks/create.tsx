import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
  Modal, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { adminTourPacksListRoute } from '../../../src/routes/adminTourpacks';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE } from '../../../src/config';
import { getAuthHeaders } from '../../../src/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminCreateTourPackScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '', description: '', price: '',
    duration: '', maxGroupSize: '', destination: '',
    inclusions: '', availabilityDates: [] as string[],
    category: '', tags: '', featured: false, difficulty: 'moderate',
  });
  const [errors, setErrors] = useState<any>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Pick image from gallery
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
      setImage(result.assets[0]);
    }
  };

  // Take photo with camera
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
      setImage(result.assets[0]);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Image', 'Choose an option', [
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

  const removeFromGallery = (id: number) => {
    setGallery(gallery.filter(img => img.id !== id));
  };

  const addDate = () => {
    setTempDate(new Date());
    setShowDatePicker(true);
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

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      console.log('--- Submission Started ---');
      const authHeaders = await getAuthHeaders();
      console.log('Auth Headers retrieved:', authHeaders.Authorization ? 'YES (Token Present)' : 'NO (Token Missing)');

      if (!authHeaders.Authorization) {
        Alert.alert('Session expired', 'Please sign in again as admin.');
        router.replace('/login');
        return;
      }

      // Create FormData
      const formData = new FormData();
      
      // Helper function to fetch blob from URI (crucial for Web)
      const getBlobFromUri = async (uri: string) => {
        const response = await fetch(uri);
        return await response.blob();
      };
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('duration', form.duration);
      formData.append('maxGroupSize', form.maxGroupSize || '10');
      formData.append('destination', form.destination);
      formData.append('category', form.category);
      formData.append('difficulty', form.difficulty);
      formData.append('featured', form.featured.toString());
      if (form.tags) {
        const tagsArray = form.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        tagsArray.forEach(tag => formData.append('tags[]', tag));
      }
      if (form.inclusions) {
        const incArray = form.inclusions.split(',').map(i => i.trim()).filter(Boolean);
        incArray.forEach(inc => formData.append('inclusions[]', inc));
      }
      if (form.availabilityDates.length > 0) {
        form.availabilityDates.forEach(date => formData.append('availabilityDates[]', date));
      }

      // Attach featured image if selected
      if (image) {
        if (Platform.OS === 'web') {
          const blob = await getBlobFromUri(image.uri);
          formData.append('image', blob, image.fileName || 'featured-image.jpg');
        } else {
          const filename = image.uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename ?? '');
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          formData.append('image', {
            uri: image.uri,
            name: filename,
            type,
          } as any);
        }
      }

      // Attach gallery images if selected (only new local files)
      if (gallery && gallery.length > 0) {
        let galleryAdded = false;
        for (let i = 0; i < gallery.length; i++) {
          const img = gallery[i];
          try {
            const filename = img.uri?.split('/').pop() || `img-${i}.jpg`;
            // Only add if it looks like an image
            if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              if (Platform.OS === 'web') {
                const blob = await getBlobFromUri(img.uri);
                formData.append('gallery', blob, filename);
              } else {
                formData.append('gallery', {
                  uri: img.uri,
                  name: filename,
                  type: 'image/jpeg',
                } as any);
              }
              galleryAdded = true;
            }
          } catch (e) {
            // Skip bad files
          }
        }
        console.log('Gallery files added:', galleryAdded);
      }

      console.log('Sending request to:', `${API_BASE}/api/tourpacks`);
      const response = await fetch(`${API_BASE}/api/tourpacks`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success! 🎉', 'Tour package created!', [
          { text: 'View All', onPress: () => router.replace(adminTourPacksListRoute) },
        ]);

        if (Platform.OS === 'web') {
          setTimeout(() => {
            router.replace(adminTourPacksListRoute);
          }, 1500);
        }
      } else {
        Alert.alert('Error', data.message || 'Something went wrong');
      }
    } catch (error: any) {
      console.error('Create error:', error);
      Alert.alert('Error', `${error?.message || 'Network error. Make sure the server is running.'}`);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, val: string) => {
    setForm({ ...form, [field]: val });
    setErrors({ ...errors, [field]: '' });
  };

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
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>ADMIN CREATE</Text>
            </View>
            <Text style={styles.headerSub}>LUXE TRAVEL</Text>
            <Text style={styles.headerTitle}>New Package</Text>
            <Text style={styles.headerDesc}>Create a Sri Lanka tour experience</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>

          {/* Image Picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions} activeOpacity={0.85}>
            {image ? (
              <>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} contentFit="cover" />
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

          {/* Package Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Package Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="e.g. Sigiriya Cultural Experience"
              placeholderTextColor="#BBB"
              value={form.name}
              onChangeText={v => update('name', v)}
            />
            {errors.name && <Text style={styles.errText}>{errors.name}</Text>}
          </View>

          {/* Destination */}
          <View style={styles.field}>
            <Text style={styles.label}>Destination <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.destination && styles.inputError]}
              placeholder="e.g. Sigiriya, Sri Lanka"
              placeholderTextColor="#BBB"
              value={form.destination}
              onChangeText={v => update('destination', v)}
            />
            {errors.destination && <Text style={styles.errText}>{errors.destination}</Text>}
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe this Sri Lanka experience..."
              placeholderTextColor="#BBB"
              value={form.description}
              onChangeText={v => update('description', v)}
              multiline numberOfLines={4}
            />
            {errors.description && <Text style={styles.errText}>{errors.description}</Text>}
          </View>

          {/* Price & Duration Row */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Price (LKR) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                placeholder="e.g. 15000"
                placeholderTextColor="#BBB"
                value={form.price}
                onChangeText={v => update('price', v)}
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
                onChangeText={v => update('duration', v)}
                keyboardType="numeric"
              />
              {errors.duration && <Text style={styles.errText}>{errors.duration}</Text>}
            </View>
          </View>

          {/* Max Group Size */}
          <View style={styles.field}>
            <Text style={styles.label}>Max Group Size</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10 (default)"
              placeholderTextColor="#BBB"
              value={form.maxGroupSize}
              onChangeText={v => update('maxGroupSize', v)}
              keyboardType="numeric"
            />
          </View>

          {/* Inclusions */}
          <View style={styles.field}>
            <Text style={styles.label}>Inclusions</Text>
            <Text style={styles.hint}>Separate each item with a comma</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Hotel stay, Breakfast, Transport, Guide"
              placeholderTextColor="#BBB"
              value={form.inclusions}
              onChangeText={v => update('inclusions', v)}
              multiline numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Availability Dates</Text>
            <Text style={styles.hint}>Tap a date to remove it.</Text>
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

          {showDatePicker && (
            <Modal visible={showDatePicker} transparent animationType="slide">
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Date</Text>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      const action = (event as any)?.type || (event as any)?.nativeEvent?.action;
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

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cultural, Adventure, Beach"
              placeholderTextColor="#BBB"
              value={form.category}
              onChangeText={v => update('category', v)}
            />
          </View>

          {/* Difficulty */}
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

          {/* Tags */}
          <View style={styles.field}>
            <Text style={styles.label}>Tags</Text>
            <Text style={styles.hint}>Separate each tag with a comma</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. heritage, hiking, luxury"
              placeholderTextColor="#BBB"
              value={form.tags}
              onChangeText={v => update('tags', v)}
            />
          </View>

          {/* Featured */}
          <View style={styles.field}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setForm({ ...form, featured: !form.featured })}
            >
              <View style={[styles.checkbox, form.featured && styles.checkboxChecked]}>
                {form.featured && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Mark as Featured Package</Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Create Tour Package 🚀</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F8' },
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
    alignSelf: 'center',
    width: '92%',
    maxWidth: 600,
  },

  // Image Picker
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
  submitBtn: {
    backgroundColor: '#0B1E44', borderRadius: 30,
    height: 58, justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0B1E44', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#003580',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#003580',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '500',
  },
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
  datesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003580',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dateChipRemove: { color: '#fff', fontSize: 16, marginLeft: 8 },
  addDateBtn: {
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addDateText: { color: '#003580', fontSize: 12, fontWeight: '600' },
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
    flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1, marginRight: 10,
    backgroundColor: '#E0E0E0', paddingHorizontal: 16,
    paddingVertical: 12, borderRadius: 18, alignItems: 'center',
  },
  modalConfirmBtn: {
    flex: 1, marginLeft: 10,
    backgroundColor: '#003580', paddingHorizontal: 16,
    paddingVertical: 12, borderRadius: 18, alignItems: 'center',
  },
  modalCancelText: { color: '#1A1A2E', fontWeight: '700' },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
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