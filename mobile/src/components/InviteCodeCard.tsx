import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import {
  border,
  fontFamily,
  fontSize,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  useTheme,
} from '@/theme';
import { Button } from './Button';
import { Text } from './Text';
import { useT } from '@/i18n/useT';

interface InviteCodeCardProps {
  code: string;
  groupName: string;
}

/** Le §2 veut le code lu par blocs : `KJ3M-8T2F`, pas huit lettres d'affilée. */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

const COPIED_FEEDBACK_MS = 1800;

/**
 * Le code d'invitation traité comme un objet typographique (§2) : gros, en
 * mono, groupé par blocs, avec la copie intégrée. C'est un moment de
 * l'interface, pas un champ de formulaire.
 *
 * La maquette lui donne la perforation d'un Stock Tag — le code est lui aussi
 * une étiquette qu'on décroche pour la tendre à quelqu'un.
 */
export function InviteCodeCard({
  code,
  groupName,
}: Readonly<InviteCodeCardProps>) {
  const { colors } = useTheme();
  const t = useT();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
  };

  const share = () =>
    Share.share({
      message: t('commun.invitation', {
        groupe: groupName,
        code: formatInviteCode(code),
      }),
    });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.raised, borderColor: colors.rule },
      ]}
    >
      <View
        style={[
          styles.perforation,
          { backgroundColor: colors.paper, borderColor: colors.rule },
        ]}
      />

      <Text variant="dataLabel" color="inkSoft" style={styles.label}>
        {t('onboarding.codeInviteLabel')}
      </Text>

      <View style={styles.codeRow}>
        <Text
          style={[styles.code, { color: colors.ink }]}
          // Le code doit rester lisible caractère par caractère : une mise à
          // l'échelle système le casserait en deux lignes.
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={`Code d'invitation ${code.split('').join(' ')}`}
        >
          {formatInviteCode(code)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('commun.copierLeCode')}
          onPress={() => void copy()}
          hitSlop={spacing.tight}
          style={styles.copy}
        >
          <Text variant="dataLabel" color={copied ? 'ok' : 'accent'}>
            {copied ? t('commun.copie') : t('commun.copier')}
          </Text>
        </Pressable>
      </View>

      <Button label={t('commun.partager')} onPress={() => void share()} />
    </View>
  );
}

const PERFORATION = 12;

const styles = StyleSheet.create({
  card: {
    padding: spacing.card,
    paddingTop: spacing.group,
    borderWidth: border.hairline,
    borderRadius: radius.base,
    borderBottomRightRadius: radius.base,
    gap: spacing.base,
  },
  perforation: {
    position: 'absolute',
    top: spacing.tight,
    left: spacing.tight,
    width: PERFORATION,
    height: PERFORATION,
    borderRadius: radius.full,
    borderWidth: border.hairline,
  },
  label: { textAlign: 'center' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.tight,
  },
  code: {
    fontFamily: fontFamily.data,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * 1.1,
    letterSpacing: 2,
  },
  copy: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
});
