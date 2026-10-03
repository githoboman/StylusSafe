import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surfaceZinc,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 72,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="portfolio"
        options={{ 
          tabBarLabel: 'Portfolio', 
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size || 24} color={color} /> 
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{ 
          tabBarLabel: 'Transfer', 
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal-outline" size={size || 24} color={color} /> 
        }}
      />
      <Tabs.Screen
        name="security"
        options={{ 
          tabBarLabel: 'Security', 
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size || 24} color={color} /> 
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{ 
          tabBarLabel: 'Activity', 
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size || 24} color={color} /> 
        }}
      />
      <Tabs.Screen
        name="session-keys"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="dca"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="intents"
        options={{ href: null }}
      />
    </Tabs>
  );
}

