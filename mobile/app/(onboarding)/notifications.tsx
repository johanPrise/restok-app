import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useGroup, useRegisterPushToken } from '@/api/groups';
import { Button } from '@/components/Button';
import { BellBadgeIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { registerForPush } from '@/lib/push';
import { useIsSolo } from '@/lib/useIsSolo';
import { useSession } from '@/store/session';
import { border, spacing, useTheme } from '@/theme';

const STEPS = 3;

/** Message affiché quand la permission passe mais qu'aucun token n'est obtenable. */
const UNAVAILABLE_REASONS = {
  'expo-go':
    "Expo Go ne reçoit pas les notifications — il faudra l'app compilée.",
  simulator: 'Un simulateur ne reçoit pas de notifications.',
  // Une app mal configurée à la compilation : la personne devant l'écran n'y
  // peut rien, et « projectId » ne lui dirait rien. On dit ce qu'elle observe
  // — ça ne marchera pas ici — et on ne l'envoie pas chercher un réglage qui
  // n'existe pas de son côté.
  'no-project-id':
    'Les notifications ne sont pas disponibles dans cette version de l’app.',
} as const;

export default function NotificationsStep() {
  const router = useRouter();
  const group = useGroup();
  const solo = useIsSolo();
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

  // Tant que le type du groupe n'est pas connu, cet écran ne décide rien :
  // `useIsSolo` répond « non » pendant le chargement, et afficher « Prévenir le
  // groupe » à quelqu'un qui vit seul, même une frame, c'est lui poser une
  // question qu'on va retirer sous ses yeux.
  if (group.isPending) return null;

  // Seul, le listener notifie le groupe **en excluant celui qui a agi** : la
  // cible est toujours vide, aucune notification ne partira jamais.
  //
  // Rien n'est marqué au passage. C'est ce qui sépare cette version de la
  // précédente : le drapeau était posé à la création du groupe, donc une fois
  // pour toutes, et le jour où quelqu'un rejoignait avec le code d'invitation
  // la question ne revenait jamais. Ici la condition se relit à chaque fois,
  // sur le type que le serveur fait autorité — dès que le groupe cesse d'être
  // solo, l'étape reprend sa place.
  if (solo) return <Redirect href="/shelf" />;

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
