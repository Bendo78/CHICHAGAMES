// =====================================================================
//  PERSONNALISE TON JEU ICI  ✏️
//  Tout ce fichier est fait pour être modifié. Pas besoin de toucher au reste.
// =====================================================================
window.CONFIG = {
  // Le nom affiché sur l'écran d'accueil
  NOM_DU_JEU: "Clash des Potes",

  // Code secret du groupe : seuls les joueurs qui ont CE code (donc ce site)
  // peuvent se rejoindre. Change-le pour un truc à vous !
  CODE_SECRET: "les-potes-2026",

  // La liste des joueurs (pseudo + emoji ou avatar)
  POTES: [
    { nom: "Moi", avatar: "😎" },
    { nom: "Pote 1", avatar: "🦊" },
    { nom: "Pote 2", avatar: "🐸" },
    { nom: "Pote 3", avatar: "🐼" },
  ],

  // ------------------------------------------------------------------
  //  LES CARTES
  //  - nom / emoji / description : ce qui s'affiche
  //  - image (optionnel) : "images/lucas.png" → la photo remplace l'emoji
  //    (mets tes images dans le dossier images/, idéalement carrées)
  //  - cout : élixir (1 à 10)
  //  - type : "troupe" (par défaut) ou "sort"
  //  - pv : points de vie   - degats : dégâts par coup
  //  - cadence : secondes entre 2 coups   - vitesse : cases / seconde
  //  - portee : en cases (≥ 2 = attaque à distance)
  //  - cible : "sol", "tout" (sol + volants) ou "batiments" (que les tours)
  //  - volant : true/false   - nombre : combien d'unités posées
  //  - zone : rayon des dégâts de zone (0 = un seul ennemi)
  //  - taille : rayon de l'unité (0.3 petit → 0.8 énorme)
  //  Sorts : degats, rayon, degatsTour (multiplicateur sur les tours)
  // ------------------------------------------------------------------
  CARTES: [
    { id: "chevalier", nom: "Le Chevalier", emoji: "⚔️", cout: 3, pv: 1400, degats: 160, cadence: 1.2, vitesse: 1.0, portee: 0.8, cible: "sol", description: "Solide au corps à corps." },
    { id: "archeres", nom: "Les Archères", emoji: "🏹", cout: 3, nombre: 2, pv: 300, degats: 90, cadence: 0.9, vitesse: 1.0, portee: 5, cible: "tout", taille: 0.4, description: "Tirent sur le sol et les volants." },
    { id: "golem", nom: "Le Golem", emoji: "🗿", cout: 5, pv: 3800, degats: 220, cadence: 1.5, vitesse: 0.7, portee: 0.8, cible: "batiments", taille: 0.8, description: "Énorme. Ne tape que les tours." },
    { id: "gobelins", nom: "Les Gobelins", emoji: "👺", cout: 2, nombre: 3, pv: 200, degats: 100, cadence: 1.1, vitesse: 1.6, portee: 0.6, cible: "sol", taille: 0.4, description: "Rapides et pas chers." },
    { id: "dragon", nom: "Le Petit Dragon", emoji: "🐉", cout: 4, pv: 1000, degats: 130, cadence: 1.5, vitesse: 1.5, portee: 3.5, cible: "tout", volant: true, zone: 1.2, description: "Volant, crache des flammes en zone." },
    { id: "sorcier", nom: "Le Sorcier", emoji: "🧙", cout: 5, pv: 700, degats: 230, cadence: 1.4, vitesse: 1.0, portee: 5.5, cible: "tout", zone: 1.5, description: "Boules magiques à distance, en zone." },
    { id: "squelettes", nom: "Les Squelettes", emoji: "💀", cout: 1, nombre: 4, pv: 80, degats: 80, cadence: 1.0, vitesse: 1.6, portee: 0.5, cible: "sol", taille: 0.32, description: "Distraction à 1 d'élixir." },
    { id: "sanglier", nom: "Le Sanglier Fou", emoji: "🐗", cout: 4, pv: 1500, degats: 260, cadence: 1.6, vitesse: 2.0, portee: 0.6, cible: "batiments", taille: 0.6, description: "Fonce droit sur les tours." },
    { id: "arbaletrier", nom: "L'Arbalétrier", emoji: "🎯", cout: 4, pv: 650, degats: 200, cadence: 1.1, vitesse: 1.0, portee: 6.5, cible: "tout", description: "Très longue portée." },
    { id: "ours", nom: "L'Ours", emoji: "🐻", cout: 4, pv: 1900, degats: 200, cadence: 1.3, vitesse: 1.2, portee: 0.7, cible: "sol", taille: 0.6, description: "Gros tank qui cogne fort." },
    { id: "abeilles", nom: "L'Essaim", emoji: "🐝", cout: 2, nombre: 4, pv: 70, degats: 70, cadence: 1.0, vitesse: 2.0, portee: 0.5, cible: "tout", volant: true, taille: 0.3, description: "Petites, volantes, rapides." },
    { id: "bouledefeu", nom: "Boule de Feu", emoji: "🔥", cout: 4, type: "sort", degats: 600, rayon: 2.5, degatsTour: 0.4, description: "Gros dégâts de zone, n'importe où." },
    { id: "fleches", nom: "Pluie de Flèches", emoji: "🌧️", cout: 3, type: "sort", degats: 250, rayon: 4, degatsTour: 0.4, description: "Nettoie les petites troupes." },
  ],

  // Le deck de départ (8 cartes) — chacun peut changer le sien dans le jeu
  DECK_PAR_DEFAUT: ["chevalier", "archeres", "golem", "gobelins", "dragon", "squelettes", "bouledefeu", "fleches"],
};
