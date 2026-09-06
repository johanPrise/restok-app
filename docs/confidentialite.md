# Politique de confidentialité — Restock

**Dernière mise à jour : 5 septembre 2026**

Restock est un inventaire partagé pour les foyers, les colocations et les
associations. Ce document dit exactement quelles données l'application garde,
pourquoi, qui les voit, et comment les faire disparaître.

> **À compléter avant publication** — l'identité du responsable de traitement et
> l'adresse de contact sont obligatoires et ne peuvent pas être devinées :
>
> - Responsable du traitement : `<nom ou raison sociale>`, `<adresse postale>`
> - Contact : `<adresse email>`

---

## Ce que Restock garde

### Ce que vous donnez

| Donnée | Pourquoi | Obligatoire |
|---|---|---|
| **Votre nom** | S'affiche sous chaque prise et chaque rachat, pour que le foyer sache qui a fait quoi | Oui |
| **Votre email** | C'est votre identifiant de connexion, et l'adresse où part un code si vous oubliez votre mot de passe | Oui |
| **Votre mot de passe** | Jamais conservé tel quel : seule une empreinte bcrypt l'est, dont on ne peut pas revenir au mot de passe | Oui |
| **Un jeton de notification** | Pour prévenir votre foyer quand un stock tombe à zéro | Non — seulement si vous acceptez les notifications |

### Ce que votre usage produit

- **Votre groupe** : lequel, votre rôle, et depuis quand vous y êtes.
- **Votre étagère** : le nom des choses que le foyer suit, leurs quantités,
  leurs unités.
- **Votre liste de courses** : ce qui y est ajouté, ce qui est coché, et par qui.
- **Vos recettes** : celles que le groupe garde, avec leur source.
- **Le journal** : qui a pris ou racheté quoi, quand, et en quelle quantité.
- **Vos sessions** : des jetons de connexion, sous forme d'empreinte, pour vous
  éviter de retaper votre mot de passe à chaque ouverture.

### Ce que Restock ne collecte pas

Pas de mesure d'audience, pas de traceur publicitaire, pas d'identifiant
publicitaire, pas de position, pas d'accès aux contacts, pas de profilage.
L'application n'embarque aucun outil d'analyse. Elle ne vend et ne loue aucune
donnée — il n'y a pas de destinataire commercial.

---

## Qui voit vos données

### Les autres membres de votre groupe

C'est le point le plus important, parce qu'il est le propre d'un inventaire
partagé. Les membres de votre groupe voient :

- **votre nom et votre email**, dans la liste des membres ;
- **tout ce que vous prenez et rachetez**, dans le journal du groupe, avec la
  date et la quantité.

Le journal est ouvert à tous les membres, et pas seulement aux responsables :
un registre que seuls les responsables peuvent lire ne prouve rien à ceux qui
devraient s'y fier. Si cela ne vous convient pas, n'entrez pas dans un groupe
partagé — Restock a un mode solo qui ne partage rien.

### Les prestataires techniques

| Qui | Ce qu'il reçoit | Pourquoi |
|---|---|---|
| **L'hébergeur du serveur** (Render, région Francfort) | Toutes les données ci-dessus, puisqu'il héberge la base | Faire tourner le service |
| **Le service de notifications d'Expo** | Votre jeton de notification, et le texte du message | Envoyer les notifications. Le message ne contient **que le nom de l'objet** — « Café épuisé » — jamais le nom d'un membre |
| **Le service d'envoi d'emails** | Votre adresse email et le code de récupération | Uniquement pour « mot de passe oublié ». Aucun autre email n'est envoyé |
| **Wikilivres (Wikimedia)** | Les mots que vous cherchez quand vous cherchez une recette | Trouver des recettes. La requête part **de notre serveur**, pas de votre téléphone : Wikimedia ne voit ni votre adresse IP ni votre compte |

Aucun autre destinataire.

### Les autorités

Vos données ne sont communiquées à un tiers que si la loi l'exige.

---

## Combien de temps

| Donnée | Durée |
|---|---|
| Votre compte et son contenu | Tant que le compte existe |
| Un code de récupération de mot de passe | 15 minutes, puis effacé |
| Une session longue | 60 jours sans usage, puis effacée |
| Les lignes du journal | Tant que le groupe existe — voir ci-dessous |

---

## Supprimer votre compte

Depuis l'application : **Paramètres → Modifier mon compte → Supprimer mon
compte**.
Aucune condition, aucune validation à demander. Même si vous êtes le seul
responsable de votre groupe : quelqu'un d'autre reprend votre place
automatiquement.

Ce qui part immédiatement et définitivement :

- votre nom,
- votre email,
- l'empreinte de votre mot de passe,
- votre jeton de notification,
- toutes vos sessions ouvertes.

**Ce qui reste, et pourquoi.** Les lignes du journal que vous avez produites
subsistent, mais **sans votre nom** : elles apparaissent comme des actions sans
auteur. C'est un choix assumé. Les effacer trouerait le registre des autres
membres, qui s'en servent pour savoir où en sont les stocks et qui a racheté
quoi ; les garder à votre nom conserverait une donnée personnelle après votre
départ. Une fois anonymisées, ces lignes ne permettent plus de vous identifier.

Si vous étiez seul dans votre groupe, le groupe et son étagère partent avec vous.

Vous pouvez vous réinscrire ensuite avec la même adresse email : une suppression
n'est pas un bannissement.

---

## Vos droits

Le règlement européen sur la protection des données vous donne le droit
d'accéder à vos données, de les rectifier, de les effacer, d'en limiter le
traitement, de vous y opposer, et d'en obtenir une copie portable.

En pratique, dans Restock :

- **Accès et copie** — le journal du groupe s'exporte en CSV depuis l'onglet
  Journal. Pour le reste, écrivez à l'adresse de contact.
- **Rectification** — votre nom et votre email se modifient dans « Modifier mon
  compte ».
- **Effacement** — voir « Supprimer votre compte » ci-dessus.
- **Réclamation** — vous pouvez saisir la CNIL (`cnil.fr`) si vous estimez que
  vos droits ne sont pas respectés.

---

## Les mineurs

Restock ne s'adresse pas aux enfants et ne leur demande rien de particulier. Si
vous êtes mineur, demandez l'accord de vos parents avant de créer un compte.

---

## Sécurité

Les mots de passe sont conservés sous forme d'empreinte bcrypt, jamais en clair.
Les codes de récupération le sont aussi. Les jetons de session sont conservés
sous forme d'empreinte et non tels quels. Les échanges entre l'application et le
serveur passent par HTTPS. Changer votre mot de passe ferme toutes les sessions
ouvertes avec l'ancien.

Aucun système n'est infaillible : nous ne pouvons pas garantir une sécurité
absolue.

---

## Changements

Cette politique peut évoluer avec l'application. La date en tête de page dit de
quand date la version que vous lisez. Un changement qui vous concerne vraiment
vous sera signalé dans l'application.
