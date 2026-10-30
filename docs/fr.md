# Don du sang

Les prochaines **collectes de sang de l'Établissement français du sang (EFS)** autour de chez toi,
dans Gladys : combien dans les prochains jours, où et quand a lieu la prochaine, si tu peux prendre
rendez-vous en ligne, et des alertes dans tes scènes. Les données viennent de la carte publique de
l'EFS, celle de [dondesang.efs.sante.fr](https://dondesang.efs.sante.fr/trouver-une-collecte) :
**sans compte, sans clé**.

France métropolitaine et départements d'outre-mer desservis par l'EFS.

## Ce que tu obtiens

- Un appareil, **la zone** : autour de la maison localisée dans Gladys, ou autour d'un point que tu
  saisis, dans un rayon de 5 à 50 km.
- Ses capteurs : le nombre de journées de collecte sur les **7 prochains jours** et sur les **30
  prochains jours**, et la **prochaine collecte** : lieu et commune, jour et horaires, distance,
  rendez-vous en ligne et places libres.
- Un **widget de tableau de bord** « Collectes de sang » : les prochaines collectes de la zone (8 au
  plus), avec jour, horaires, distance et lien de rendez-vous.
- Des **déclencheurs de scène** : « Nouvelle collecte de sang annoncée », « Collecte de sang
  aujourd'hui » (chaque matin vers 8 h) et « Collecte de sang demain » (chaque soir vers 18 h).
- Une **action de scène** « Collectes de sang à proximité » : les collectes d'une période en une
  phrase, prête à envoyer ou à dire.
- Textes en anglais, français, allemand et espagnol.

Vérifie toujours la collecte et les critères de don sur le site de l'EFS avant d'y aller : les
horaires peuvent changer, et tout le monde ne peut pas donner son sang un jour donné.

## Prérequis

- Gladys Assistant **5.3.0** ou plus récent.
- Un accès à Internet depuis Gladys (`oudonner.api.efs.sante.fr`).
- La maison localisée dans Gladys (Paramètres → Maisons), ou un point saisi dans la configuration.

## Installation

Dans Gladys, ouvre **Intégrations → Installer depuis GitHub** et saisis l'adresse de ce dépôt :
`https://github.com/guim31/gladys-don-du-sang`. Gladys télécharge l'image et démarre
l'intégration.

## Configuration

### Réglages

- **Rayon** : 5, 10, 20 (par défaut), 30 ou 50 km autour du centre de la zone, à vol d'oiseau.
- **Latitude / Longitude d'un autre point** : laisse-les vides pour utiliser la maison localisée
  dans Gladys. Saisis les deux (degrés décimaux, point ou virgule : `43,6045` et `1,4440`) pour
  suivre un autre lieu : ton travail, la commune de tes parents.
- **Langue des noms et des messages** : la langue des noms de fonctionnalités, des textes de scène
  et du compte rendu « Vérifier » (français par défaut). Les lieux et les communes restent tels que
  l'EFS les écrit.

### Ajouter l'appareil

Enregistre la configuration, puis ouvre l'onglet **Découverte** de l'intégration et ajoute
l'appareil « Don du sang ». Les noms de ses fonctionnalités sont figés à l'ajout : choisis la langue
avant.

### Vérifier

Le bouton **Vérifier** affiche la zone utilisée (maison ou point, rayon), la dernière lecture de
l'EFS et son résultat, et si l'appareil est ajouté.

## Appareil

| Fonctionnalité                   | Type          | Contenu                                          |
| -------------------------------- | ------------- | ------------------------------------------------ |
| Collectes sur 7 jours            | compteur      | journées de collecte d'aujourd'hui au 6e jour    |
| Collectes sur 30 jours           | compteur      | journées de collecte d'aujourd'hui au 29e jour   |
| Prochaine collecte : lieu        | texte         | `SALLE DES FÊTES, MURET`                         |
| Prochaine collecte : date        | texte         | `demain, 10:00–13:30, 14:30–19:00`               |
| Prochaine collecte : distance    | distance (km) | depuis le centre de la zone, à vol d'oiseau      |
| Prochaine collecte : rendez-vous | texte         | `Rendez-vous en ligne · 19 places libres sur 44` |

Une collecte sur deux jours compte pour deux journées. Une collecte quitte « prochaine » à la fin de
son dernier créneau.

## Widget du tableau de bord

Ajoute le widget **Collectes de sang** à un tableau de bord. Réglages : la période (aujourd'hui,
demain, 7 prochains jours, 30 prochains jours), la légende avec le nombre, et le badge « RDV en
ligne ». Chaque ligne affiche le lieu, le jour et les horaires, la distance ; un appui ouvre
l'adresse, les places libres et le lien de rendez-vous sur le site de l'EFS.

## Déclencheurs de scène

- **Nouvelle collecte de sang annoncée** : l'EFS publie une nouvelle journée de collecte dans la
  zone (lu deux fois par jour). La première lecture d'une zone sert de référence : rien n'est annoncé
  à l'installation, ni quand tu changes de zone.
- **Collecte de sang aujourd'hui** : chaque matin vers 8 h, pour chaque collecte de la zone ce
  jour-là.
- **Collecte de sang demain** : chaque soir vers 18 h, pour chaque collecte de la zone le lendemain.

Variables : lieu, commune, adresse, date et horaires, jour (`AAAA-MM-JJ`), horaires, distance (km),
rendez-vous, lien de rendez-vous, fin (ISO 8601).

## Action de scène

**Collectes de sang à proximité** : choisis une période et le nombre de collectes citées ; l'action
renvoie une phrase (« 7 prochains jours : 6 collectes de sang près de chez toi, … »), le nombre de
journées de collecte (pour ne continuer que s'il y en a une), le lieu, la date et le lien de
rendez-vous de la prochaine.

## Exemples de scènes

- « Collecte de sang demain » → envoyer un message : `Collecte de sang demain à {{place}},
{{city}} : {{hours}}. Mange bien et bois beaucoup d'eau ! {{url}}`.
- Chaque lundi à 8 h → « Collectes de sang à proximité » (7 prochains jours) → continuer seulement
  si le nombre est supérieur à 0 → dire la phrase sur l'enceinte.
- « Nouvelle collecte de sang annoncée » → une notification avec le lieu et la date.

## Données et rafraîchissement

- Source : l'API de la carte de l'EFS (`oudonner.api.efs.sante.fr/carto-api`, v3), publiée sur
  data.gouv.fr (« Lieux et horaires des collectes de sang ») sous Licence Ouverte 2.0.
- Une requête **toutes les 12 heures** (deux fois par jour au plus), pour les collectes à partir
  d'aujourd'hui. Une lecture en échec est retentée au bout d'une heure ; les collectes connues
  restent affichées.
- Toutes les 10 minutes, sans réseau, les compteurs et la prochaine collecte suivent l'horloge.
- La requête porte le centre de la zone **arrondi à un kilomètre environ** : la position exacte de
  ta maison n'est pas envoyée. Les distances sont calculées par l'intégration.
- Les collectes réservées au personnel d'une entreprise, d'un établissement scolaire ou d'une unité
  militaire sont écartées.
- Ce qui a déjà été annoncé est gardé dans `/data/state.json` : un redémarrage n'annonce rien deux
  fois.

## Dépannage

- **Aucun appareil dans l'onglet Découverte** : la maison n'est pas localisée dans Gladys et aucun
  point n'est saisi. Le bouton « Vérifier » le dit.
- **Compteurs à 0** : aucune collecte publique dans le rayon ; essaie un rayon plus grand. L'EFS
  publie environ dix semaines à l'avance.
- **« Dernière lecture en échec »** : le site de l'EFS est injoignable ; l'intégration réessaie
  toutes les heures.
- **Une collecte manque ou diffère** : l'EFS fait foi ; vérifie sur son site.
- Journaux : mets `LOG_LEVEL=debug` pour le détail de chaque lecture.

## Limites

- Seulement les collectes mobiles (salles des fêtes, entreprises ouvertes au public, universités) ;
  les sites fixes (« Maisons du don ») ont leurs propres horaires d'ouverture et ne sont pas listés.
- Les informations de rendez-vous sont celles de la carte de l'EFS : prise de rendez-vous en ligne
  proposée, places libres pour le don de sang. Les dons de plasma et de plaquettes se font sur
  rendez-vous dans les Maisons du don.
- Distances à vol d'oiseau.
- Sans lien avec l'Établissement français du sang.

## Crédits

- Données : [Établissement français du sang](https://efs.sante.fr), Licence Ouverte 2.0
  ([data.gouv.fr](https://www.data.gouv.fr/datasets/lieux-et-horaires-des-collectes-de-sang)).
- Construit avec le [SDK d'intégration de Gladys Assistant](https://github.com/GladysAssistant/integration-sdk-js).
