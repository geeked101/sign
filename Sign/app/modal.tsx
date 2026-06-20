import { Link } from 'expo-router';
import { StyleSheet, View, Switch, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export default function ModalScreen() {
  const { settings, updateSettings } = useAccessibility();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ marginBottom: 20 }}>Accessibility Settings</ThemedText>
      
      <View style={styles.settingRow}>
        <ThemedText>High Contrast Mode</ThemedText>
        <Switch 
          value={settings.highContrast} 
          onValueChange={(val) => updateSettings({ highContrast: val })} 
          trackColor={{ false: '#767577', true: '#00f5a0' }}
          thumbColor={settings.highContrast ? '#111' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <ThemedText>Reduce Motion</ThemedText>
        <Switch 
          value={settings.motionReduced} 
          onValueChange={(val) => updateSettings({ motionReduced: val })} 
          trackColor={{ false: '#767577', true: '#00f5a0' }}
          thumbColor={settings.motionReduced ? '#111' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <ThemedText>Font Size</ThemedText>
        <View style={styles.fontOptions}>
          {['small', 'medium', 'large'].map((size) => (
            <Text 
              key={size}
              style={[
                styles.fontOption, 
                settings.fontSize === size && styles.fontOptionActive
              ]}
              onPress={() => updateSettings({ fontSize: size as any })}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </Text>
          ))}
        </View>
      </View>

      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Done</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fontOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  fontOption: {
    color: '#888',
    padding: 5,
  },
  fontOptionActive: {
    color: '#00f5a0',
    fontWeight: 'bold',
  },
  link: {
    marginTop: 30,
    paddingVertical: 15,
    alignSelf: 'center',
  },
});
