import { Text } from '@/components/Text';

/**
 * Rend une phrase dont les segments entre astérisques passent en gras.
 *
 * Découper la phrase en trois clés aurait figé l'ordre des mots : « vers la
 * *gauche* » et « *left* » ne tombent pas au même endroit, et « Retape *Coloc
 * Ordener* pour confirmer » place son nom ailleurs qu'en anglais. Un marqueur
 * dans une clé unique laisse chaque langue poser son emphase où elle veut.
 *
 * Vit ici plutôt que dans un composant : c'est une convention d'écriture des
 * traductions, et deux écrans s'en servent déjà.
 */
export function emphase(phrase: string) {
  return phrase.split('*').map((morceau, index) =>
    index % 2 === 1 ? (
      <Text key={index} variant="bodyStrong">
        {morceau}
      </Text>
    ) : (
      morceau
    ),
  );
}
