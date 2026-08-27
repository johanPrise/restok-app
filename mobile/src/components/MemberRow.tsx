import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '@/i18n/useT';
import { border, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import type { MemberSummary } from '@/types/api';
import { Text } from './Text';

interface MemberRowProps {
  member: MemberSummary;
  /** Marque la ligne de l'utilisateur courant — on ne s'administre pas soi-même. */
  isSelf: boolean;
  /** Vrai en mode gestion, quand un admin arrange son groupe. */
  managing: boolean;
  onToggleRole: () => void;
  onRemove: () => void;
}

/** Première lettre du prénom — le §5 refuse les photos de profil au MVP. */
export function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

export function MemberRow({
  member,
  isSelf,
  managing,
  onToggleRole,
  onRemove,
}: Readonly<MemberRowProps>) {
  const { colors, isDark } = useTheme();
  const t = useT();
  const isAdmin = member.role === 'admin';

  return (
    <View style={styles.row}>
      <View style={styles.identity}>
        {/* Pastille sage (§5). La lettre reste sombre dans les deux thèmes :
            `sage` s'éclaircit en mode sombre, une encre claire y disparaîtrait. */}
        <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
          <Text
            variant="tagName"
            style={{ color: isDark ? colors.paper : colors.ink }}
            allowFontScaling={false}
          >
            {initial(member.name)}
          </Text>
        </View>

        <View style={styles.names}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {member.name}
            {isSelf ? t('commun.toi') : ''}
          </Text>
          <Text variant="mono" color="inkSoft" numberOfLines={1}>
            {member.email}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            { borderColor: isAdmin ? colors.pantryTeal : colors.thread },
          ]}
        >
          <Text variant="monoLabel" color={isAdmin ? 'pantryTeal' : 'inkSoft'}>
            {t(isAdmin ? 'commun.admin' : 'commun.membre')}
          </Text>
        </View>
      </View>

      {managing && !isSelf && (
        <View style={styles.actions}>
          <Action
            label={t(isAdmin ? 'commun.retrograder' : 'commun.nommerAdmin')}
            color="pantryTeal"
            onPress={onToggleRole}
          />
          <Action
            label={t('commun.retirer')}
            color="rustClay"
            onPress={onRemove}
          />
        </View>
      )}
    </View>
  );
}

function Action({
  label,
  color,
  onPress,
}: Readonly<{
  label: string;
  color: 'pantryTeal' | 'rustClay';
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={spacing.xs}
      style={styles.action}
    >
      <Text variant="monoLabel" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

const AVATAR = 40;

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  names: { flex: 1, gap: 1 },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingLeft: AVATAR + spacing.sm,
  },
  action: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
});
