import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.deliveryapp',
  appName: 'Delivery App',
  server: {
    url: 'https://your-app.vercel.app'
  }
};

export default config;