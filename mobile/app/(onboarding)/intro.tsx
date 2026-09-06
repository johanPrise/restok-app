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
          <Text variant="dataLabel" color="inkSoft">
            {t('onboarding.ordre', { n: '001' })}
          </Text>
          <View style={[styles.line, { backgroundColor: colors.rule }]} />
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
                backgroundColor: index === 0 ? colors.accent : colors.rule,
              },
            ]}
          />
        ))}
      </View>

      <Button
        label={t('onboarding.continuer')}
        onPress={() => router.push('/choose')}
      />
      <SystemFooter left={t('onboarding.pied')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.group, gap: spacing.base },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.tight },
  line: { flex: 1, height: border.hairline },
  illustrationSlot: { flex: 1, justifyContent: 'center' },
  // Ratio de l'illustration (320×175). Son fond clair est cuit dans l'image et
  // c'est voulu : la maquette sombre garde ce panneau clair sur fond noir, le
  // dessin s'y lit comme une planche imprimée.
  illustration: { width: '100%', aspectRatio: 320 / 175 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.tight,
    paddingVertical: spacing.base,
  },
  dot: {
    width: spacing.tight,
    height: spacing.tight,
    borderRadius: radius.full,
  },
  dotActive: { width: spacing.card },
});
