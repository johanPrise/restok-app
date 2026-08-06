import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRegisterPushToken } from '@/api/groups';
import { Button } from '@/components/Button';
import { BellBadgeIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { registerForPush } from '@/lib/push';
import { useSession } from '@/store/session';
import { border, spacing, useTheme } from '@/theme';

const STEPS = 3;

/** Message affiché quand la permission passe mais qu'aucun token n'est obtenable. */
const UNAVAILABLE_REASONS = {
  'expo-go':
    "Expo Go ne reçoit pas les notifications — il faudra l'app compilée.",
  simulator: 'Un simulateur ne reçoit pas de notifications.',
  'no-project-id': 'Configuration de projet incomplète.',
} as const;

export default function NotificationsStep() {
  const router = useRouter();
  const { colors } = useTheme();
  const markPrompted = useSession((s) => s.markNotificationsPrompted);
  const registerToken = useRegisterPushToken();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * On avance quoi qu'il arrive : refuser les notifications n'empêche pas de
   * se servir de l'app, et on ne redemandera pas — le drapeau est posé dans
   * tous les cas.
   */
  const finish = async () => {
    await markPrompted();
    router.replace('/shelf');
  };

  const enable = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await registerForPush();

      if (result.outcome === 'registered') {
        await registerToken.mutateAsync(result.token);
        await finish();
        return;
      }

      if (result.outcome === 'unavailable') {
        setNotice(UNAVAILABLE_REASONS[result.reason]);
        return;
      }

      setNotice(
        'Notifications refusées. Tu peux les activer plus tard dans les réglages du téléphone.',
      );
    } catch {
      setNotice("L'activation a échoué. Tu pourras réessayer plus tard.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.body}>
        <TagCard style={styles.card}>
          <View style={styles.badge}>
            <BellBadgeIcon
              color={colors.paperRaised}
              discColor={colors.pantryTeal}
            />
          </View>
          <View style={[styles.rule, { backgroundColor: colors.thread }]} />
          <Text variant="monoLabel" color="inkSoft" style={styles.cardLabel}>
            Alert_system_active
          </Text>
        </TagCard>

        <Text variant="title" style={styles.heading}>
          Prévenir le groupe
        </Text>
        <Text variant="monoBody" color="inkSoft" style={styles.pitch}>
          Pour prévenir tout le monde quand un stock est vide.
        </Text>

        {notice !== null && (
          <Text variant="caption" color="rustClay" style={styles.notice}>
            {notice}
          </Text>
        )}

        <Button
          label="Activer les notifications →"
          onPress={() => void enable()}
          loading={busy}
          style={styles.action}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => void finish()}
          style={styles.later}
        >
          <Text variant="monoLabel" color="pantryTeal">
            {notice === null ? 'Plus tard' : 'Continuer'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: STEPS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === STEPS - 1 && styles.dotActive,
              {
                backgroundColor:
                  index === STEPS - 1 ? colors.pantryTeal : colors.thread,
              },
            ]}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
  card: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
  badge: { paddingVertical: spacing.sm },
  rule: {
    height: border.hairline,
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  cardLabel: { marginTop: spacing.sm },
  heading: { textAlign: 'center', marginTop: spacing.lg },
  pitch: { textAlign: 'center', marginTop: spacing.xs },
  notice: { textAlign: 'center', marginTop: spacing.md },
  action: { marginTop: spacing.lg },
  later: { alignItems: 'center', paddingVertical: spacing.md },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 20 },
});
