import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { spacing } from '@/theme';
import { Screen } from './Screen';

interface FormScreenProps {
  children: ReactNode;
}

/**
 * Écran de saisie : le contenu remonte au-dessus du clavier.
 *
 * Un simple `justifyContent: center` centre le formulaire dans un conteneur
 * dont la hauteur ne change pas à l'ouverture du clavier — le champ du bas
 * passe alors dessous, hors d'atteinte. Il faut deux choses ensemble :
 *
 * - `KeyboardAvoidingView` pour réduire la zone disponible sur iOS. Android
 *   redimensionne déjà la fenêtre (`adjustResize`), d'où l'absence de
 *   `behavior` là-bas — en mettre un empilerait les deux compensations.
 * - un `ScrollView` pour que ce qui dépasse reste atteignable au doigt plutôt
 *   que d'être simplement rogné.
 *
 * `keyboardShouldPersistTaps="handled"` permet d'appuyer sur un bouton du
 * premier coup ; sans lui le premier tap ne fait que fermer le clavier.
 */
export function FormScreen({ children }: Readonly<FormScreenProps>) {
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // flexGrow plutôt que flex : le contenu reste centré quand il y a de la
  // place, et devient défilable dès qu'il n'y en a plus.
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.card,
  },
});
