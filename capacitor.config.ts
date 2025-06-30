import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.resdigaza.mobile',
  appName: 'RestoranDigital',
  webDir: 'www',
  server: {
    cleartext: true,
    allowNavigation: [
      'https://resdigaza.my.id',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ]
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;