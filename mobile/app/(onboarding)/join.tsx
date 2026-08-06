import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useJoinGroup } from '@/api/groups';
import { Button } from '@/components/Button';
import { CodeInput, INVITE_CODE_LENGTH } from '@/components/CodeInput';
import { FormScreen } from '@/components/FormScreen';
import { SystemFooter } from '@/components/SystemFooter';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { BackLink } from '@/components/BackLink';
import { border, spacing, useTheme } from '@/theme';

export default function Join() {
  const router = useRouter();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const join = useJoinGroup();

  const isComplete = code.length === INVITE_CODE_LENGTH;

  const submit = () => {
    join.mutate(code, {
      // La redirection est portée par l'aiguillage racine une fois le membre
      // rattaché — inutile de nommer la destination ici.
      onSuccess: () => router.replace('/'),
    });
  };

  return (
    <FormScreen>
      <BackLink onPress={() => router.back()} />

      <TagCard>
        <Text variant="tagName">Rejoindre un groupe</Text>
        <Text variant="body" color="inkSoft" style={styles.intro}>
          Saisissez le code d&apos;invitation à {INVITE_CODE_LENGTH} caractères
          pour accéder à l&apos;inventaire partagé.
        </Text>

        <Text variant="monoLabel" color="inkSoft" style={styles.label}>
          Code d&apos;invitation
        </Text>
        <CodeInput value={code} onChange={setCode} autoFocus />

        {join.isError && (
          <Text variant="caption" color="rustClay" style={styles.error}>
            {join.error.message}
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            label="Rejoindre"
            onPress={submit}
            disabled={!isComplete}
            loading={join.isPending}
          />
          <Button
            label="Créer un nouveau groupe"
            variant="secondary"
            onPress={() => router.replace('/create-group')}
          />
        </View>

        <View style={[styles.rule, { backgroundColor: colors.thread }]} />
        <SystemFooter
          left={`Statut: ${isComplete ? 'prêt' : 'attente_entrée'}`}
          right={`${code.length}/${INVITE_CODE_LENGTH}`}
        />
      </TagCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: spacing.sm },
  label: { marginTop: spacing.md, marginBottom: spacing.xs },
  error: { marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  rule: { height: border.hairline, marginTop: spacing.md },
});
