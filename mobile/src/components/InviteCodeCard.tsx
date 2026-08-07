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
      message: `Rejoins « ${groupName} » sur Restock avec le code ${formatInviteCode(code)}.`,
    });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.paperRaised, borderColor: colors.thread },
      ]}
    >
      <View
        style={[
          styles.perforation,
          { backgroundColor: colors.paper, borderColor: colors.thread },
        ]}
      />

      <Text variant="monoLabel" color="inkSoft" style={styles.label}>
        Code d&apos;invitation
      </Text>

      <View style={styles.codeRow}>
        <Text
          style={[styles.code, { color: colors.ink }]}
          // Le code doit rester lisible caractère par caractère : une mise à
          // l'échelle système le casserait en deux lignes.
          allowFontScaling={false}
          accessibilityLabel={`Code d'invitation ${code.split('').join(' ')}`}
        >
          {formatInviteCode(code)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copier le code"
          onPress={() => void copy()}
          hitSlop={spacing.xs}
          style={styles.copy}
        >
          <Text variant="monoLabel" color={copied ? 'sage' : 'pantryTeal'}>
            {copied ? 'Copié' : 'Copier'}
          </Text>
        </Pressable>
      </View>

      <Button label="Partager" onPress={() => void share()} />
    </View>
  );
}

const PERFORATION = 12;

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderWidth: border.hairline,
    borderRadius: radius.tag,
    borderBottomRightRadius: radius.tagFoldedCorner,
    gap: spacing.md,
  },
  perforation: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
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
    gap: spacing.sm,
  },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.display,
    lineHeight: fontSize.display * 1.1,
    letterSpacing: 2,
  },
  copy: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
});
