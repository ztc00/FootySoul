import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerForPushNotifications() {
  if (!supabase) return;
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }
  
  token = (await Notifications.getExpoPushTokenAsync()).data;

  // Save token to Supabase only when a valid session exists.
  // This avoids noisy "Invalid Refresh Token" errors on cold starts with stale auth state.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !token) return token;

    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('user_id', session.user.id);
  } catch (error: any) {
    const message = error?.message || '';
    if (!message.includes('Invalid Refresh Token')) {
      console.warn('Push token save failed:', message || error);
    }
    // Ignore stale session errors; auth provider handles cleanup separately.
  }

  return token;
}

export async function sendGameReminder(gameId: string, gameTitle: string, startTime: Date) {
  // This would typically be called from a backend/cron job
  // For MVP, we can trigger this from the organizer dashboard
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Game Reminder',
      body: `${gameTitle} starts in 1 hour!`,
      data: { gameId },
    },
    trigger: {
      date: new Date(startTime.getTime() - 60 * 60 * 1000), // 1 hour before
    },
  });
}

