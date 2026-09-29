import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  useEffect(() => {
    // Hide the splash screen once the root layout mounts
    SplashScreen.hideAsync();
  }, []);

  return <AppTabs />;
}

