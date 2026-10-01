# ⚔️ Clash des Potes

Un jeu de duel de cartes et de tours, façon Clash Royale, rien que pour toi et tes potes.
Tout tourne dans le navigateur (PC ou téléphone), hébergé gratuitement sur GitHub Pages.

## Ce qu'il y a dedans

- Arène avec rivière, 2 ponts, 2 tours princesse + 1 tour du roi par joueur
- 13 cartes (troupes au sol, volants, unités qui ne visent que les tours, sorts de zone)
- Élixir (×2 dans la dernière minute), main de 4 cartes + carte suivante
- 3 minutes de match, prolongations en mort subite, victoire par couronnes
- Mode **entraînement contre un bot**
- Mode **en ligne 1 contre 1** entre potes avec un code à 4 lettres
- Choix de son deck (8 cartes), sauvegardé dans le navigateur

## Mettre le jeu en ligne sur GitHub Pages (5 minutes)

1. Crée un compte sur [github.com](https://github.com) si tu n'en as pas.
2. Clique sur **New repository**, donne-lui un nom (ex. `clash-des-potes`), laisse-le **Public**, puis **Create repository**.
3. Sur la page du dépôt : **Add file → Upload files**, glisse **tous les fichiers** de ce dossier (`index.html`, `style.css`, `config.js`, `engine.js`, `main.js`, et le dossier `images/` si tu en as un), puis **Commit changes**.
4. Va dans **Settings → Pages**. Dans *Source*, choisis **Deploy from a branch**, branche **main**, dossier **/ (root)**, puis **Save**.
5. Attends 1 ou 2 minutes : ton jeu est en ligne à l'adresse
   `https://TON-PSEUDO.github.io/clash-des-potes/`

Envoie ce lien à tes potes, c'est tout.

## Jouer à plusieurs

1. Chacun ouvre le site et choisit son pseudo dans « Qui joue ? ».
2. L'un clique sur **Créer une partie** : un code de 4 lettres s'affiche.
3. L'autre tape le code et clique sur **Rejoindre**. La partie démarre.

Pour jouer : touche une carte, puis touche l'arène dans ta moitié (la zone rouge montre où c'est interdit). Les sorts se posent n'importe où. Quand tu détruis une tour princesse, tu peux poser tes troupes plus loin de ce côté.

## Créer tes propres cartes ✨ (directement dans le jeu)

Menu → **✨ Créer des cartes** → **+ Nouvelle carte** :

- **Nom, emoji, description**, et une **photo** si tu veux (ta tête, celle d'un pote, ton chat… elle est recadrée automatiquement).
- **Troupe** : points de vie, dégâts, vitesse d'attaque, vitesse de déplacement, portée, nombre d'unités, dégâts de zone, taille, ce qu'elle attaque (sol / tout / que les tours), volante ou non.
- **Sort** : dégâts et rayon.
- Le **coût en élixir est calculé tout seul** selon la puissance de la carte. Une carte trop abusée (plus de 10 d'élixir) est refusée : ça reste équilibré entre vous.

Ensuite, mets-la dans ton deck (**🃏 Mon deck**). En ligne, ta carte est envoyée automatiquement à ton adversaire : il la voit (avec la photo) même s'il ne l'a pas.

**Partager une carte** : bouton 🔗 → un code est copié. Ton pote clique sur **📥 Importer** et le colle.

Les cartes créées sont gardées dans le navigateur. Si tu changes de navigateur ou vides ses données, elles disparaissent : partage-toi le code pour en garder une copie.

## Personnaliser le reste 🎨

Tout se passe dans **`config.js`** (tu peux le modifier directement sur GitHub avec l'icône crayon ✏️) :

- **`NOM_DU_JEU`** : le titre.
- **`CODE_SECRET`** : mets un code à vous. Deux sites avec des codes différents ne peuvent pas jouer ensemble.
- **`POTES`** : vos pseudos et vos emojis.
- **`CARTES`** : renomme les cartes (« Le Chevalier Kévin », « La Boule de Feu de Léa »…), change les stats, les emojis, ajoute-en.
- **Photos de potes sur les cartes** : crée un dossier `images/`, mets-y des photos carrées (ex. `images/kevin.png`) et ajoute `image: "images/kevin.png"` à la carte voulue. La photo s'affiche sur la carte et sur la troupe dans l'arène.
- **`DECK_PAR_DEFAUT`** : les 8 cartes de départ.

Après une modification, attends une minute et recharge la page (Ctrl+F5 si besoin).

## Bon à savoir

- **« Que pour nous »** : le site lui-même est public (n'importe qui ayant le lien peut l'ouvrir), mais personne ne tombe dessus par hasard, et seuls ceux qui ont le même code secret et le code de la partie peuvent vous rejoindre. Ce n'est pas une vraie sécurité (le code est lisible dans `config.js`), juste de quoi rester entre vous.
- **Le réseau** passe en pair-à-pair via [PeerJS](https://peerjs.com) et son serveur gratuit de mise en relation. Sur certains réseaux très verrouillés (Wi-Fi d'école, d'entreprise, parfois la 4G), la connexion peut échouer : essayez une autre connexion.
- La partie est calculée chez celui qui crée la partie. S'il ferme l'onglet, la partie s'arrête.
- Le jeu est une création originale inspirée du genre : pas d'images ni de personnages de Clash Royale (c'est protégé), d'où les emojis et vos propres photos.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La page |
| `style.css` | Le style |
| `config.js` | **Ta personnalisation** |
| `engine.js` | Les règles du jeu (troupes, tours, élixir, bot) |
| `main.js` | Affichage, commandes et mode en ligne |
