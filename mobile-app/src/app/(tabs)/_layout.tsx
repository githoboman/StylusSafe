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
          tabBarLabel: 'Vault',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="session-keys"
        options={{
          tabBarLabel: 'Firewall',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-half-outline" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="intents"
        options={{
          tabBarLabel: 'Intents',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          tabBarLabel: 'Security',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="finger-print-outline" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="dca"
        options={{ href: null }}
      />
    </Tabs>
  );
}
