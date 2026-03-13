import * as Linking from 'expo-linking';
import { router } from 'expo-router';

export function setupDeepLinking() {
  const linking = {
    prefixes: ['footysoul://', 'https://footysoul.app'],
    config: {
      screens: {
        '(tabs)': {
          screens: {
            home: 'home',
            'my-games': 'my-games',
            settings: 'settings',
          },
        },
        'game/[id]': 'game/:id',
        'create-game': 'create-game',
        'organizer-dashboard': 'organizer-dashboard',
      },
    },
  };

  // Handle initial URL
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle deep links while app is running
  Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url);
  });
}

function handleDeepLink(url: string) {
  // Parse URL: footysoul://game/{id}?code={code}
  const parsed = Linking.parse(url);
  
  if (parsed.path === 'game' && parsed.queryParams?.id) {
    const gameId = parsed.queryParams.id as string;
    router.push(`/game/${gameId}`);
  }
}

