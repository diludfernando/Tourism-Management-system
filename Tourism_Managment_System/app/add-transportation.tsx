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
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

// Configuration for API URL
// Use your machine's local IP (e.g., http://192.168.1.5:5000) if testing on a real device
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export default function AddTransportationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicleName: '',
    vehicleType: '',
    brandModel: '',
    plateNumber: '',
    capacity: '',
    price: '',
    description: '',
  });

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
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
    const { vehicleName, vehicleType, plateNumber, capacity, price } = formData;
    
    if (!vehicleName || !vehicleType || !plateNumber || !capacity || !price) {
      Alert.alert('Required Fields', 'Please fill in all mandatory fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/transportation`, {
        method: 'POST',
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

      console.log('Frontend Response Status:', response.status);
      const data = await response.json();
      console.log('Frontend Response Data:', data);

      if (response.ok) {
        console.log('✅ Save successful, preparing to redirect...');
        Alert.alert(
          'Success',
          'Vehicle information has been saved successfully!',
          [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('User clicked OK, redirecting to /admin');
                router.push('/admin');
              } 
            }
          ]
        );
        
        // Fallback for web if Alert button doesn't trigger
        if (Platform.OS === 'web') {
          setTimeout(() => {
            router.push('/admin');
          }, 1500);
        }
      } else {
        console.log('❌ Save failed:', data.message);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Transportation</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Image (Optional)</Text>
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
              <Text style={styles.label}>Vehicle Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Luxury Tour Bus"
                value={formData.vehicleName}
                onChangeText={(text) => updateField('vehicleName', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Type *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bus, Van, Car"
                value={formData.vehicleType}
                onChangeText={(text) => updateField('vehicleType', text)}
              />
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

            <TouchableOpacity 
              style={[styles.submitButton, loading && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Save Vehicle</Text>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
});
