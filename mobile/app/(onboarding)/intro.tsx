import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { SystemFooter } from '@/components/SystemFooter';
import { Text } from '@/components/Text';
import { useT } from '@/i18n/useT';
import { border, radius, spacing, useTheme } from '@/theme';

const STEPS = 3;

export default function Intro() {
  const router = useRouter();
  const t = useT();
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">{t('onboarding.promesse')}</Text>
        <View style={styles.rule}>
          <Text variant="monoLabel" color="inkSoft">
            {t('onboarding.ordre', { n: '001' })}
          </Text>
          <View style={[styles.line, { backgroundColor: colors.thread }]} />
        </View>
      </View>

      <View style={styles.illustrationSlot}>
        <Image
          source={require('../../assets/illustrations/etagere.png')}
          style={styles.illustration}
          contentFit="contain"
          accessibilityLabel={t('onboarding.etagereAlt')}
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
                backgroundColor:
                  index === 0 ? colors.pantryTeal : colors.thread,
              },
            ]}
          />
        ))}
      </View>

      <Button label={t('onboarding.continuer')} onPress={() => router.push('/choose')} />
      <SystemFooter left={t('onboarding.pied')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xl, gap: spacing.md },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: border.hairline },
  illustrationSlot: { flex: 1, justifyContent: 'center' },
  // Ratio de l'illustration (320×175). Son fond clair est cuit dans l'image et
  // c'est voulu : la maquette sombre garde ce panneau clair sur fond noir, le
  // dessin s'y lit comme une planche imprimée.
  illustration: { width: '100%', aspectRatio: 320 / 175 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  dot: { width: 6, height: 6, borderRadius: radius.full },
  dotActive: { width: 20 },
});
