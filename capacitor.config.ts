import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.rubrica.app',
  appName: 'Rubrica',
  webDir: 'public',
  server: {
    url: 'https://rubrica.in?app=true',
  },
};

export default config;
