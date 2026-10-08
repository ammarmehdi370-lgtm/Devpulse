import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, Text, View } from "react-native";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const apiUsesLocalhost =
  /^(https?:\/\/)?(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?=[:/]|$)/i.test(
    apiUrl,
  );

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Devpulse</Text>
      <Text style={styles.tagline}>Code. Collaborate. Pulse.</Text>
      {Platform.OS !== "web" && apiUsesLocalhost && (
        <Text accessibilityRole="alert" style={styles.warning}>
          For Expo Go on a physical phone, localhost points to the phone, not
          your computer. Set EXPO_PUBLIC_API_URL in apps/mobile/.env to your
          computer&apos;s LAN IP, for example http://192.168.1.10:4000, then
          restart Expo. Android Emulator can use http://10.0.2.2:4000.
        </Text>
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0F",
  },
  logo: { color: "#e8e8f0", fontSize: 34, fontWeight: "700" },
  tagline: { color: "#06B6D4", marginTop: 12, fontSize: 16 },
  warning: {
    color: "#FCD34D",
    marginHorizontal: 24,
    marginTop: 24,
    textAlign: "center",
  },
});
