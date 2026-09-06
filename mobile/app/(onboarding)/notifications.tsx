import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useGroup, useRegisterPushToken } from '@/api/groups';
import { Button } from '@/components/Button';
import { BellBadgeIcon } from '@/components/icons';
import { Dots } from '@/components/Dots';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { useT } from '@/i18n/useT';
import { registerForPush } from '@/lib/push';
import { useIsSolo } from '@/lib/useIsSolo';
import { useSession } from '@/store/session';
import { border, spacing, useTheme } from '@/theme';

const STEPS = 3;

/**
 * Ce qu'on dit quand la permission passe mais qu'aucun token n'est obtenable.
 *
 * Pour `no-project-id`, l'app est mal configurée à la compilation : la
 * personne devant l'écran n'y peut rien, et « projectId » ne lui dirait rien.
 * On dit ce qu'elle observe — ça ne marchera pas ici — et on ne l'envoie pas
 * chercher un réglage qui n'existe pas de son côté.
 */
const UNAVAILABLE_KEYS = {
  'expo-go': 'onboarding.expoGo',
  simulator: 'onboarding.simulateur',
  'no-project-id': 'onboarding.pasDisponible',
} as const;

export default function NotificationsStep() {
  const router = useRouter();
  const t = useT();
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
        setNotice(t(UNAVAILABLE_KEYS[result.reason]));
        return;
      }

      setNotice(t('onboarding.refusees'));
    } catch {
      setNotice(t('onboarding.echecActivation'));
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
        <Card style={styles.card}>
          <View style={styles.badge}>
            <BellBadgeIcon color={colors.raised} discColor={colors.accent} />
          </View>
          <View style={[styles.rule, { backgroundColor: colors.rule }]} />
          <Text variant="dataLabel" color="inkSoft" style={styles.cardLabel}>
            {t('onboarding.alerteActive')}
          </Text>
        </Card>

        <Text variant="title" style={styles.heading}>
          {t('onboarding.prevenir')}
        </Text>
        <Text variant="dataBody" color="inkSoft" style={styles.pitch}>
          {t('onboarding.prevenirQuoi')}
        </Text>

        {notice !== null && (
          <Text variant="caption" color="out" style={styles.notice}>
            {notice}
          </Text>
        )}

        <Button
          label={t('onboarding.activer')}
          onPress={() => void enable()}
          loading={busy}
          style={styles.action}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => void finish()}
          style={styles.later}
        >
          <Text variant="dataLabel" color="accent">
            {t(
              notice === null
                ? 'onboarding.plusTard'
                : 'onboarding.continuerSimple',
            )}
          </Text>
        </Pressable>
      </View>

      <Dots
        count={STEPS}
        active={STEPS - 1}
        label={t('onboarding.etapeSur', { n: STEPS, total: STEPS })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
  card: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.group,
  },
  badge: { paddingVertical: spacing.base },
  rule: {
    height: border.hairline,
    alignSelf: 'stretch',
    marginTop: spacing.tight,
  },
  cardLabel: { marginTop: spacing.tight },
  heading: { textAlign: 'center', marginTop: spacing.card },
  pitch: { textAlign: 'center', marginTop: spacing.tight },
  notice: { textAlign: 'center', marginTop: spacing.base },
  action: { marginTop: spacing.card },
  later: { alignItems: 'center', paddingVertical: spacing.base },
});
