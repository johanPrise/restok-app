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
  const [revealed, setRevealed] = useState(false);

  // On ne saisit pas un mot de passe à l'aveugle sur un clavier tactile :
  // sans relecture possible, la seule façon de corriger une faute est de tout
  // effacer et de recommencer.
  const canReveal = secureTextEntry === true;

  return (
    <View style={styles.group}>
      <Text variant="monoLabel" color="inkSoft">
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
              backgroundColor: colors.paperRaised,
              borderColor: error ? colors.rustClay : colors.thread,
              color: colors.ink,
            },
            style,
          ]}
        />

        {canReveal && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
            }
            onPress={() => setRevealed((shown) => !shown)}
            style={styles.action}
          >
            <Text variant="monoLabel" color="pantryTeal">
              {revealed ? 'Masquer' : 'Afficher'}
            </Text>
          </Pressable>
        )}
      </View>

      {error !== undefined && (
        <Text variant="caption" color="rustClay">
          {error}
        </Text>
      )}
    </View>
  );
}

const ACTION_WIDTH = 88;

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  inputRow: { justifyContent: 'center' },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
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
