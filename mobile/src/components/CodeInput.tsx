import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  border,
  fontFamily,
  fontSize,
  radius,
  spacing,
  useTheme,
} from '@/theme';
import { Text } from './Text';

export const INVITE_CODE_LENGTH = 8;
const GROUP_SIZE = INVITE_CODE_LENGTH / 2;

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * Saisie du code d'invitation en cases séparées, groupées 4–4 (§2 : le code
 * est un objet typographique, pas un champ de formulaire).
 *
 * Le tiret est un séparateur dessiné : il ne fait pas partie de la valeur, que
 * le backend attend à exactement 8 caractères.
 *
 * Un seul vrai champ, invisible, reçoit la frappe — 8 champs qui se passent le
 * focus gèrent mal le collage et la correction. Les cases ne font qu'afficher.
 */
export function CodeInput({
  value,
  onChange,
  autoFocus = false,
}: Readonly<CodeInputProps>) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const characters = value.padEnd(INVITE_CODE_LENGTH).split('');
  const focusedIndex = Math.min(value.length, INVITE_CODE_LENGTH - 1);

  const handleChange = (raw: string) => {
    // Le code est alphanumérique, pas seulement des chiffres : on retire les
    // séparateurs collés depuis une conversation et on met en capitales.
    const cleaned = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, INVITE_CODE_LENGTH);

    onChange(cleaned);
  };

  return (
    <Pressable
      accessibilityRole="none"
      onPress={() => inputRef.current?.focus()}
      style={styles.row}
    >
      {characters.map((character, index) => (
        <View
          key={index}
          style={[
            index === GROUP_SIZE && styles.afterSeparator,
            styles.cellWrapper,
          ]}
        >
          {index === GROUP_SIZE && (
            <Text variant="data" color="inkSoft" style={styles.separator}>
              –
            </Text>
          )}
          <View
            style={[
              styles.cell,
              {
                backgroundColor: colors.raised,
                borderColor:
                  index === focusedIndex ? colors.accent : colors.rule,
              },
            ]}
          >
            <Text variant="data" style={styles.character}>
              {character.trim()}
            </Text>
          </View>
        </View>
      ))}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={INVITE_CODE_LENGTH}
        // `default` et non `ascii-capable` : sur Android le clavier doit
        // proposer lettres et chiffres.
        keyboardType="default"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const CELL_WIDTH = 32;
const CELL_HEIGHT = 44;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cellWrapper: { flexDirection: 'row', alignItems: 'center' },
  afterSeparator: {},
  separator: { paddingHorizontal: spacing.tight },
  cell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    marginRight: spacing.hair,
    borderWidth: border.hairline,
    borderRadius: radius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  character: {
    fontFamily: fontFamily.data,
    fontSize: fontSize.lg,
  },
  // Invisible mais présent : c'est lui qui reçoit réellement la frappe.
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
});
