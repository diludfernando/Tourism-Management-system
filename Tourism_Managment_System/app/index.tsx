import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Hero Section */}
      <View style={styles.heroContainer}>
        <Image
          source={require('@/assets/images/travel-hero.png')}
          style={styles.heroImage}
          contentFit="cover"
          transition={1000}
        />
        <View style={styles.overlay} />
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.brandText}>Luxe Travel</Text>
          <Text style={styles.subtitleText}>
            Embark on a journey to the world's most breathtaking destinations.
          </Text>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            activeOpacity={0.8}
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.primaryButtonText}>Start Exploring</Text>
          </TouchableOpacity>

        

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In / Register</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.adminButton}
            onPress={() => router.push('/admin')}
          >
            <Text style={styles.adminButtonText}>Admin Panel (Temp)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer / Info */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>Tourism Management System v1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  heroContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Darker overlay for better text readability
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  welcomeText: {
    color: '#E0E0E0',
    fontSize: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontWeight: '300',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitleText: {
    color: '#B0B0B0',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: '85%',
  },
  ctaContainer: {
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#003580', // Premium deep blue
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  secondaryButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  adminButton: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  adminButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '400',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
});
