import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { SystemFooter } from '@/components/SystemFooter';
import { Text } from '@/components/Text';
import { border, radius, spacing, useTheme } from '@/theme';

const STEPS = 3;

export default function Intro() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">
          Le dernier rouleau ne sera plus jamais une surprise.
        </Text>
        <View style={styles.rule}>
          <Text variant="monoLabel" color="inkSoft">
            Ordre 001
          </Text>
          <View style={[styles.line, { backgroundColor: colors.thread }]} />
        </View>
      </View>

      <View style={styles.illustrationSlot}>
        <View
          style={[
            styles.illustration,
            {
              backgroundColor: colors.paperRaised,
              borderColor: colors.thread,
            },
          ]}
        />
      </View>

      <View style={styles.dots}>
        {Array.from({ length: STEPS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === 0 && styles.dotActive,
              {
                backgroundColor: index === 0 ? colors.pantryTeal : colors.thread,
              },
            ]}
          />
        ))}
      </View>

      <Button label="Continuer →" onPress={() => router.push('/choose')} />
      <SystemFooter left="Système d'inventaire partagé v2.4" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xl, gap: spacing.md },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: border.hairline },
  illustrationSlot: { flex: 1, justifyContent: 'center' },
  // Emplacement de l'illustration d'étagère. L'asset n'est pas encore exporté
  // du Figma : le cadre tient la mise en page en attendant.
  illustration: {
    aspectRatio: 16 / 10,
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  dot: { width: 6, height: 6, borderRadius: radius.full },
  dotActive: { width: 20 },
});
