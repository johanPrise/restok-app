# Restock — mobile

L'app Expo. Pour le projet dans son ensemble, l'architecture et le déploiement
du backend, voir le [README racine](../README.md).

Expo SDK 54 · React Native 0.81 · expo-router 6 · TanStack Query 5 · Reanimated 4

## Démarrer

```bash
pnpm install
pnpm start        # puis « a » (Android), « i » (iOS), « w » (web)
```

Le backend doit tourner à côté (`cd ../backend && pnpm start:dev`).

### Où l'app cherche l'API

[`src/api/config.ts`](src/api/config.ts) résout l'adresse dans cet ordre :

1. `EXPO_PUBLIC_API_URL`, si elle est posée ;
2. sinon, l'IP de la machine qui sert Metro, port 3000 ;
3. sinon, `localhost:3000`.

L'étape 2 existe parce que `localhost` ne désigne la bonne machine que depuis un
simulateur iOS : sur un téléphone ou un émulateur Android, il désigne l'appareil
lui-même. Dans un build autonome il n'y a plus de Metro, d'où la variable posée
par profil dans [`eas.json`](eas.json).

## Les tests

```bash
pnpm test        # 166
pnpm typecheck
```

Les tests portent sur `src/lib` — la logique métier vit là, hors des
composants, précisément pour être vérifiable sans moteur de rendu. La
faisabilité d'une recette, les conversions d'unités, les seuils de stock, les
messages d'erreur : tout se teste comme des fonctions.

## L'organisation

```
app/                  les écrans ; le chemin du fichier est l'URL
  (auth)              connexion, inscription
  (onboarding)        intro, choix du mode, jointure, notifications
  (main)/(tabs)       étagère, courses, recettes, réglages
  (main)/items        détail et création d'un item
  (main)/recipes      détail, recherche, saisie à la main

src/
  api/                requêtes, cache TanStack, file hors-ligne, persistance
  components/         les formes du système de design
  lib/                la logique métier, testable
  store/              la session (zustand) — SecureStore, localStorage sur le web
  theme/              couleurs, typographie, contrastes mesurés
```

## Le hors-ligne

Le cache est persisté sur disque, et les gestes faits sans réseau sont rejoués
au retour de la connexion — mais **seulement ceux qui portent une clé de
mutation** ([`src/api/mutation-keys.ts`](src/api/mutation-keys.ts)). Une
mutation sans clé ne survit pas à un redémarrage de l'app : c'est délibéré, et
`offlineNotice()` ne promet jamais une livraison qui n'est pas garantie.

Les gestes qui décident d'une **appartenance** — créer, rejoindre, promouvoir,
retirer, partir, supprimer — sont en `networkMode: 'always'` : ils échouent
franchement hors réseau plutôt que d'attendre en silence derrière un bouton qui
tourne, puis de se déclencher quand plus personne ne regarde.

## Construire

```bash
eas build --profile preview --platform android    # APK à installer
eas build --profile production --platform all
```

`preview` et `production` posent `EXPO_PUBLIC_API_URL` sur l'API déployée. Le
profil `development` ne la pose pas : il garde la résolution par Metro.

Les notifications push exigent un de ces builds — Expo Go ne les reçoit pas, et
l'écran de permission le dit plutôt que d'échouer sans expliquer.

## Les couleurs et le contraste

`src/theme/contrast.ts` porte `textOn(surface)`, avec les ratios **mesurés**
pour chaque fond. Trois défauts d'accessibilité ont été trouvés par le calcul
et non à l'œil — un bandeau à 2,01:1, un badge « Stock bas » à 2,16:1, une
invite « Quantité ? » à 1,33:1. Le seuil est WCAG AA, 4,5:1. Toute nouvelle
paire fond/texte se vérifie, pas se devine.
