import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder screen for initial app setup.
 * Will be replaced by RootNavigator after Phase 2 implementation.
 */
export default function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kollector Mobile</Text>
      <Text style={styles.subtitle}>Thiết lập đã hoàn tất. Đang chờ triển khai điều hướng...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
