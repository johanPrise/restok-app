import { ScrollView, StyleSheet, View } from 'react-native';
import { API_BASE_URL } from '@/api/config';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { border, gauge, radius, spacing, useTheme } from '@/theme';

/**
 * Vitrine du design system — étape 5.2.
 *
 * Remplacée par The Shelf à l'étape 5.5. Sert à vérifier les polices, les deux
 * modes et les primitives sur un vrai appareil.
 */
export default function Index() {
  const { colors, isDark } = useTheme();

  const swatches = [
    ['sage', 'disponible'],
    ['mustard', 'stock bas'],
    ['rustClay', 'à racheter'],
    ['pantryTeal', 'marque'],
  ] as const;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="display">RESTOCK</Text>
        <Text variant="monoLabel" color="inkSoft">
          {isDark ? 'mode sombre' : 'mode clair'} · {API_BASE_URL}
        </Text>

        <Text variant="monoLabel" color="inkSoft" style={styles.section}>
          Typographie
        </Text>
        <Text variant="title">Titre en Archivo Black</Text>
        <Text variant="tagName">Papier toilette</Text>
        <Text variant="body">
          Work Sans pour le texte courant, avec une interligne de 1,4.
        </Text>
        <Text variant="mono" color="inkSoft">
          KJ3M-8T2F · 24 JUIL · IBM Plex Mono
        </Text>

        <Text variant="monoLabel" color="inkSoft" style={styles.section}>
          Statuts
        </Text>
        {swatches.map(([token, label]) => (
          <View key={token} style={styles.swatchRow}>
            <View
              style={[
                styles.gauge,
                { backgroundColor: colors.thread },
              ]}
            >
              <View
                style={[
                  styles.gaugeFill,
                  { backgroundColor: colors[token] },
                ]}
              />
            </View>
            <Text variant="caption" color="inkSoft">
              {label}
            </Text>
          </View>
        ))}

        <Text variant="monoLabel" color="inkSoft" style={styles.section}>
          Surfaces
        </Text>
        <View
          style={[
            styles.tag,
            { backgroundColor: colors.paperRaised, borderColor: colors.thread },
          ]}
        >
          <View style={[styles.perforation, { backgroundColor: colors.paper }]} />
          <Text variant="tagName">Un tag</Text>
          <Text variant="caption" color="inkSoft">
            La profondeur vient du fil, pas d&apos;une ombre.
          </Text>
        </View>

        <Text variant="monoLabel" color="inkSoft" style={styles.section}>
          Boutons
        </Text>
        <Button label="J'en ai pris" />
        <Button label="J'ai racheté" variant="secondary" />
        <Button label="Chargement" loading />
        <Button label="Supprimer le groupe" variant="danger" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingVertical: spacing.lg },
  section: { marginTop: spacing.lg },
  swatchRow: { gap: spacing.xs },
  gauge: {
    height: gauge.height,
    borderRadius: gauge.radius,
    overflow: 'hidden',
  },
  gaugeFill: { height: '100%', width: '60%' },
  tag: {
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: border.hairline,
    borderRadius: radius.tag,
    // Le coin plié : seul risque esthétique du design, sur les tags seulement.
    borderBottomRightRadius: radius.tagFoldedCorner,
  },
  perforation: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
});
