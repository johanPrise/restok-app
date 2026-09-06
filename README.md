# Restock

Un inventaire partagé pour les colocations, les associations — et pour ceux qui
vivent seuls. Chaque chose que le foyer suit devient une étiquette qu'on tire
vers la gauche quand on en prend, vers la droite quand on en rachète. La liste
de courses se remplit toute seule à partir de ce qui manque.

L'app parle **français et anglais**, et suit la langue du téléphone tant que
personne n'en a choisi une dans les réglages.

## Ce que ça fait

- **L'étagère** — des étiquettes, un geste de balayage, un stock qui descend.
  Deux façons de suivre : par seuil (« il y en a / il n'y en a plus ») ou par
  quantité, avec paquets et unités.
- **La liste de courses** — se remplit de ce que l'étagère réclame, se coche au
  magasin, et se reverse dans les stocks d'un seul geste en sortant.
- **Les recettes** — cherchées sur le web depuis l'app, gardées comme on garde
  une vidéo, et triées par **ce qui manque le moins** dans le placard.
- **Le journal** — le registre de qui a pris quoi et quand. Ouvert à tous les
  membres : un registre que seuls les responsables peuvent lire ne prouve rien
  à ceux qui devraient s'y fier.
- **Trois modes** — solo, colocation, association. Le solo retire ce qui n'a
  pas de sens à une seule personne : les auteurs, les invitations, la gestion
  des membres.
- **Deux langues** — français et anglais, y compris les accords. Les pluriels
  et le tri sont délégués à `Intl`, qui sait que « 0 article » est au
  singulier en français et au pluriel en anglais.

## L'architecture

```mermaid
flowchart LR
  subgraph mobile["Mobile — Expo / React Native"]
    ecrans["18 écrans<br/>expo-router"]
    cache["TanStack Query<br/>cache persisté + file hors-ligne"]
    ecrans <--> cache
  end

  subgraph api["Backend — NestJS"]
    direction TB
    auth["auth<br/>JWT + bcrypt"]
    metier["groups · members · items<br/>shopping · recipes"]
    journal["action-history"]
    push["notifications"]
    evts(["EventEmitter2<br/>item.deleted, statut…"])
    metier --> evts
    evts --> journal
    evts --> push
  end

  db[("PostgreSQL 17<br/>migrations TypeORM")]
  expo(["API push Expo"])
  wiki(["Wikilivres<br/>catalogue de recettes"])

  cache -->|HTTPS| auth
  cache -->|HTTPS| metier
  api --> db
  push --> expo
  metier --> wiki
```

Le cache du mobile est persisté sur disque, et les gestes faits hors réseau
sont rejoués au retour de la connexion. La faisabilité d'une recette se calcule
**côté client**, en croisant ses ingrédients avec l'étagère déjà en cache —
c'est ce qui la fait marcher sans réseau.

## Démarrer

Il faut Node 22, pnpm 11 et Docker.

### Le backend

```bash
cd backend
cp .env.example .env          # les valeurs par défaut suffisent en local
docker compose up -d          # PostgreSQL 17 sur le port 5434
pnpm install
pnpm migration:run
pnpm start:dev                # http://localhost:3000
```

### Le mobile

```bash
cd mobile
pnpm install
pnpm start                    # puis « a », « i », ou le QR code
```

Sur un appareil physique, l'adresse de l'API se déduit de celle de Metro : rien
à configurer tant que le téléphone et la machine sont sur le même réseau. Pour
viser un autre serveur, poser `EXPO_PUBLIC_API_URL`.

## Les tests

```bash
cd backend && pnpm test        # 287 unitaires
cd backend && pnpm test:e2e    # 294 e2e, contre un vrai PostgreSQL
cd mobile  && pnpm test        # 247
```

Les e2e parlent à une vraie base plutôt qu'à un double : ils vérifient des
contraintes d'unicité, des suppressions en cascade et des transactions, qu'un
faux ne reproduit pas.

La CI (`.github/workflows/ci.yml`) rejoue les trois suites plus le typage et le
lint des deux côtés, sur chaque PR et sur chaque poussée dans `main`.

Le mobile linte avec `eslint-config-expo`, qui connaît `expo-router`, les
règles des hooks et les particularités de React Native. Prettier passe en
dernier et fait de son formatage la seule autorité, comme côté backend.

## Déployer

### Le backend

[`render.yaml`](render.yaml) décrit le service et sa base. Sur Render :
_New → Blueprint_, pointer sur ce dépôt. Le `JWT_SECRET` est tiré au sort par
Render, les identifiants de la base sont injectés depuis la base déclarée, et
les migrations passent au démarrage — `migrationsRun` est vrai en production.

L'image se construit et se vérifie en local :

```bash
cd backend
docker build -t restock-backend .
docker run --rm -p 3000:3000 \
  -e DB_HOST=… -e DB_USER=… -e DB_PASSWORD=… -e DB_NAME=… \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  restock-backend
curl localhost:3000/health     # {"status":"ok"}
```

`/health` interroge la base, pas seulement le processus : un serveur qui écoute
pendant que PostgreSQL est injoignable répond 500 à chaque requête utile.

> **Une base existante créée par `synchronize`** (avant que les migrations
> existent) refusera de démarrer — la première migration voudra recréer des
> types qui sont déjà là. Il faut la recréer, ou inscrire à la main les
> migrations déjà appliquées dans la table `migrations`.

### Le mobile

```bash
cd mobile
eas build --profile preview --platform android   # un APK à installer
eas build --profile production --platform all
```

`google-services.json` n'est **pas** versionné : Google le documente comme non
secret — sa clé est restreinte au nom de paquet — mais il nomme le projet
Firebase, et un fichier d'infrastructure n'a rien à faire dans un dépôt public.
Il se pose une fois pour toutes en variable de type fichier :

```bash
eas env:create --name GOOGLE_SERVICES_JSON --type file \
  --value ./google-services.json --visibility secret
```

`app.config.js` la lit, et retombe sur le fichier local — présent sur ta
machine, ignoré par git — quand elle n'est pas là.

Les profils `preview` et `production` pointent `EXPO_PUBLIC_API_URL` sur
`https://restock-api.onrender.com`, l'adresse que Render donne au service nommé
`restock-api` dans le blueprint. **Changer l'un, c'est changer l'autre.**

## L'organisation du dépôt

```
backend/          NestJS — un module par domaine
  src/auth        inscription, connexion, JWT
  src/groups      groupes, invitations, types
  src/members     membres, rôles, jetons push
  src/items       l'étagère et sa machine à états
  src/shopping    la liste de courses
  src/recipes     recettes et catalogue Wikilivres
  src/action-history  le journal
  src/health      la sonde de l'hébergeur
  src/migrations  le schéma, versionné
  test/           les e2e, contre un vrai PostgreSQL

mobile/           Expo — expo-router, un fichier par écran
  app/            les écrans et la navigation
  src/api         requêtes, cache, file hors-ligne
  src/components  les formes du système de design
  src/lib         la logique métier testable, hors composants
  src/theme       couleurs, typographie, contrastes mesurés

restock-technical-spec.md   la spécification d'origine
render.yaml                 le déploiement du backend
```

## Les langues

Tout le texte vit dans [`mobile/src/i18n`](mobile/src/i18n) : `fr.ts` fait foi,
`en.ts` doit lui répondre clé pour clé — un test le vérifie, parce qu'une clé
anglaise manquante ne casse rien et fait juste basculer un écran en français au
milieu d'une phrase.

Ce qui touche à la grammaire est délégué à `Intl` plutôt qu'écrit à la main :
`PluralRules` pour les accords, `Collator` pour le tri de l'étagère. La règle
`count < 2` qui traînait en trois endroits était fausse dès qu'on quittait le
français.

Le nom d'unité qu'un foyer tape lui-même — « rouleau », « bidon » — **ne suit
pas** la langue de l'app : on ignore dans quelle langue il a été écrit.

### Les erreurs du serveur

Le backend ne choisit pas la langue : elle se règle dans l'app, et ne suit donc
ni l'appareil ni `Accept-Language`. Ses refus de règle métier portent un **code
stable** ([`business-error.ts`](backend/src/common/business-error.ts)) que le
mobile traduit, en plus d'une phrase française qui reste le repli pour un
client plus ancien que le déploiement.

Ajouter un refus, c'est donc ajouter un code des deux côtés — un code sans
phrase dégrade proprement vers celle du serveur, mais reste français.

## Entrer, et rentrer

Se connecter demande un email et un mot de passe. L'email étant l'identifiant,
et le changer exigeant justement le mot de passe, l'oublier enfermait dehors
définitivement — d'où « mot de passe oublié », qui envoie un code à huit
caractères valable un quart d'heure.

Le code n'est stocké que sous forme de hash bcrypt, ce qui interdit de
retrouver une demande par lui : l'app repasse donc l'email d'un écran à
l'autre. La route ne dit jamais si un compte existe, sous peine de servir
d'annuaire, et l'écran ne le dit pas non plus. Un changement de mot de passe
**coupe les sessions ouvertes avec l'ancien** : sans quoi une réinitialisation
ne reprendrait pas le compte à qui s'y était introduit.

L'envoi passe par SMTP — `MAIL_URL`, `MAIL_FROM` — plutôt que par l'API d'un
fournisseur : Resend, Postmark ou une boîte quelconque en donnent tous les
identifiants. Sans configuration, le développement écrit le code dans la
console ; la production, elle, **refuse de démarrer**, parce qu'une porte de
récupération qui n'écrit que dans les journaux n'existe pas.

### Rester connecté

Le JWT vaut une heure et ne se révoque pas : c'est la contrepartie assumée d'un
jeton qu'aucune requête n'a besoin d'aller valider. Mais sans rien derrière, une
heure était aussi la durée de la **session** — quelqu'un qui ouvre l'app trente
secondes au magasin retapait son mot de passe une fois sur deux.

D'où le refresh token : deux mois (`REFRESH_TOKEN_DAYS`), une ligne en base
qu'on peut effacer, et repoussé à chaque usage. Ce sont deux mois de *silence*
qui referment un compte, pas deux mois d'usage. L'app l'échange toute seule au
premier 401 et rejoue la requête ; personne ne voit rien passer.

Il **tourne** à chaque échange, et ce n'est pas une cérémonie : c'est ce qui
rend un vol visible. Un token volé finit par être présenté deux fois — une fois
par le voleur, une fois par le propriétaire — et cette seconde présentation
coupe toutes les sessions du membre, puisqu'à ce stade seul le mot de passe
permet de trancher. Un token éternel n'aurait jamais donné ce signal.

La rotation a un angle mort, qu'il faut couvrir : le serveur consomme le token
avant que l'app reçoive le suivant, donc une réponse perdue dans un tunnel
laisse l'app avec un token déjà usé. Une fenêtre de trente secondes la
rattrape — au-delà, ce n'est plus une réponse en retard. Côté app, une rafale
de 401 simultanés ne déclenche qu'un seul renouvellement
([`single-flight.ts`](mobile/src/lib/single-flight.ts)) : sans ça, la deuxième
requête aurait présenté un token consommé, et la session serait tombée pour vol
à l'instant où elle essayait de survivre.

Un changement de mot de passe les efface tous. `passwordChangedAt` ne refuse que
les JWT antérieurs, et un refresh token n'en est pas un : sans révocation
explicite, une réinitialisation n'aurait fermé qu'une porte sur deux.

Les routes publiques sont plafonnées : dix connexions par quart d'heure, cinq
inscriptions par heure, cinq demandes de code par heure, trente
renouvellements — un appareil y passe une fois par heure sans rien avoir à se
reprocher. Le plafond général est large — quelqu'un qui coche sa liste au
magasin envoie des rafales — et ce sont les portes ouvertes sans jeton qui se
resserrent. `helmet` pose les en-têtes que personne ne pose seul.

## Partir

On ne retient personne. Quitter son groupe ou supprimer son compte réussit
toujours — y compris pour le dernier responsable, à qui cette app opposait
jusqu'ici un refus : « nomme quelqu'un d'abord ». Le refus tenait tant qu'on
pouvait choisir de rester ; la suppression de compte l'a rendu intenable, et le
garder aurait fait dépendre le droit de partir du bouton sur lequel on appuie.

La place est donc **reprise d'office** par le membre présent dans le groupe
depuis le plus longtemps. C'est ce que font WhatsApp — qui promeut le suivant
dans l'ordre d'arrivée — et Telegram, qui propose d'abord de désigner son
successeur. L'app fait les deux : elle annonce qui héritera, et transmet sans
elle si la personne ne choisit pas.

Ce qu'on ne reprend **pas** de Telegram : le groupe laissé sans propriétaire
quand il n'y a aucun admin à qui transmettre, état où plus personne ne peut
ajouter ni retirer qui que ce soit. Ici n'importe quel membre restant peut
hériter, et un groupe dont le dernier membre s'en va part avec lui — sans quoi
il resterait un groupe vide que personne ne peut plus ni rouvrir ni supprimer.

Le compte part en **soft-delete**, et c'est ce qui rend le journal anonyme sans
le trouer. Les lignes restent, le nom disparaît : effacer les lignes aurait
crevé le registre des autres, qui s'en servent pour savoir qui a pris quoi, et
les garder nommées aurait conservé une donnée personnelle après suppression.

La ligne du membre doit donc survivre — `action_history` s'y accroche — mais
elle est **vidée** de ce qu'elle contenait : nom, email, empreinte du mot de
passe, jeton de notification. Sans ce nettoyage, « supprimer » n'aurait été
qu'une mise à l'écart, avec le nom conservé indéfiniment. L'email est brouillé
plutôt qu'effacé, parce qu'il porte une contrainte d'unicité : le laisser tel
quel aurait transformé une suppression en bannissement de l'adresse.

Ce que l'app garde, pour qui, et pour combien de temps est écrit en toutes
lettres dans la [politique de confidentialité](docs/confidentialite.md).

## Ce qui manque

- **Le mode association** s'arrête au journal et à son export : pas de
  recherche dans les membres, pas de rôles plus fins.
- **Aucun test de rendu.** Les tests du mobile sont tous de la logique pure ;
  aucun composant ni écran n'est monté.
- **Aucune supervision en production.** Un plantage chez quelqu'un est invisible.
- **La politique de confidentialité n'est pas encore en ligne.** Elle est
  écrite ([fr](docs/confidentialite.md), [en](docs/privacy.md)) et fondée sur ce
  que le code fait vraiment, mais il lui manque l'identité du responsable de
  traitement, une adresse de contact, une URL publique — que les stores
  réclament — et un lien depuis l'app.
- **Les notifications push n'ont jamais été vérifiées de bout en bout.** Le
  circuit est complet des deux côtés, mais l'essayer exige un build EAS : Expo
  Go ne reçoit pas de notifications.
- **Aucun build mobile publié.** Les profils EAS sont écrits, aucun APK ni IPA
  n'est sorti.
