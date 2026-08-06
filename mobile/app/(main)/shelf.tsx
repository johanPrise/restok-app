import { StyleSheet, View } from 'react-native';
import { useSignOut } from '@/api/auth';
import { useGroup } from '@/api/groups';
import { useItems } from '@/api/items';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { spacing } from '@/theme';

/** Placeholder de l'étape 5.4 — remplacé par The Shelf à l'étape 5.5. */
export default function Shelf() {
  const group = useGroup();
  const items = useItems();
  const signOut = useSignOut();

  return (
    <Screen>
      <View style={styles.body}>
        <Text variant="title">{group.data?.name ?? '…'}</Text>
        <Text variant="monoLabel" color="inkSoft">
          {group.data?.memberCount ?? 0} membres · {items.data?.length ?? 0}{' '}
          items
        </Text>
        <Text variant="mono" color="inkSoft">
          Code : {group.data?.inviteCode ?? '········'}
        </Text>

        <Button
          label="Se déconnecter"
          variant="secondary"
          onPress={() => void signOut()}
          style={styles.action}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: spacing.xs },
  action: { marginTop: spacing.lg },
});
