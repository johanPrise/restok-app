import { StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '@/api/config';

/** Placeholder de l'étape 5.1 — remplacé par The Shelf à l'étape 5.5. */
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESTOCK</Text>
      <Text style={styles.meta}>API : {API_BASE_URL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F2F4F0',
  },
  title: { fontSize: 32, fontWeight: '900', color: '#1C2620', letterSpacing: 2 },
  meta: { fontSize: 13, color: '#5A6B62' },
});
