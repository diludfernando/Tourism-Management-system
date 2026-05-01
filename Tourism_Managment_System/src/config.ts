import { Platform } from 'react-native';
import Constants from 'expo-constants';

const defaultBase = 'http://192.168.8.192:5000';
const androidEmulatorBase = 'http://10.0.2.2:5000';

const extraApiBase =
  Constants.manifest?.extra?.API_BASE ||
  Constants.expoConfig?.extra?.API_BASE;

const emulatorBase =
  Platform.OS === 'android' && !Constants.isDevice ? androidEmulatorBase : undefined;

export const API_BASE = extraApiBase || emulatorBase || defaultBase;