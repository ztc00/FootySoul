import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { StripeProvider } from '@stripe/stripe-react-native';
import { initializeStripe } from '@/lib/stripe';
import { setupDeepLinking } from '@/lib/linking';
import { registerForPushNotifications } from '@/lib/notifications';
import Constants from 'expo-constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    const stripeKey = Constants.expoConfig?.extra?.stripePublishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (stripeKey) {
      initializeStripe(stripeKey).catch(() => {});
    }
    setupDeepLinking();
    registerForPushNotifications().catch(() => {});
  }, []);

  const stripeKey = Constants.expoConfig?.extra?.stripePublishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StripeProvider publishableKey={stripeKey} merchantIdentifier="merchant.com.footysoul.app">
          <AuthProvider>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerTintColor: '#000',
                headerTitleAlign: 'left',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 24 },
                headerBackTitleVisible: true,
              }}
            >
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
              <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="venue-games" options={{ title: 'Games at venue' }} />
              <Stack.Screen name="replays" options={{ title: 'My Replays' }} />
              <Stack.Screen name="stats" options={{ title: 'My Stats' }} />
              <Stack.Screen name="create-game" options={{ title: 'Create Game' }} />
              <Stack.Screen name="organizer-dashboard" options={{ title: 'Dashboard' }} />
              <Stack.Screen name="organizer-stats" options={{ title: 'Organizer Stats' }} />
              <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
            </Stack>
          </AuthProvider>
        </StripeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

