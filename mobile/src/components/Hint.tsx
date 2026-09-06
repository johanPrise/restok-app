import { Pressable, StyleSheet, View } from 'react-native';
import { emphase } from '@/i18n/emphase';
import { useT } from '@/i18n/useT';
import type { HintId } from '@/lib/hints';
import { useSession } from '@/store/session';
import { border, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

/**
 * Le repère qui enseigne ce que rien n'annonce.
 *
 * L'app repose sur des gestes qui ne se voient pas — on tire un tag, on tape un
 * titre — et sur des idées qui ne se disent nulle part : les courses cochées
 * se reversent en stock, les recettes arrivent déjà triées par ce qui manque
 * le moins. Jusqu'ici tout ça passait par `accessibilityHint`, c'est-à-dire
 * aux lecteurs d'écran, et à personne d'autre.
 *
 * Il se pose **là où la chose se fait**, jamais dans un carrousel à
 * l'inscription : on retient un geste à l'endroit où il sert, pas trois écrans
 * avant. Et il disparaît au premier usage réussi — le jour où il a fait son
 * travail, il n'a plus rien à dire.
 *
 * Ni modale ni fond assombri, délibérément : l'app est faite d'étiquettes en
 * papier, et une visite guidée y serait un corps étranger. Le repère reprend
 * le coin corné des tags — il appartient à l'écran, il ne vient pas d'ailleurs.
 *
 * `lib/hints.ts` décide lequel paraît ; celui-ci ne fait que le dire.
 */
export function Hint({ id }: Readonly<{ id: HintId }>) {
  const { colors } = useTheme();
  const t = useT();
  const markLearned = useSession((s) => s.markLearned);

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.block,
        { backgroundColor: colors.raised, borderColor: colors.accent },
      ]}
    >
      <View style={styles.row}>
        <Text variant="dataLabel" color="accent">
          {t(`geste.${id}.titre`)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('geste.masquer')}
          hitSlop={spacing.tight}
          onPress={() => void markLearned(id)}
        >
          <Text variant="dataLabel" color="inkSoft">
            {t('geste.compris')}
          </Text>
        </Pressable>
      </View>

      {/* Les astérisques de la traduction marquent ce qui passe en gras : leur
          place change d'une langue à l'autre — voir `emphase`. */}
      <Text variant="body">{emphase(t(`geste.${id}.explication`))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.tight,
    padding: spacing.base,
    borderWidth: border.hairline,
    borderRadius: radius.base,
    // Le coin corné des tags : le repère appartient à l'écran, il n'est pas
    // une notification venue d'ailleurs.
    borderBottomRightRadius: radius.base,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
