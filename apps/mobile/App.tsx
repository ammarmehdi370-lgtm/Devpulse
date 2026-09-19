import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return <View style={styles.container}><Text style={styles.logo}>devpulse</Text><Text style={styles.tagline}>Code. Collaborate. Pulse.</Text><StatusBar style="light" /></View>;
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0F' }, logo: { color: '#e8e8f0', fontSize: 34, fontWeight: '700' }, tagline: { color: '#06B6D4', marginTop: 12, fontSize: 16 } });
