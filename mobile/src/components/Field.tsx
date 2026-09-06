import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import {
  border,
  fontFamily,
  fontSize,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  useTheme,
} from '@/theme';
import { Text } from './Text';
import { useT } from '@/i18n/useT';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Field({
  label,
  error,
  style,
  secureTextEntry,
  ...props
}: Readonly<FieldProps>) {
  const { colors } = useTheme();
  const t = useT();
  const [revealed, setRevealed] = useState(false);

  // On ne saisit pas un mot de passe à l'aveugle sur un clavier tactile :
  // sans relecture possible, la seule façon de corriger une faute est de tout
  // effacer et de recommencer.
  const canReveal = secureTextEntry === true;

  return (
    <View style={styles.group}>
      <Text variant="dataLabel" color="inkSoft">
        {label}
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.inkSoft}
          secureTextEntry={canReveal && !revealed}
          {...props}
          style={[
            styles.input,
            canReveal && styles.inputWithAction,
            {
              backgroundColor: colors.raised,
              borderColor: error ? colors.out : colors.rule,
              color: colors.ink,
            },
            style,
          ]}
        />

        {canReveal && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              revealed
                ? t('commun.masquerMotDePasse')
                : t('commun.afficherMotDePasse')
            }
            onPress={() => setRevealed((shown) => !shown)}
            style={styles.action}
          >
            <Text variant="dataLabel" color="accent">
              {revealed ? t('commun.masquer') : t('commun.afficher')}
            </Text>
          </Pressable>
        )}
      </View>

      {error !== undefined && (
        <Text variant="caption" color="out">
          {error}
        </Text>
      )}
    </View>
  );
}

const ACTION_WIDTH = 88;

const styles = StyleSheet.create({
  group: { gap: spacing.tight },
  inputRow: { justifyContent: 'center' },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.base,
    borderWidth: border.hairline,
    borderRadius: radius.base,
    fontFamily: fontFamily.text,
    fontSize: fontSize.md,
  },
  // Réserve la place du bouton pour que le texte saisi ne passe pas dessous.
  inputWithAction: { paddingRight: ACTION_WIDTH },
  action: {
    position: 'absolute',
    right: 0,
    width: ACTION_WIDTH,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
