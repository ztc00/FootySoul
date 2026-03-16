// i18n scaffolding for Arabic/English support
// Full implementation would use react-i18next or similar

export type Locale = 'en' | 'ar';

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

// Translation keys - to be expanded
const translations: Record<Locale, Record<string, string>> = {
  en: {
    'app.name': 'Footy Soul',
    'auth.login': 'Login',
    'auth.phone': 'Phone',
    'auth.email': 'Email',
    'game.join': 'Join Game',
    'game.full': 'Game Full',
    // Add more translations as needed
  },
  ar: {
    'app.name': 'فوتي سول',
    'auth.login': 'تسجيل الدخول',
    'auth.phone': 'هاتف',
    'auth.email': 'بريد إلكتروني',
    'game.join': 'انضم للعبة',
    'game.full': 'اللعبة ممتلئة',
    // Add more translations as needed
  },
};

export function t(key: string): string {
  return translations[currentLocale][key] || key;
}

