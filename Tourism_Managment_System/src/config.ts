import { Platform } from 'react-native';
import Constants from 'expo-constants';

const defaultBase = 'http://localhost:5000';
const androidEmulatorBase = 'http://10.0.2.2:5000';

const extraApiBase =
  Constants.manifest?.extra?.API_BASE ||
  Constants.expoConfig?.extra?.API_BASE;

const hostUri =
  Constants.expoConfig?.hostUri ||
  Constants.manifest?.debuggerHost ||
  Constants.manifest2?.extra?.expoClient?.hostUri;

const host = hostUri?.split(':')[0];
const lanBase = host ? `http://${host}:5000` : undefined;

const emulatorBase =
  Platform.OS === 'android' && !Constants.isDevice ? androidEmulatorBase : undefined;

export const API_BASE = extraApiBase || emulatorBase || lanBase || defaultBase;