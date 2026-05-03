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
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { API_BASE } from '../src/config';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestOTP = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'Verification code sent! Check your email (Simulated in console).');
        setStep(2);
      } else {
        setErrorMsg(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setErrorMsg('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/users/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(3);
      } else {
        setErrorMsg(data.message || 'Invalid verification code');
      }
    } catch (error) {
      setErrorMsg('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorMsg('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    // Complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setErrorMsg('Password must be 8+ chars with uppercase, lowercase, number, and special character');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const finalEmail = email.trim().toLowerCase();
    console.log('Sending Reset Request:', { email: finalEmail, otp });

    try {
      const response = await fetch(`${API_BASE}/api/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: finalEmail, otp, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(4);
      } else {
        setErrorMsg(data.message || 'Failed to reset password');
      }
    } catch (error) {
      setErrorMsg('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Forgot Password?</Text>
            <Text style={styles.subtitleText}>Enter your registered email address to receive a verification code.</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="yourname@example.com"
                value={email}
                onChangeText={(text) => { setEmail(text); setErrorMsg(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && { opacity: 0.8 }]} 
              onPress={handleRequestOTP}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Send Code</Text>}
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Verify Code</Text>
            <Text style={styles.subtitleText}>We've sent a 6-digit code to {email}.</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                placeholder="123456"
                value={otp}
                onChangeText={(text) => { setOtp(text.replace(/[^0-9]/g, '')); setErrorMsg(''); }}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                style={[styles.input, styles.otpInput]}
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && { opacity: 0.8 }]} 
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Verify Code</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep(1)} style={styles.backToEmail}>
              <Text style={styles.backToEmailText}>Change Email</Text>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>New Password</Text>
            <Text style={styles.subtitleText}>Create a strong new password for your account.</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(text) => { setNewPassword(text); setErrorMsg(''); }}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); setErrorMsg(''); }}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && { opacity: 0.8 }]} 
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View style={[styles.formContainer, styles.successContainerStep]}>
            <View style={styles.successIconCircle}>
              <View style={styles.innerSuccessCircle}>
                <Ionicons name="checkmark" size={60} color="#FFF" />
              </View>
            </View>
            
            <Text style={[styles.welcomeText, { textAlign: 'center', fontSize: 32 }]}>
              Password Updated!
            </Text>
            <Text style={[styles.subtitleText, { textAlign: 'center', marginBottom: 40 }]}>
              Your account security has been restored. Use your new password to sign in.
            </Text>
            
            <TouchableOpacity 
              style={[styles.primaryButton, styles.backToLoginButton]} 
              onPress={() => router.replace('/login')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.bgContainer}>
        <Image
          source={require('@/assets/images/travel-hero.png')}
          style={styles.bgImage}
          contentFit="cover"
        />
        <View style={styles.overlay} />
      </View>
      
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => {
                if (step > 1 && step < 4) {
                  setStep(step - 1);
                } else {
                  router.back();
                }
              }} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={20} color="#E53E3E" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {renderStep()}
          </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
    marginBottom: 30,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1a1a1a',
  },
  primaryButton: {
    backgroundColor: '#003580',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#003580',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  backToEmail: {
    alignItems: 'center',
    marginTop: 20,
  },
  backToEmailText: {
    color: '#63B3ED',
    fontSize: 14,
    fontWeight: '600',
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  successContainerStep: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(72, 187, 120, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(72, 187, 120, 0.3)',
  },
  innerSuccessCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#48BB78',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#48BB78',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  backToLoginButton: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
  },
});
