import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

// Configuration for API URL
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const ACCOMMODATION_TYPES = [
  'Hotel',
  'Resort',
  'Villa',
  'Apartment',
  'Guest House',
  'Hostel',
  'Other'
];

export default function AddHotelScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    pricePerNight: '',
    totalRooms: '',
    availableRooms: '',
    accommodationType: '',
    contactNumber: '',
    amenities: '', // Will split by comma before sending
  });

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

  const handleSave = async () => {
    const { 
      name, location, description, pricePerNight, 
      totalRooms, availableRooms, accommodationType, 
      contactNumber, amenities 
    } = formData;
    
    if (!name || !location || !description || !pricePerNight || !totalRooms || !availableRooms || !accommodationType) {
      Alert.alert('Required Fields', 'Please fill in all mandatory fields.');
      return;
    }

    if (Number(availableRooms) > Number(totalRooms)) {
      Alert.alert('Validation Error', 'Available rooms cannot be greater than total rooms.');
      return;
    }

    setLoading(true);
    try {
      const amenitiesArray = amenities ? amenities.split(',').map(item => item.trim()) : [];

      const response = await fetch(`${API_URL}/api/hotels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          location,
          description,
          pricePerNight: Number(pricePerNight),
          totalRooms: Number(totalRooms),
          availableRooms: Number(availableRooms),
          accommodationType,
          contactNumber,
          amenities: amenitiesArray,
          image,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Hotel information has been saved successfully!',
          [
            { 
              text: 'OK', 
              onPress: () => router.push('/hotels')
            }
          ]
        );
        
        if (Platform.OS === 'web') {
          setTimeout(() => {
            router.push('/hotels');
          }, 1500);
        }
      } else {
        Alert.alert('Error', data.message || 'Something went wrong while saving.');
      }
    } catch (error) {
      console.error('Save Error:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please check your network and ensure the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Accommodation</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Accommodation Image</Text>
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
                    <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grand Plaza Hotel"
                value={formData.name}
                onChangeText={(text) => updateField('name', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Accommodation Type *</Text>
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowTypePicker(true)}
              >
                <Text style={[
                  styles.pickerValue, 
                  !formData.accommodationType && styles.placeholderText
                ]}>
                  {formData.accommodationType || 'Select Type'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Colombo, Sri Lanka"
                value={formData.location}
                onChangeText={(text) => updateField('location', text)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Total Rooms *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 50"
                  keyboardType="numeric"
                  value={formData.totalRooms}
                  onChangeText={(text) => updateField('totalRooms', text)}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Available *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 20"
                  keyboardType="numeric"
                  value={formData.availableRooms}
                  onChangeText={(text) => updateField('availableRooms', text)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price Per Night (LKR) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 15000"
                keyboardType="numeric"
                value={formData.pricePerNight}
                onChangeText={(text) => updateField('pricePerNight', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +94 11 234 5678"
                keyboardType="phone-pad"
                value={formData.contactNumber}
                onChangeText={(text) => updateField('contactNumber', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amenities (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. WiFi, Pool, Spa"
                value={formData.amenities}
                onChangeText={(text) => updateField('amenities', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Details about the accommodation..."
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(text) => updateField('description', text)}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, loading && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Save Accommodation</Text>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Accommodation Type Picker Modal */}
      <Modal
        visible={showTypePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowTypePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Type</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ACCOMMODATION_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.typeOption}
                  onPress={() => {
                    updateField('accommodationType', item);
                    setShowTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.typeOptionText,
                    formData.accommodationType === item && styles.selectedTypeOptionText
                  ]}>
                    {item}
                  </Text>
                  {formData.accommodationType === item && (
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
    backgroundColor: '#003580',
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
    maxHeight: Dimensions.get('window').height * 0.6,
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
