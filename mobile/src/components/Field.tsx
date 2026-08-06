import {
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

export function Field({ label, error, style, ...props }: Readonly<FieldProps>) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <Text variant="monoLabel" color="inkSoft">
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.inkSoft}
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: colors.paperRaised,
            borderColor: error ? colors.rustClay : colors.thread,
            color: colors.ink,
          },
          style,
        ]}
      />
      {error !== undefined && (
        <Text variant="caption" color="rustClay">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
});
