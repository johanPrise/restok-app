import { Pressable, StyleSheet, View } from 'react-native';
import { initial, lineQuantity } from '@/lib/shopping-list';
import { border, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import type { ShoppingLine } from '@/types/api';
import { CheckIcon } from './icons';
import { TagCard } from './TagCard';
import { Text } from './Text';

interface ShoppingRowProps {
  line: ShoppingLine;
  onToggle: () => void;
  onRemove: () => void;
}

/**
 * Une ligne de la liste : un tag, comme sur l'étagère.
 *
 * Cochée, elle ne change ni de fond ni de place — elle se barre et s'estompe.
 * C'est ce qui permet de relire le chariot d'un coup d'œil sans perdre le fil
 * de ce qu'on vient de prendre.
 *
 * Toute la carte est la cible tactile : au magasin, une main tient le panier,
 * et viser une case de 24px avec le pouce de l'autre ne marche pas.
 *
 * Retirer se fait par appui long. La maquette ne dessine aucun bouton de
 * suppression, et en ajouter un mettrait un geste destructeur à un pouce du
 * geste qu'on répète le plus.
 */
export function ShoppingRow({
  line,
  onToggle,
  onRemove,
}: Readonly<ShoppingRowProps>) {
  const { colors } = useTheme();
  const quantity = lineQuantity(line);
  const who = line.checked && line.checkedBy ? line.checkedBy : null;

  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={line.checked}
      accessibilityState={{ checked: line.checked }}
      accessibilityLabel={[line.name, quantity].filter(Boolean).join(', ')}
      accessibilityHint={
        line.checked ? 'Décocher' : 'Cocher — appui long pour retirer'
      }
      accessibilityActions={[{ name: 'longpress', label: 'Retirer' }]}
      onAccessibilityAction={onRemove}
      onPress={onToggle}
      onLongPress={onRemove}
    >
      <TagCard style={styles.card}>
        <View style={styles.text}>
          <Text
            variant="tagName"
            color={line.checked ? 'inkSoft' : 'ink'}
            style={line.checked && styles.struck}
          >
            {line.name}
          </Text>
          {quantity && (
            <Text
              variant="monoLabel"
              color="inkSoft"
              style={line.checked && styles.struck}
            >
              {quantity}
            </Text>
          )}
        </View>

        <View style={styles.marks}>
          {/* La pastille dit *qui* a coché : dans une colocation, c'est
              l'information qui évite d'acheter la chose en double. */}
          {who && (
            <View style={[styles.avatar, { backgroundColor: colors.inkSoft }]}>
              <Text variant="mono" color="paperRaised">
                {initial(who)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.box,
              {
                backgroundColor: line.checked
                  ? colors.pantryTeal
                  : 'transparent',
                borderColor: line.checked ? colors.pantryTeal : colors.thread,
              },
            ]}
          >
            {line.checked && <CheckIcon color={colors.paperRaised} />}
          </View>
        </View>
      </TagCard>
    </Pressable>
  );
}

const AVATAR_SIZE = 28;
const BOX_SIZE = 24;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  text: { flex: 1, gap: 2 },
  // Le barré est un style d'état, pas une nouvelle voix typographique : il
  // n'a donc rien à faire dans un variant de `Text`.
  struck: { textDecorationLine: 'line-through' },
  marks: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: radius.checkbox,
    borderWidth: border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
