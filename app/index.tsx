import { Redirect } from 'expo-router';

export default function Index() {
  // Immediately bounce into the main tabs stack; auth-aware screens inside
  // will handle redirecting to login if needed.
  return <Redirect href="/(tabs)/home" />;
}

