import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SystemFooter } from '@/components/SystemFooter';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { border, radius, spacing, useTheme } from '@/theme';

interface ChoiceProps {
  badge: string;
  title: string;
  description: string;
  action: string;
  onPress: () => void;
}

function Choice({ badge, title, description, action, onPress }: Readonly<ChoiceProps>) {
  const { colors } = useTheme();

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <TagCard>
        <View
          style={[styles.badge, { backgroundColor: colors.pantryTealDeep }]}
        >
          <Text variant="monoLabel" color="paperRaised">
            {badge}
          </Text>
        </View>

        <Text variant="tagName" color="pantryTeal">
          {title}
        </Text>
        <View style={[styles.rule, { backgroundColor: colors.thread }]} />
        <Text variant="body" color="inkSoft">
          {description}
        </Text>
        <Text variant="monoLabel" color="inkSoft" style={styles.action}>
          Action: {action} →
        </Text>
      </TagCard>
    </Pressable>
  );
}

export default function Choose() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="monoLabel" color="inkSoft">
          Onboarding / Étape 02
        </Text>
        <Text variant="title">Votre espace</Text>
      </View>

      <View style={styles.choices}>
        <Choice
          badge="Nouveau"
          title="Créer un groupe"
          description="Commencer un nouvel inventaire partagé"
          action="start_new"
          onPress={() => router.push('/create-group')}
        />
        <Choice
          badge="Invitation"
          title="Rejoindre un groupe"
          description="Utiliser un code d'invitation"
          action="connect_existing"
          onPress={() => router.push('/join')}
        />
      </View>

      <SystemFooter left="Restock_os // system_ready // ver_2.4" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xl, gap: spacing.xs, alignItems: 'center' },
  choices: { flex: 1, justifyContent: 'center', gap: spacing.md },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.button,
  },
  rule: { height: border.hairline, marginVertical: spacing.sm },
  action: { marginTop: spacing.sm },
});
