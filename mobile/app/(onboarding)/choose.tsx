import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useCreateGroup } from '@/api/groups';
import { ChoiceCard } from '@/components/ChoiceCard';
import { CreateGroupIcon, JoinGroupIcon, ShelfIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { SystemFooter } from '@/components/SystemFooter';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { spacing, useTheme } from '@/theme';

export default function Choose() {
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();
  const create = useCreateGroup();

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="monoLabel" color="inkSoft">
          Onboarding / Étape 02
        </Text>
        <Text variant="title">Votre espace</Text>
      </View>

      {/* Défilant : à deux cartes tout tenait, la troisième débordait et
          passait par-dessus le titre. `flexGrow` garde le centrage tant qu'il
          y a de la place, et rend la liste défilable dès qu'il n'y en a plus —
          même compromis que `FormScreen`. */}
      <ScrollView
        contentContainerStyle={styles.choices}
        showsVerticalScrollIndicator={false}
      >
        <ChoiceCard
          badge="Nouveau"
          title="Créer un groupe"
          description="Commencer un nouvel inventaire partagé"
          action="start_new"
          icon={<CreateGroupIcon color={colors.choiceBorder} />}
          onPress={() => router.push('/create-group')}
        />
        <ChoiceCard
          badge="Invitation"
          title="Rejoindre un groupe"
          description="Utiliser un code d'invitation"
          action="connect_existing"
          icon={<JoinGroupIcon color={colors.choiceBorder} />}
          onPress={() => router.push('/join')}
        />
        {/* Aucun formulaire : quelqu'un qui vit seul n'a pas de groupe à
            nommer, ni de type à choisir. On crée son espace et on entre. */}
        <ChoiceCard
          badge="Seul"
          title="Juste moi"
          description="Un inventaire pour toi, sans personne à inviter"
          action="start_solo"
          icon={<ShelfIcon color={colors.choiceBorder} size={30} />}
          onPress={() =>
            create.mutate(
              { name: 'Chez moi', type: 'solo' },
              {
                onSuccess: () => {
                  // Rien n'est marqué ici. L'étape des notifications se saute
                  // d'elle-même tant que le groupe est solo, et cette
                  // condition-là se relit à chaque passage : le jour où
                  // quelqu'un entre avec le code, la question se pose enfin.
                  // Un drapeau posé maintenant l'aurait éteinte pour toujours.
                  toast('Ton inventaire est prêt');
                  router.replace('/');
                },
              },
            )
          }
        />
      </ScrollView>

      <SystemFooter left="Restock_os // system_ready // ver_2.4" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xl, gap: spacing.xs, alignItems: 'center' },
  choices: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
