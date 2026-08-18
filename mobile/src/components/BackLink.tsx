import { Pressable, StyleSheet } from 'react-native';
import { MIN_TOUCH_TARGET, spacing } from '@/theme';
import { Text } from './Text';

interface BackLinkProps {
  onPress: () => void;
  label?: string;
}

export function BackLink({
  onPress,
  label = 'Retour',
}: Readonly<BackLinkProps>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      // La flèche seule fait moins de 44pt : la zone tactile est élargie
      // autour, pas le glyphe.
      hitSlop={spacing.sm}
      style={styles.pressable}
    >
      <Text variant="title" color="pantryTeal">
        ←
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
});
