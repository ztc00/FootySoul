const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

export default {
  expo: {
    name: 'Footy Soul',
    slug: 'footysoul',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1a1a1a',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.footysoul.app',
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'We need your location to find nearby football games.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'We need your location to find nearby football games.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1a1a1a',
      },
      package: 'com.footysoul.app',
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      bundler: 'metro',
    },
    plugins: [
      ['expo-notifications', { color: '#ffffff' }],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Footy Soul to use your location to find nearby games.',
        },
      ],
      '@react-native-community/datetimepicker',
      [
        '@stripe/stripe-react-native',
        { merchantIdentifier: 'merchant.com.footysoul.app' },
      ],
      'expo-router',
      'expo-web-browser',
    ],
    scheme: 'footysoul',
    extra: {
      eas: {
        projectId: 'your-project-id',
      },
      googleWebClientId: GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      googleAndroidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    },
  },
};
