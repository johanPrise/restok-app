import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocale, useT } from '@/i18n/useT';
import { countable, initial, lineQuantity, packsOf } from '@/lib/shopping-list';
import { hasPacks, packSummary, unitsInPacks, withUnit } from '@/lib/units';
import { border, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import type { ShoppingLine } from '@/types/api';
import { Button } from './Button';
import { CheckIcon } from './icons';
import { QuantityStepper } from './QuantityStepper';
import { TagCard } from './TagCard';
import { Text } from './Text';

/** Au-delà, ce n'est plus une course, c'est une livraison. */
const MAX_PACKS = 99;

interface ShoppingRowProps {
  line: ShoppingLine;
  /** Dans un groupe d'une personne, nommer l'auteur n'apprend rien. */
  solo: boolean;
  onToggle: () => void;
  onRemove: () => void;
  /**
   * Le mode gestion est ouvert : chaque ligne montre de quoi la retirer.
   *
   * Retirer se faisait **uniquement** par appui long. La maquette ne dessine
   * aucun bouton de suppression, et en poser un à demeure mettrait un geste
   * destructeur à un pouce du geste qu'on répète le plus — mais un geste
   * qu'aucun écran n'annonce n'existe que pour ceux qui l'ont deviné. D'où un
   * mode séparé, comme celui des membres dans les réglages : le raccourci
   * reste pour ceux qui le connaissent, et il cesse d'être un secret.
   */
  managing: boolean;
  /** Corriger ce qu'on prend vraiment. `null` ferme la correction. */
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onQuantity: (units: number) => void;
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
  solo,
  managing,
  onToggle,
  onRemove,
  editing,
  onEdit,
  onCancelEdit,
  onQuantity,
}: Readonly<ShoppingRowProps>) {
  const { colors } = useTheme();
  const t = useT();
  const locale = useLocale();
  const quantity = lineQuantity(line, locale);
  // Seul, la pastille dirait toujours la même initiale : elle n'apprend rien
  // et occupe la place à côté de la case.
  const who = solo || !line.checked ? null : line.checkedBy;
  // Un item suivi en présence n'a rien à compter : ni quantité, ni invite à en
  // saisir une.
  const editable = countable(line);

  if (editing) {
    return (
      <QuantityEditor
        line={line}
        onCancel={onCancelEdit}
        onCommit={onQuantity}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={line.checked}
      accessibilityState={{ checked: line.checked }}
      accessibilityLabel={[line.name, line.format, quantity]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={
        t(line.checked ? 'courses.decocher' : 'courses.cocher')
      }
      accessibilityActions={[
        { name: 'longpress', label: t('commun.retirer') },
        ...(editable
          ? [{ name: 'magicTap', label: t('courses.corrigerQuantite') }]
          : []),
      ]}
      onAccessibilityAction={({ nativeEvent }) =>
        nativeEvent.actionName === 'magicTap' ? onEdit() : onRemove()
      }
      onPress={onToggle}
      onLongPress={onRemove}
    >
      <TagCard style={styles.card}>
        <View style={styles.text}>
          <Text
            variant="tagName"
            color={line.checked ? 'inkSoft' : 'ink'}
            style={line.checked && styles.struck}
            // Deux lignes comme sur l'étagère : « Pastilles lave-vaisselle
            // citron » tronqué à « Pastilles… » ne désigne plus rien.
            numberOfLines={2}
          >
            {line.name}
          </Text>

          {/* Sur sa propre ligne, et pas à côté du nom : partager la largeur
              tronquait les deux, et « ×40 to… » comme « Pastilles… » ne
              désignent plus aucun produit. Le format dit *lequel* attraper —
              « lessive », il y en a douze sortes ; « ×3 L », il y en a une. */}
          {line.format !== null && (
            <Text
              variant="mono"
              color="inkSoft"
              style={line.checked && styles.struck}
              numberOfLines={1}
            >
              {line.format}
            </Text>
          )}
          {/* La quantité est sa propre cible : on corrige « on partait pour
              six, le paquet de douze était en promo » sans quitter la liste.
              Une ligne qui n'en porte pas encore montre l'invite plutôt que
              rien — sinon il n'y aurait nulle part où appuyer. */}
          {editable && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                quantity
                  ? t('courses.corrigerQuantiteA', { quantite: quantity })
                  : t('courses.preciserQuantiteDe', { nom: line.name })
              }
              onPress={onEdit}
              hitSlop={spacing.xs}
            >
              {/* L'invite est en `pantryTeal`, pas en gris pâle : à 1,33:1 sur
                  le papier elle était illisible, et c'est du texte, pas un
                  ornement. Le teal la distingue en plus d'une quantité réelle —
                  celle-ci est une donnée, celle-là une action. */}
              <Text
                variant="monoLabel"
                color={quantity ? 'inkSoft' : 'pantryTeal'}
                style={line.checked && styles.struck}
              >
                {quantity ?? t('courses.quantiteInvite')}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.marks}>
          {/* En mode gestion seulement : à demeure, il serait à un pouce de la
              case qu'on coche vingt fois dans un magasin. */}
          {managing && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('courses.retirerLigne', {
                nom: line.name,
              })}
              onPress={onRemove}
              hitSlop={spacing.xs}
              style={styles.remove}
            >
              <Text variant="monoLabel" color="rustClay">
                {t('commun.retirer')}
              </Text>
            </Pressable>
          )}

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

/**
 * La ligne pendant qu'on la corrige.
 *
 * Le compteur va en **paquets** quand l'item s'achète par lot, et la
 * conversion se fait juste avant l'appel — le domaine ne connaît que des
 * unités de base. C'est exactement ce que fait déjà l'écran de détail.
 *
 * La case à cocher disparaît le temps de la correction : deux gestes à un
 * pouce d'écart, dont un qui valide une course, c'est une erreur qui attend.
 */
function QuantityEditor({
  line,
  onCancel,
  onCommit,
}: Readonly<{
  line: ShoppingLine;
  onCancel: () => void;
  onCommit: (units: number) => void;
}>) {
  const t = useT();
  const locale = useLocale();
  const [packs, setPacks] = useState(() => packsOf(line));
  const units = unitsInPacks(line, packs);

  return (
    <TagCard style={styles.editor}>
      <View style={styles.editorHead}>
        <Text variant="tagName" style={styles.name} numberOfLines={1}>
          {line.name}
        </Text>
        <QuantityStepper
          label={t(
            hasPacks(line) ? 'courses.paquetsAPrendre' : 'courses.unitesAPrendre',
          )}
          value={packs}
          onChange={setPacks}
          max={MAX_PACKS}
        />
      </View>

      {/* Un compteur de lots est ambigu tant qu'on ne dit pas ce qu'il y a
          dedans. */}
      <Text variant="caption" color="inkSoft">
        {packSummary(line, packs, locale) ?? withUnit(line, units)}
      </Text>

      <View style={styles.editorActions}>
        <Button
          variant="secondary"
          label={t('commun.annuler')}
          onPress={onCancel}
          style={styles.editorAction}
        />
        <Button
          label={t('commun.valider')}
          onPress={() => onCommit(units)}
          style={styles.editorAction}
        />
      </View>
    </TagCard>
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
  text: { flex: 1, gap: 2, alignItems: 'flex-start', maxWidth: '100%' },
  // `flexShrink` sur le nom seul : c'est lui qu'on tronque, jamais le format —
  // « ×6 maxi » coupé en « ×6 m » ne désigne plus rien.
  // Le barré est un style d'état, pas une nouvelle voix typographique : il
  // n'a donc rien à faire dans un variant de `Text`.
  struck: { textDecorationLine: 'line-through' },
  marks: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  remove: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
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
  editor: { gap: spacing.xs },
  editorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  name: { flex: 1 },
  editorActions: { flexDirection: 'row', gap: spacing.xs },
  editorAction: { flex: 1 },
});
