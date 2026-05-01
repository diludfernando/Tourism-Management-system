import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { API_BASE } from '../src/config';
import { saveAuthSession } from '../src/auth';

const API_URL = `${API_BASE}/api/users`;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;

export default function SignupScreen() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async () => {
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedPhone = phoneNumber.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedPhone || !normalizedEmail || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (normalizedName.length < 2 || normalizedName.length > 60) {
      setErrorMsg('Name must be between 2 and 60 characters.');
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!phoneRegex.test(normalizedPhone)) {
      setErrorMsg('Please enter a valid phone number (10-15 digits).');
      return;
    }

    if (!passwordRegex.test(password)) {
      setErrorMsg('Password must include upper/lowercase, number, special character, and be 8+ chars.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    
    setErrorMsg('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: normalizedName,
          phoneNumber: normalizedPhone,
          email: normalizedEmail,
          password,
        }),
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        setErrorMsg(data.message || 'Registration failed');
        return;
      }

      if (!data?.token || !data?.role) {
        setErrorMsg('Account created, but authentication data is missing. Please sign in.');
        router.replace('/login');
        return;
      }

      await saveAuthSession(data.token, data.role);
      console.log('✅ Registration successful:', data.email);
      Alert.alert('Success', 'Account created successfully!');
      router.replace(data.role === 'admin' ? '/admin' : '/explore');
    } catch (error) {
      console.error('Signup Error:', error);
      setErrorMsg('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Image Section */}
      <View style={styles.bgContainer}>
        <Image
          source={require('@/assets/images/travel-hero.png')}
          style={styles.bgImage}
          contentFit="cover"
          transition={1000}
        />
        <View style={styles.overlay} />
      </View>
      
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
            <Ionicons name="home-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={styles.welcomeText}>Create an Account</Text>
            <Text style={styles.subtitleText}>Sign up to start managing your trips</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#E53E3E" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Alex Fernando"
                value={name}
                onChangeText={(text) => { setName(text); setErrorMsg(''); }}
                autoCapitalize="words"
                textContentType="name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +94771234567"
                value={phoneNumber}
                onChangeText={(text) => { setPhoneNumber(text); setErrorMsg(''); }}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="telephoneNumber"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@example.com"
                value={email}
                onChangeText={(text) => { setEmail(text); setErrorMsg(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                value={password}
                onChangeText={(text) => { setPassword(text); setErrorMsg(''); }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); setErrorMsg(''); }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
            </View>

            <Text style={styles.helperText}>
              Use 8+ characters with uppercase, lowercase, number, and special character.
            </Text>

            <TouchableOpacity 
              style={[styles.loginButton, loading && { opacity: 0.8 }]} 
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign Up</Text>
              
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
            
          </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 50,
  },
  titleContainer: {
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
    marginBottom: 20,
  },
  errorText: {
    color: '#C53030',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  helperText: {
    color: '#CBD5E0',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  loginButton: {
    backgroundColor: '#003580',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003580',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 10,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#E2E8F0',
    fontSize: 15,
  },
  footerLink: {
    color: '#63B3ED', // Bright blue for visibility on dark background
    fontSize: 15,
    fontWeight: 'bold',
  },
});
