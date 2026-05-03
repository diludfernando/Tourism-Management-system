import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
  Modal, Platform, SafeAreaView, Switch
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE } from '../../../src/config';
import { getAuthHeaders } from '../../../src/auth';
import { adminTourPacksListRoute } from '../../../src/routes/adminTourpacks';

export default function AdminCreateTourPackScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '', description: '', price: '',
    duration: '', distance: '', maxGroupSize: '', destination: '',
    inclusions: '', availabilityDates: [] as string[],
    category: '', tags: '', featured: false, difficulty: 'moderate',
  });
  const [errors, setErrors] = useState<any>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

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
      base64: true,
    });
    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
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
      base64: true,
    });
    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'web') {
      pickImage();
      return;
    }
    Alert.alert('Add Image', 'Choose an option', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const addToGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      const newImages = result.assets.map((asset: any, index: number) => ({
        uri: `data:image/jpeg;base64,${asset.base64}`,
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        if (!form.availabilityDates.includes(dateStr)) {
          setForm({ ...form, availabilityDates: [...form.availabilityDates, dateStr] });
        }
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const confirmDateIOS = () => {
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
    if (!form.distance || isNaN(Number(form.distance))) e.distance = 'Enter valid distance';
    if (!form.destination.trim()) e.destination = 'Destination is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders({ 'Content-Type': 'application/json' });
      
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        duration: Number(form.duration),
        distance: Number(form.distance),
        maxGroupSize: Number(form.maxGroupSize || '10'),
        destination: form.destination,
        category: form.category,
        difficulty: form.difficulty,
        featured: form.featured,
        tags: form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        inclusions: form.inclusions ? form.inclusions.split(',').map(i => i.trim()).filter(Boolean) : [],
        availabilityDates: form.availabilityDates,
        image: image, // This is now a base64 string
        gallery: gallery.map(img => ({ url: img.uri, caption: '', isFeatured: false }))
      };

      const response = await fetch(`${API_BASE}/api/tourpacks`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Tour package created!');
        router.replace(adminTourPacksListRoute);
      } else {
        Alert.alert('Error', data.message || 'Something went wrong');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, val: string) => {
    setForm({ ...form, [field]: val });
    setErrors({ ...errors, [field]: '' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Package</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Cover Image */}
        <Text style={styles.sectionTitle}>Cover Image</Text>
        <TouchableOpacity style={styles.imagePickerCard} onPress={showImageOptions}>
          {image ? (
            <>
              <Image source={{ uri: image || undefined }} style={styles.imagePreview} contentFit="cover" />
              <View style={styles.editImageOverlay}>
                <Ionicons name="camera" size={24} color="#FFF" />
                <Text style={styles.editImageText}>Change Cover</Text>
              </View>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={48} color="#A0AEC0" />
              <Text style={styles.placeholderText}>Select Package Cover</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Gallery */}
        <Text style={styles.sectionTitle}>Gallery Images</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
          <TouchableOpacity style={styles.addGalleryBtn} onPress={addToGallery}>
            <Ionicons name="add" size={32} color="#003580" />
            <Text style={styles.addGalleryText}>Add</Text>
          </TouchableOpacity>
          {gallery.map((img) => (
            <View key={img.id} style={styles.galleryThumbWrap}>
              <Image source={{ uri: img.uri || undefined }} style={styles.galleryThumb} contentFit="cover" />
              <TouchableOpacity style={styles.removeGalleryBtn} onPress={() => removeFromGallery(img.id)}>
                <Ionicons name="close-circle" size={24} color="#E53935" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Package Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Sigiriya Cultural Tour"
            value={form.name}
            onChangeText={value => update('name', value)}
          />

          <Text style={styles.label}>Destination *</Text>
          <TextInput
            style={[styles.input, errors.destination && styles.inputError]}
            placeholder="Sigiriya, Sri Lanka"
            value={form.destination}
            onChangeText={value => update('destination', value)}
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            placeholder="Full package details..."
            value={form.description}
            onChangeText={value => update('description', value)}
            multiline
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Price (LKR) *</Text>
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                placeholder="25000"
                value={form.price}
                onChangeText={value => update('price', value)}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Duration (Days) *</Text>
              <TextInput
                style={[styles.input, errors.duration && styles.inputError]}
                placeholder="3"
                value={form.duration}
                onChangeText={value => update('duration', value)}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Distance (km) *</Text>
              <TextInput
                style={[styles.input, errors.distance && styles.inputError]}
                placeholder="150"
                value={form.distance}
                onChangeText={value => update('distance', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>Max Group Size</Text>
          <TextInput
            style={styles.input}
            placeholder="10"
            value={form.maxGroupSize}
            onChangeText={value => update('maxGroupSize', value)}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Inclusions (comma separated)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Hotel, Breakfast, Guide..."
            value={form.inclusions}
            onChangeText={value => update('inclusions', value)}
            multiline
          />

          <Text style={styles.label}>Availability Dates</Text>
          <View style={styles.datesGrid}>
            {form.availabilityDates.map((date, idx) => (
              <TouchableOpacity key={idx} style={styles.dateChip} onPress={() => removeDate(date)}>
                <Text style={styles.dateChipText}>{date}</Text>
                <Ionicons name="close-circle" size={16} color="#FFF" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addDateBtn} onPress={addDate}>
              <Ionicons name="calendar-outline" size={18} color="#003580" />
              <Text style={styles.addDateBtnText}>Add Date</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuredRow}>
            <Text style={styles.label}>Mark as Featured</Text>
            <Switch
              value={form.featured}
              onValueChange={val => setForm({ ...form, featured: val })}
              trackColor={{ false: '#CBD5E0', true: '#003580' }}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, loading && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Create Tour Package 🚀</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Modals */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker value={tempDate} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
      )}
      <Modal visible={showDatePicker && Platform.OS === 'ios'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.iosDatePickerCard}>
            <View style={styles.iosDatePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={styles.iosCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDateIOS}><Text style={styles.iosDoneText}>Done</Text></TouchableOpacity>
            </View>
            <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={onDateChange} minimumDate={new Date()} />
          </View>
        </View>
      </Modal>
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
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 15,
    marginLeft: 5,
  },
  imagePickerCard: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  editImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  editImageText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 10,
  },
  placeholderText: {
    color: '#A0AEC0',
    fontWeight: '600',
  },
  galleryScroll: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  addGalleryBtn: {
    width: 100,
    height: 80,
    borderRadius: 15,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addGalleryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003580',
    marginTop: 2,
  },
  galleryThumbWrap: {
    marginRight: 12,
    position: 'relative',
  },
  galleryThumb: {
    width: 100,
    height: 80,
    borderRadius: 15,
  },
  removeGalleryBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  formContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#E53935',
  },
  row: {
    flexDirection: 'row',
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003580',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  dateChipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#003580',
    borderStyle: 'dashed',
    gap: 8,
  },
  addDateBtnText: {
    color: '#003580',
    fontWeight: '700',
    fontSize: 12,
  },
  featuredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#003580',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#003580',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  iosDatePickerCard: {
    backgroundColor: '#FFF',
    paddingBottom: 40,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iosCancelText: {
    color: '#E53935',
    fontWeight: '600',
  },
  iosDoneText: {
    color: '#003580',
    fontWeight: '700',
  },
});