import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { colors } from '@/theme/tokens';

const icons = {
  chat: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  wardrobe: ['shirt', 'shirt-outline'],
  timeline: ['time', 'time-outline'],
} as const;

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="chat"
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.moss,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 88, paddingBottom: 24, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, focused, size }) => {
          const pair = icons[route.name as keyof typeof icons];
          return <Ionicons color={color} name={pair?.[focused ? 0 : 1] ?? 'ellipse-outline'} size={size} />;
        },
      })}>
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
    </Tabs>
  );
}
