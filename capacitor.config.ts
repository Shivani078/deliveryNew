import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.deliveryapp',
  appName: 'Delivery App',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
  },
};

export default config;
