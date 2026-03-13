const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default {
  expo: {
    name: 'FootySoul',
    slug: 'footysoul',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    splash: {
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
            'Allow FootySoul to use your location to find nearby games.',
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
    },
  },
};
