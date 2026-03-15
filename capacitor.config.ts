import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.noworkteam.mobile',
  appName: 'NO WORK TEAM',
  webDir: 'client/dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
}

export default config
