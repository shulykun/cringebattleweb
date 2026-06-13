import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.boiskrinzhem.twa',
  appName: 'Бой с кринжем',
  webDir: 'build',
  android: {
    backgroundColor: '#0f0c29',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
