/**
 * La configuration Expo, en JavaScript plutôt qu'en JSON.
 *
 * Une seule raison : `google-services.json` ne doit pas vivre dans un dépôt
 * public. Google le documente comme non secret — sa clé est restreinte au nom
 * de paquet — mais il nomme le projet Firebase, et un fichier de configuration
 * d'infrastructure n'a rien à faire sous licence MIT.
 *
 * Il se pose donc en **variable d'environnement de type fichier** côté EAS
 * (`GOOGLE_SERVICES_JSON`), que seuls les serveurs de build savent lire. Le
 * repli couvre le développement local, où le fichier est présent mais ignoré
 * par git.
 *
 * @see https://docs.expo.dev/eas/environment-variables/
 */
const fs = require('fs');
const path = require('path');

const declared = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const googleServices = fs.existsSync(path.resolve(__dirname, declared))
  ? declared
  : null;

module.exports = {
  expo: {
    name: 'Restock',
    slug: 'restock',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'restock',
    owner: 'yoricksenpai',

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'dev.yoricksenpai.restock',
    },

    android: {
      package: 'dev.yoricksenpai.restock',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Voir l'en-tête : le fichier vient d'EAS en build, du disque en local.
      //
      // Déclaré seulement s'il existe. Sinon `expo prebuild` échoue sur son
      // absence, ce qui rendait impossible de fabriquer un build de
      // développement en local — or c'est le seul moyen de voir l'app sur un
      // téléphone dès qu'Expo Go passe à un SDK plus récent que le projet.
      // Sans lui, il n'y a pas de notifications push, et rien d'autre ne
      // change.
      ...(googleServices ? { googleServicesFile: googleServices } : {}),
    },

    web: {
      favicon: './assets/favicon.png',
    },

    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      'expo-splash-screen',
      [
        'expo-notifications',
        {
          icon: './assets/android-icon-monochrome.png',
          color: '#2B6B5E',
        },
      ],
      'expo-localization',
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      router: {},
      eas: {
        projectId: '37ae7e05-b4ba-46b3-b9ce-07b5cc00bcbd',
      },
    },
  },
};
