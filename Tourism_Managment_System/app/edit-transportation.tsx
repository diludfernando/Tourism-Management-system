import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  useWindowDimensions
} from 'react-native';;
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { API_BASE } from '../src/config';

const API_URL = `${API_BASE}/api/transportation`;

const VEHICLE_TYPES = [
  'Car',
  'Van',
  'Bus',
  'SUV',
  'Mini Bus',
  'Luxury Car',
  'Motorbike',
  'Other'
];

export default function EditTransportationScreen() {
  const router = useRouter();
  const { id, admin } = useLocalSearchParams<{ id?: string; admin?: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showVehicleTypePicker, setShowVehicleTypePicker] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicleType: '',
    brandModel: '',
    plateNumber: '',
    capacity: '',
    price: '',
    description: '',
    contactNumber: '',
  });
  const isAdminMode = admin === 'true';
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (!isAdminMode) {
      router.replace('/');
      return;
    }
    if (id) {
      fetchVehicleDetails();
    }
  }, [id, isAdminMode, router]);

  const fetchVehicleDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      const data = await response.json();
      if (response.ok) {
        setFormData({
          vehicleType: data.vehicleType || '',
          brandModel: data.brandModel || '',
          plateNumber: data.plateNumber || '',
          capacity: data.capacity ? data.capacity.toString() : '',
          price: data.price ? data.price.toString() : '',
          description: data.description || '',
          contactNumber: data.contactNumber || '',
        });
        if (data.vehicleImage) setImage(data.vehicleImage);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch details');
        router.push({ pathname: '/transportation', params: { admin: 'true' } });
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', 'Could not connect to the server.');
      router.push({ pathname: '/transportation', params: { admin: 'true' } });
    } finally {
      setFetching(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleUpdate = async () => {
    const { vehicleType, plateNumber, capacity, price } = formData;
    
    if (!vehicleType || !plateNumber || !capacity || !price) {
      Alert.alert('Required Fields', 'Please fill in all mandatory fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          capacity: Number(capacity),
          price: Number(price),
          vehicleImage: image,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Vehicle information has been updated successfully!',
          [
            { 
              text: 'OK', 
              onPress: () => {
                router.push({ pathname: '/transportation', params: { admin: 'true' } });
              } 
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Something went wrong while updating.');
      }
    } catch (error) {
      console.error('Update Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isAdminMode) {
    return null;
  }

  if (fetching) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003580" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/transportation', params: { admin: 'true' } })} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Transportation</Text>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="home-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Image</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image 
                      source={{ uri: image }} 
                      style={styles.imagePreview} 
                      contentFit="cover"
                    />
                    <TouchableOpacity 
                      style={styles.removeImageButton} 
                      onPress={() => setImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#888" />
                    <Text style={styles.imagePlaceholderText}>Add Vehicle Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Type *</Text>
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowVehicleTypePicker(true)}
              >
                <Text style={[
                  styles.pickerValue, 
                  !formData.vehicleType && styles.placeholderText
                ]}>
                  {formData.vehicleType || 'Select Vehicle Type'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand & Model</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Toyota Coaster 2024"
                value={formData.brandModel}
                onChangeText={(text) => updateField('brandModel', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plate Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ABC-1234"
                autoCapitalize="characters"
                value={formData.plateNumber}
                onChangeText={(text) => updateField('plateNumber', text)}
                editable={false} // Plate number usually shouldn't change
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Capacity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Seats"
                  keyboardType="numeric"
                  value={formData.capacity}
                  onChangeText={(text) => updateField('capacity', text)}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Price (LKR) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Per Day"
                  keyboardType="numeric"
                  value={formData.price}
                  onChangeText={(text) => updateField('price', text)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional details, features, etc."
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(text) => updateField('description', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +94 77 123 4567"
                keyboardType="phone-pad"
                value={formData.contactNumber}
                onChangeText={(text) => updateField('contactNumber', text)}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, loading && { opacity: 0.7 }]} 
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Update Vehicle</Text>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showVehicleTypePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVehicleTypePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowVehicleTypePicker(false)}
        >
          <View style={[styles.modalContent, { maxHeight: height * 0.6 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle Type</Text>
              <TouchableOpacity onPress={() => setShowVehicleTypePicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={VEHICLE_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.typeOption}
                  onPress={() => {
                    updateField('vehicleType', item);
                    setShowVehicleTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.typeOptionText,
                    formData.vehicleType === item && styles.selectedTypeOptionText
                  ]}>
                    {item}
                  </Text>
                  {formData.vehicleType === item && (
                    <Ionicons name="checkmark-sharp" size={20} color="#003580" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9F9F9',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#888',
    marginTop: 8,
    fontSize: 14,
  },
  imagePreviewContainer: {
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: '#F57C00',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  pickerValue: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  typeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  typeOptionText: {
    fontSize: 17,
    color: '#444',
  },
  selectedTypeOptionText: {
    color: '#003580',
    fontWeight: 'bold',
  },
});
