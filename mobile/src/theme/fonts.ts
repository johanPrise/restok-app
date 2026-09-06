import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import {
  WorkSans_400Regular,
  WorkSans_600SemiBold,
} from '@expo-google-fonts/work-sans';

/**
 * Deux familles, trois graisses (`DESIGN.md`). Archivo et Archivo Black sont
 * partis avec `tagName` : deux fichiers de fonte de moins à charger avant que
 * l'app ne s'affiche.
 */
export const appFonts = {
  WorkSans_400Regular,
  WorkSans_600SemiBold,
  IBMPlexMono_500Medium,
};
