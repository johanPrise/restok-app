# Direction de design

L'app sert un foyer qui partage un stock. L'action unique de l'écran principal est
**déclarer un mouvement** — « j'en ai pris ». Tout le reste en découle : la liste de
courses, les recettes et le journal ne valent rien si ce geste n'est pas fait debout,
une main occupée, en trois secondes. Chaque décision ci-dessous se juge à ça.

## Hiérarchie

**Ce qui demande une action est le plus grand et le plus gras ; tout le reste descend
d'un cran, et rien ne remonte par la couleur.**

## Typographie

Deux familles, trois graisses, cinq tailles.

| rôle | fonte | usage |
|---|---|---|
| texte | Work Sans 400 | corps, libellés, tout ce qui se lit en phrase |
| emphase | Work Sans 600 | ce sur quoi on peut agir, les titres |
| donnée | IBM Plex Mono 500 | quantités, dates, compteurs, codes, colonnes |

**Pourquoi garder une monospace.** Le journal et l'historique d'un item se lisent en
colonnes, et une colonne n'existe que si les chiffres ont la même avance. C'est une
fonction, pas un style : sans chasse fixe, `×12` et `×3` ne s'alignent plus et le
registre cesse de prouver quoi que ce soit.

**Pourquoi Archivo Black disparaît.** Il portait `display`, `title` et `tagName` — trois
rôles qu'une graisse 600 dans une taille plus grande distingue aussi bien. Il coûtait
deux fichiers de fonte au démarrage, et sur `tagName` il imposait des capitales à ce qui
se lit le plus dans l'app : le nom d'un item. Les capitales ralentissent la lecture des
noms propres et des mots courts, exactement le cas ici.

| taille | interligne | rôle |
|---|---|---|
| 28 | 1,1 → 31 | un seul par écran, jamais deux |
| 20 | 1,2 → 24 | nom d'item, en-tête de groupe |
| 16 | 1,5 → 24 | corps |
| 13 | 1,5 → 19,5 | métadonnées, colonnes, en-têtes de section |
| 11 | 1,5 → 16,5 | libellés d'onglets, et rien d'autre |

**Mesure : ~45 caractères, pas 65.** Sur 390pt avec une gouttière de 16, la ligne fait
358pt, soit 45 signes en Work Sans 16. Atteindre 65 exigerait de descendre à 11px. La
contrainte est intenable sur téléphone et je ne fais pas semblant de la tenir.

Aucun paragraphe centré, y compris dans les états vides.

## Palette

Un accent — le teal — pour ce sur quoi on agit. Trois couleurs de statut, qui sont une
**donnée** et jamais une décoration. Le reste en neutres. Ratios mesurés, arrondis au
centième, calculés sur le fond le plus défavorable de chaque mode.

| token | clair | sombre | ratio clair | ratio sombre | seuil |
|---|---|---|---|---|---|
| `paper` | `#F2F4F0` | `#141A16` | — | — | fond |
| `raised` | `#FBFCFA` | `#1E2620` | — | — | surface flottante |
| `sunken` | `#D8DED9` | `#2E3A33` | — | — | fond inerte, jauge vide |
| `ink` | `#1C2620` | `#E8EDE9` | **14,08** | **14,90** | 4,5 |
| `inkSoft` | `#5A6B62` | `#8A9A90` | **5,11** | **5,98** | 4,5 |
| `accent` | `#2B6B5E` | `#5FB3A0` | **5,63** | **7,10** | 4,5 |
| `accentPress` | `#1D4A41` | `#8AD0C0` | **9,68** | **9,98** | 4,5 |
| `out` — à racheter | `#BB4C2A` | `#D96A45` | **4,54** | **5,13** | 4,5 |
| `low` — stock bas | `#8C6A1A` | `#E3B54A` | **4,53** | **9,23** | 4,5 |
| `ok` — disponible | `#53785B` | `#93BA9B` | **4,51** | **8,19** | 4,5 |
| `rule` | `#7E8B85` | `#6A7A72` | **3,21** | **3,90** | 3,0 |

Le libellé d'un bouton primaire lit **6,06** (clair) et **7,10** (sombre) ; d'un bouton
inerte, **11,41** et **10,02**. Aucune paire de la maquette ne passe sous son seuil.

**L'état pressé augmente le contraste avec la page**, dans les deux modes : il fonce en
clair, il s'éclaircit en sombre. C'est une règle, pas deux couleurs choisies séparément.

## Échelles

**Espacement : 4, 8, 16, 24, 32, 48, 64.** Le 12 disparaît — il servait 77 fois et ne se
distinguait de 8 ni de 16.

| valeur | rôle |
|---|---|
| 4 | une étiquette et sa valeur, sur la même ligne |
| 8 | entre les éléments d'un même composant |
| 16 | padding d'un composant ; entre deux composants d'un groupe |
| 24 | padding d'une carte ; entre deux étiquettes d'une liste |
| 32 | entre deux cartes ; entre deux groupes |
| 48 | entre deux sections ; au-dessus de l'action terminale d'un écran |
| 64 | respiration d'un état vide |

L'écart entre groupes dépasse **strictement** l'écart interne, à chaque niveau : 8 entre
les lignes d'une étiquette, 24 entre étiquettes, 48 entre sections. Une carte à 24 de
padding se sépare de la suivante par 32, jamais par 24 — sinon le blanc du dedans et le
blanc du dehors se valent, et le groupe cesse d'être un groupe.

**Rayon unique : 8.** Partout, sans exception. La case à cocher passe à 0 — l'absence de
rayon n'est pas un rayon concurrent, et à 24px un arrondi de 8 la fait lire comme une
pastille, qui se coche mal.

**Bordures.** Espacement d'abord, fond teinté ensuite, trait en dernier. Le trait ne
subsiste qu'aux bords de champ de saisie, où il porte la reconnaissance du contrôle — un
formulaire doit se comporter comme un formulaire. À 3,21:1 il est visible ; le `thread`
qu'il remplace plafonnait à 1,33:1, c'est-à-dire à rien.

## Trois décisions qui ne viennent pas d'un gabarit

**1. L'étiquette perd sa carte.** Plus de bordure, plus de surface surélevée, plus de
perforation sur les items d'une liste : les tags se séparent par le blanc seul. Le fil
qui les cernait n'a jamais dépassé 1,33:1 — il n'était pas discret, il était invisible.
Ce qu'on y gagne se compte. Sans carte il n'y a plus de padding, seulement l'écart entre
étiquettes : la hauteur d'un tag tombe de 143 à 66pt (nom 24, écart 8, méta 19,5, écart
8, jauge 6), et le pas de la liste de 151 à 90. Environ **deux items de plus par écran,
tout en respirant davantage**. La carte survit là où quelque chose flotte vraiment — le
toast, le code d'invitation, un état vide.

**2. Le statut n'est jamais porté par la couleur seule, parce que c'est
mathématiquement impossible.** Trois couleurs qui atteignent le même contraste sur le
même fond ont, par construction, la même luminance — donc la même valeur de gris. On ne
peut pas avoir à la fois trois statuts tous lisibles et trois statuts distinguables en
niveaux de gris. Le statut passe donc par la **position** (sa section), la **longueur**
(le remplissage de la jauge) et le **mot** ; la couleur confirme et ne décide pas. Le
badge cesse d'être une pastille colorée pour devenir un mot coloré : plus de texte posé
sur un aplat, donc plus de table de correspondance à tenir à jour, donc plus de « stock
bas » à 1,61:1 en mode sombre.

**3. La monospace est la voix des données, et elle s'élargit.** Chaque nombre, date,
compte et code y passe. C'est ce qui aligne les colonnes du registre — la fonction de
preuve de l'app — et ce qui distingue d'un coup d'œil ce qui est mesuré de ce qui est
raconté. Les colonnes sont dimensionnées sur la plus longue des deux langues, pas sur le
français : « restocked » demande 70pt là où « racheté » en demande 55.

## Densité

Aéré partout, **sauf le journal**. Le geste principal est un balayage qui exige 72 à
120pt de course sur une cible d'au moins 44 : densifier la liste ferait rater le geste
qui porte toute la valeur du produit. Le journal, lui, se lit assis et sert à comparer
deux lignes — la comparaison est sa fonction, il reste en colonnes serrées. La densité
suit la tâche.
