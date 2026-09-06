import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

interface StateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Les deux états qui n'ont pas de données à montrer.
 *
 * Ils étaient recopiés dans quatre écrans, chacun avec ses propres écarts —
 * `gap: 8` ici, `paddingVertical: 24` là, `paddingVertical: 32` ailleurs — et
 * leurs paragraphes étaient centrés, ce que `DESIGN.md` interdit : un texte
 * centré n'a pas de bord gauche stable, et l'œil le cherche à chaque ligne.
 *
 * Le titre et le corps forment un groupe (8 entre eux) ; l'action en est un
 * autre (24 avant elle). L'écart entre groupes dépasse l'écart interne, ce qui
 * est exactement ce qui fait qu'on lit deux blocs et non trois lignes.
 */
function StateBlock({
  title,
  body,
  actionLabel,
  onAction,
  titleColor,
}: Readonly<StateProps & { titleColor: 'inkSoft' | 'out' }>) {
  return (
    <View accessibilityRole="summary" style={styles.block}>
      <View style={styles.text}>
        <Text variant="title" color={titleColor}>
          {title}
        </Text>
        <Text variant="body" color="inkSoft">
          {body}
        </Text>
      </View>

      {actionLabel !== undefined && onAction !== undefined && (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

/** Il n'y a rien, et ce n'est pas une panne. */
export function EmptyState(props: Readonly<StateProps>) {
  return <StateBlock {...props} titleColor="inkSoft" />;
}

/**
 * Rien n'a pu être chargé. Le titre nomme ce que la personne voit, pas la
 * panne technique qui l'a causée — et il porte `out`, parce qu'il y a quelque
 * chose à faire.
 */
export function ErrorState(props: Readonly<StateProps>) {
  return <StateBlock {...props} titleColor="out" />;
}

const styles = StyleSheet.create({
  block: { paddingVertical: spacing.section, gap: spacing.card },
  text: { gap: spacing.tight },
  action: { alignSelf: 'stretch' },
});
