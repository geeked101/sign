import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Root layout component for the application.
 * Provides theme and navigation context.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AccessibilityProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Settings' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AccessibilityProvider>
  );
}
