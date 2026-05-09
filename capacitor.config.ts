import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.thepit.app',
  appName: 'The Pit',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#03040c',
    scrollEnabled: false,
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#03040c',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#03040c',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#e63946',
    },
  },
}

export default config
