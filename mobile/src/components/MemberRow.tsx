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
  const { colors } = useTheme();
  const t = useT();
  const isAdmin = member.role === 'admin';

  return (
    <View style={styles.row}>
      <View style={styles.identity}>
        {/* Fond neutre, pas `ok` : une couleur de statut ne décore jamais.
            Une pastille verte à côté d'un nom laissait entendre un état du
            membre qui n'existe pas. `sunken` porte l'encre à 11,41:1 en clair
            et 10,02:1 en sombre — plus de couleur choisie selon le thème. */}
        <View style={[styles.avatar, { backgroundColor: colors.sunken }]}>
          <Text variant="title" maxFontSizeMultiplier={1.3}>
            {initial(member.name)}
          </Text>
        </View>

        <View style={styles.names}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {member.name}
            {isSelf ? t('commun.toi') : ''}
          </Text>
          <Text variant="data" color="inkSoft" numberOfLines={1}>
            {member.email}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            { borderColor: isAdmin ? colors.accent : colors.rule },
          ]}
        >
          <Text variant="dataLabel" color={isAdmin ? 'accent' : 'inkSoft'}>
            {t(isAdmin ? 'commun.admin' : 'commun.membre')}
          </Text>
        </View>
      </View>

      {managing && !isSelf && (
        <View style={styles.actions}>
          <Action
            label={t(isAdmin ? 'commun.retrograder' : 'commun.nommerAdmin')}
            color="accent"
            onPress={onToggleRole}
          />
          <Action label={t('commun.retirer')} color="out" onPress={onRemove} />
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
  color: 'accent' | 'out';
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={spacing.tight}
      style={styles.action}
    >
      <Text variant="dataLabel" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

const AVATAR = 40;

const styles = StyleSheet.create({
  row: { gap: spacing.tight },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.tight },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  names: { flex: 1, gap: spacing.hair },
  badge: {
    paddingHorizontal: spacing.tight,
    paddingVertical: spacing.hair,
    borderWidth: border.hairline,
    borderRadius: radius.base,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.base,
    paddingLeft: AVATAR + spacing.tight,
  },
  action: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
});
