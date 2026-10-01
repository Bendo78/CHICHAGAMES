// Interface, atelier de cartes, affichage et réseau (PeerJS, pair-à-pair entre potes).
(() => {
  const C = window.CONFIG;
  const { Game, Bot, W, H, RIVER, BRIDGES, normCard, LIMITS, makeCustomCard } = window.ClashEngine;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };

  // ---------- Registre des cartes (de base + créées) ----------
  const CARDS = {}, IMG = {};
  function register(c) {
    CARDS[c.id] = normCard(c);
    if (c.image) { const im = new Image(); im.src = c.image; IMG[c.id] = im; } else delete IMG[c.id];
  }
  C.CARTES.forEach(register);
  let customs = (store.get("cdp_custom", []) || []).map(makeCustomCard).filter((c) => c && !c.tropForte);
  customs.forEach(register);
  const saveCustoms = () => store.set("cdp_custom", customs.map(shareable));
  const allMyCards = () => [...C.CARTES, ...customs];
  const shareable = (c) => { const o = Object.assign({}, c); delete o.cout; delete o.perso; delete o.tropForte; delete o.puissance; return o; };

  const picHtml = (id) => { const c = CARDS[id]; return c.image ? `<img src="${c.image}" alt="">` : esc(c.emoji); };
  const cardHtml = (c, extra = "") => `<div class="cost">${c.cout}</div>${c.perso ? '<div class="badge">✨</div>' : ""}<div class="pic">${picHtml(c.id)}</div><div class="nm">${esc(c.nom)}</div>${extra}`;

  // Deck : on garde les cartes valides et on complète avec le deck par défaut
  function validDeck(d) {
    const ok = Array.isArray(d) ? [...new Set(d.filter((id) => CARDS[id]))].slice(0, 8) : [];
    for (const id of [...C.DECK_PAR_DEFAUT, ...C.CARTES.map((c) => c.id)]) { if (ok.length >= 8) break; if (!ok.includes(id)) ok.push(id); }
    return ok;
  }
  let deck = validDeck(store.get("cdp_deck", null));
  const saveDeck = () => store.set("cdp_deck", deck);

  // ---------- Profil ----------
  const who = $("#who");
  C.POTES.forEach((p, i) => { const o = document.createElement("option"); o.value = i; o.textContent = `${p.avatar} ${p.nom}`; who.appendChild(o); });
  who.value = Math.min(store.get("cdp_who", 0), C.POTES.length - 1);
  who.onchange = () => store.set("cdp_who", +who.value);
  const myName = () => { const p = C.POTES[+who.value] || C.POTES[0]; return `${p.avatar} ${p.nom}`; };

  $("#title").textContent = C.NOM_DU_JEU;
  document.title = C.NOM_DU_JEU;

  function show(id) { document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("hidden", s.id !== id)); }
  const menuMsg = (t) => { $("#menuMsg").textContent = t || ""; };

  // ---------- Écran deck ----------
  let draft = [];
  function openDeck() {
    draft = deck.slice();
    const grid = $("#deckGrid");
    grid.innerHTML = "";
    for (const c of allMyCards()) {
      const el = document.createElement("div");
      el.className = "card";
      el.dataset.id = c.id;
      el.innerHTML = cardHtml(CARDS[c.id], `<div class="desc">${esc(c.description || "")}</div>`);
      el.onclick = () => {
        const i = draft.indexOf(c.id);
        if (i >= 0) draft.splice(i, 1); else if (draft.length < 8) draft.push(c.id);
        refresh();
      };
      grid.appendChild(el);
    }
    const refresh = () => {
      grid.querySelectorAll(".card").forEach((el) => el.classList.toggle("on", draft.includes(el.dataset.id)));
      $("#deckCount").textContent = draft.length;
      $("#btnDeckOk").disabled = draft.length !== 8;
    };
    refresh();
    show("deckScreen");
  }
  $("#btnDeck").onclick = openDeck;
  $("#btnDeckOk").onclick = () => { deck = draft.slice(); saveDeck(); show("menu"); };
  $("#btnDeckForge").onclick = () => openForge(null, "deck");

  // =====================================================================
  //  ATELIER DE CARTES
  // =====================================================================
  const editorMsg = (t) => { $("#editorMsg").textContent = t || ""; };
  function openEditor() {
    editorMsg("");
    $("#importBox").classList.add("hidden");
    renderMyCards();
    show("editor");
  }
  function renderMyCards() {
    const box = $("#myCards");
    box.innerHTML = "";
    if (!customs.length) { box.innerHTML = `<div class="empty">Aucune carte pour l'instant.<br>Clique sur « Nouvelle carte » !</div>`; return; }
    for (const c of customs) {
      const row = document.createElement("div");
      row.className = "myCard";
      const what = c.type === "sort" ? `Sort · ${c.degats} dégâts` : `${c.nombre > 1 ? c.nombre + "× " : ""}${c.pv} PV · ${c.degats} dégâts`;
      row.innerHTML = `<div class="pic">${picHtml(c.id)}</div><div class="info"><b>${esc(c.nom)}</b><small>💧${c.cout} · ${what}${deck.includes(c.id) ? " · dans ton deck" : ""}</small></div>`;
      const btn = (label, cls, fn) => { const b = document.createElement("button"); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; row.appendChild(b); };
      btn("✏️", "", () => openForge(c, "editor"));
      btn("🔗", "", () => copyText("CDP1:" + b64(JSON.stringify(shareable(c))), "Code de partage copié ! Envoie-le à tes potes."));
      btn("🗑️", "del", () => {
        if (!confirm(`Supprimer « ${c.nom} » ?`)) return;
        customs = customs.filter((x) => x.id !== c.id); saveCustoms();
        if (deck.includes(c.id)) { deck = validDeck(deck.filter((id) => id !== c.id)); saveDeck(); }
        delete CARDS[c.id];
        renderMyCards();
      });
      box.appendChild(row);
    }
  }
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
  const unb64 = (s) => decodeURIComponent(escape(atob(s)));
  async function copyText(t, okMsg) {
    try { await navigator.clipboard.writeText(t); editorMsg(okMsg); }
    catch { $("#importBox").classList.remove("hidden"); $("#importText").value = t; $("#importText").select(); editorMsg("Copie ce code à la main (sélectionné ci-dessous)."); }
  }
  $("#btnEditor").onclick = openEditor;
  $("#btnEditorBack").onclick = () => show("menu");
  $("#btnNewCard").onclick = () => openForge(null, "editor");
  $("#btnImport").onclick = () => { $("#importBox").classList.toggle("hidden"); $("#importText").value = ""; $("#importText").focus(); };
  $("#btnImportOk").onclick = () => {
    const txt = $("#importText").value.trim().replace(/^CDP1:/, "");
    let c = null;
    try { c = makeCustomCard(JSON.parse(unb64(txt))); } catch {}
    if (!c) return editorMsg("Ce code n'est pas valide.");
    if (c.tropForte) return editorMsg("Cette carte est trop puissante, elle est refusée.");
    const i = customs.findIndex((x) => x.id === c.id);
    if (i >= 0) customs[i] = c; else customs.push(c);
    register(c);
    if (!saveCustoms()) return editorMsg("Plus de place pour stocker les cartes (trop de photos ?).");
    $("#importBox").classList.add("hidden");
    renderMyCards();
    editorMsg(`« ${c.nom} » ajoutée ! Mets-la dans ton deck.`);
  };

  // ---------- Formulaire de création ----------
  const VITESSES = ["très lente", "lente", "normale", "rapide", "très rapide"];
  const FIELDS = [
    { k: "nom", label: "Nom de la carte", kind: "text", max: 28 },
    { k: "emoji", label: "Emoji", kind: "text", max: 8 },
    { k: "image", label: "Photo (remplace l'emoji)", kind: "photo" },
    { k: "description", label: "Description", kind: "text", max: 80 },
    { k: "type", label: "Type", kind: "select", opts: [["troupe", "⚔️ Troupe"], ["sort", "🔥 Sort"]] },
    { k: "pv", label: "Points de vie", lim: "pv", only: "troupe" },
    { k: "degats", label: "Dégâts par coup", lim: "degats", only: "troupe" },
    { k: "cadence", label: "Temps entre 2 coups", lim: "cadence", only: "troupe", fmt: (v) => v.toFixed(1) + " s" },
    { k: "vitesse", label: "Vitesse", lim: "vitesse", only: "troupe", fmt: (v) => VITESSES[Math.min(4, Math.floor((v - 0.5) / 0.41))] + ` (${v.toFixed(1)})` },
    { k: "portee", label: "Portée", lim: "portee", only: "troupe", fmt: (v) => (v < 2 ? "corps à corps" : v + " cases") },
    { k: "nombre", label: "Nombre d'unités", lim: "nombre", only: "troupe" },
    { k: "zone", label: "Dégâts de zone", lim: "zone", only: "troupe", fmt: (v) => (v === 0 ? "non" : "rayon " + v) },
    { k: "taille", label: "Taille", lim: "taille", only: "troupe", fmt: (v) => (v < 0.4 ? "petite" : v < 0.6 ? "moyenne" : v < 0.78 ? "grosse" : "énorme") },
    { k: "cible", label: "Attaque", kind: "select", only: "troupe", opts: [["sol", "Troupes au sol et tours"], ["tout", "Tout, même les volants"], ["batiments", "Seulement les tours"]] },
    { k: "volant", label: "Vole (passe au-dessus de la rivière)", kind: "check", only: "troupe" },
    { k: "sdeg", label: "Dégâts du sort", lim: "sortDegats", only: "sort" },
    { k: "rayon", label: "Rayon du sort", lim: "rayon", only: "sort", fmt: (v) => v + " cases" },
  ];
  const DEFAULT_NEW = { nom: "", emoji: "⭐", description: "", type: "troupe", pv: 1000, degats: 150, cadence: 1.2, vitesse: 1.0, portee: 0.5,
    nombre: 1, zone: 0, taille: 0.5, cible: "sol", volant: false, sdeg: 400, rayon: 2.5 };

  let forge = null; // { id, image, back }
  function openForge(card, back) {
    const v = card ? Object.assign({}, DEFAULT_NEW, card, card.type === "sort" ? { sdeg: card.degats } : {}) : Object.assign({}, DEFAULT_NEW);
    forge = { id: card ? card.id : null, image: card ? card.image || null : null, back };
    $("#forgeTitle").textContent = card ? "Modifier la carte" : "Nouvelle carte";
    $("#forgeMsg").textContent = "";
    const form = $("#forgeForm");
    form.innerHTML = "";
    for (const f of FIELDS) {
      const wrap = document.createElement("label");
      wrap.className = "field" + (f.kind === "check" ? " check" : "");
      wrap.dataset.only = f.only || "";
      if (f.kind === "text") {
        wrap.innerHTML = `<div class="lab">${f.label}</div><input type="text" maxlength="${f.max}" data-k="${f.k}">`;
        wrap.querySelector("input").value = v[f.k] || "";
      } else if (f.kind === "select") {
        wrap.innerHTML = `<div class="lab">${f.label}</div><select data-k="${f.k}">${f.opts.map(([val, t]) => `<option value="${val}">${t}</option>`).join("")}</select>`;
        wrap.querySelector("select").value = v[f.k];
      } else if (f.kind === "check") {
        wrap.innerHTML = `<input type="checkbox" data-k="${f.k}"> ${f.label}`;
        wrap.querySelector("input").checked = !!v[f.k];
      } else if (f.kind === "photo") {
        wrap.innerHTML = `<div class="lab">${f.label}</div><div class="photoRow"><input type="file" accept="image/*"><button type="button" class="ghost">Retirer</button></div>`;
        wrap.querySelector("input").onchange = (e) => loadPhoto(e.target.files[0]);
        wrap.querySelector("button").onclick = (e) => { e.preventDefault(); forge.image = null; wrap.querySelector("input").value = ""; updateForge(); };
      } else {
        const [min, max, step] = LIMITS[f.lim];
        wrap.innerHTML = `<div class="lab">${f.label}<span></span></div><input type="range" min="${min}" max="${max}" step="${step}" data-k="${f.k}">`;
        wrap.querySelector("input").value = v[f.k];
      }
      form.appendChild(wrap);
    }
    form.querySelectorAll("[data-k]").forEach((el) => (el.oninput = updateForge));
    updateForge();
    show("forge");
  }

  function readForge() {
    const raw = { id: forge.id || undefined, image: forge.image || undefined };
    $("#forgeForm").querySelectorAll("[data-k]").forEach((el) => {
      const k = el.dataset.k;
      raw[k] = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
    });
    if (raw.type === "sort") raw.degats = raw.sdeg;
    return makeCustomCard(raw);
  }

  function updateForge() {
    const c = readForge();
    const form = $("#forgeForm");
    form.querySelectorAll(".field").forEach((el) => { el.classList.toggle("hidden", !!el.dataset.only && el.dataset.only !== c.type); });
    for (const f of FIELDS) {
      if (!f.lim) continue;
      const input = form.querySelector(`[data-k="${f.k}"]`), val = +input.value;
      input.parentElement.querySelector(".lab span").textContent = f.fmt ? f.fmt(val) : val;
    }
    const prevId = "__preview";
    register(Object.assign({}, c, { id: prevId }));
    $("#preview").innerHTML = `<div class="card">${cardHtml(Object.assign({}, CARDS[prevId], { perso: true }), `<div class="desc">${esc(c.description)}</div>`)}</div>`;
    delete CARDS[prevId];
    const pct = Math.min(100, (c.puissance / 10.5) * 100);
    $("#powerFill").style.width = pct + "%";
    $("#powerTxt").textContent = c.tropForte ? "Trop puissante ! Baisse des stats." : `Coût : ${c.cout} élixir`;
    $("#powerTxt").style.color = c.tropForte ? "#fca5a5" : "";
    $("#btnForgeSave").disabled = c.tropForte;
  }

  function loadPhoto(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const im = new Image();
      im.onload = () => {
        const N = 128, cv2 = document.createElement("canvas"); cv2.width = cv2.height = N;
        const s = Math.min(im.width, im.height);
        cv2.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, N, N);
        forge.image = cv2.toDataURL("image/jpeg", 0.8);
        updateForge();
      };
      im.onerror = () => { $("#forgeMsg").textContent = "Impossible de lire cette image."; };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  $("#btnForgeSave").onclick = () => {
    const c = readForge();
    if (!c || c.tropForte) return;
    if (!c.nom || c.nom === "Ma carte") { const n = $('#forgeForm [data-k="nom"]').value.trim(); if (!n) { $("#forgeMsg").textContent = "Donne un nom à ta carte !"; return; } }
    const i = customs.findIndex((x) => x.id === c.id);
    if (i >= 0) customs[i] = c; else customs.push(c);
    register(c);
    if (!saveCustoms()) { $("#forgeMsg").textContent = "Plus de place pour stocker les cartes (trop de photos ?)."; return; }
    if (forge.back === "deck") openDeck(); else { openEditor(); editorMsg(`« ${c.nom} » enregistrée ! Ajoute-la à ton deck dans « Mon deck ».`); }
  };
  $("#btnForgeCancel").onclick = () => (forge && forge.back === "deck" ? openDeck() : openEditor());

  // =====================================================================
  //  RÉSEAU
  // =====================================================================
  function hash(str) { let h = 5381; for (const ch of str) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h.toString(36); }
  const GROUP = hash(C.CODE_SECRET);
  const peerId = (code) => `cdp-${GROUP}-${code}`;
  const randCode = () => { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ"; return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(""); };
  const myDeckCustoms = () => customs.filter((c) => deck.includes(c.id)).map(shareable);
  // Cartes reçues d'un pote : revérifiées (stats bornées, coût recalculé)
  const acceptCards = (list) => (Array.isArray(list) ? list.slice(0, 8) : []).map(makeCustomCard).filter((c) => c && !c.tropForte);

  let session = null;

  function leave(msg) {
    if (session) {
      clearInterval(session.simTimer);
      cancelAnimationFrame(session.raf);
      try { session.peer && session.peer.destroy(); } catch {}
    }
    session = null;
    $("#endOverlay").classList.add("hidden");
    show("menu");
    menuMsg(msg);
  }
  function lostConnection(text) {
    if (!session) return;
    const s = session.mode === "guest" ? session.snap : session.game && session.game.snapshot(0);
    if (s && s.over) return;
    if (!session.started) return leave(text);
    $("#endTitle").textContent = "Partie interrompue";
    $("#endScore").textContent = text;
    $("#endOverlay").classList.remove("hidden");
    clearInterval(session.simTimer);
  }
  const hasPeer = () => { if (typeof Peer === "undefined") { menuMsg("Le module réseau n'a pas chargé (vérifie ta connexion)."); return false; } return true; };

  function host() {
    if (!hasPeer()) return;
    const code = randCode();
    show("lobby");
    $("#roomCode").textContent = code;
    $("#lobbyMsg").textContent = "Connexion au serveur…";
    const peer = new Peer(peerId(code));
    session = { mode: "host", me: 0, peer };
    peer.on("open", () => { $("#lobbyMsg").textContent = "En attente de ton pote…"; });
    peer.on("error", (e) => {
      if (e.type === "unavailable-id") { peer.destroy(); host(); }
      else $("#lobbyMsg").textContent = "Erreur réseau : " + e.type;
    });
    peer.on("connection", (conn) => {
      if (!session || session.conn) {
        conn.on("open", () => { conn.send({ t: "refused", why: "Partie déjà pleine." }); setTimeout(() => conn.close(), 500); });
        return;
      }
      conn.on("data", (d) => {
        if (!d || typeof d !== "object") return;
        if (d.t === "hello" && !session.conn) {
          if (d.key !== GROUP) { conn.send({ t: "refused", why: "Ce n'est pas le même groupe (code secret différent)." }); setTimeout(() => conn.close(), 500); return; }
          session.conn = conn;
          const guestCards = acceptCards(d.cards);
          guestCards.forEach(register);
          const names = [myName(), String(d.name || "Pote").slice(0, 24)];
          const mine = myDeckCustoms();
          conn.send({ t: "start", names, cards: [...mine, ...guestCards.map(shareable)] });
          startHostGame(names, [deck, validDeck(d.deck)], false, [...C.CARTES, ...customs, ...guestCards]);
        } else if (d.t === "play" && session.game && session.conn === conn) {
          session.game.play(1, d.i | 0, +d.x, +d.y);
        }
      });
      conn.on("close", () => { if (session && session.conn === conn) lostConnection("Ton pote s'est déconnecté."); });
    });
  }

  function join(code) {
    code = code.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return menuMsg("Le code fait 4 lettres.");
    if (!hasPeer()) return;
    $("#menuMsg").textContent = "Connexion…";
    const peer = new Peer();
    session = { mode: "guest", me: 1, peer };
    peer.on("open", () => {
      const conn = peer.connect(peerId(code), { reliable: true, serialization: "json" });
      session.conn = conn;
      conn.on("open", () => conn.send({ t: "hello", key: GROUP, name: myName(), deck, cards: myDeckCustoms() }));
      conn.on("data", (d) => {
        if (!session || !d) return;
        if (d.t === "refused") leave(d.why);
        else if (d.t === "start") { acceptCards(d.cards).forEach(register); startGuestGame(d.names); }
        else if (d.t === "state") {
          session.prev = session.snap; session.prevTime = session.snapTime;
          session.snap = d.s; session.snapTime = performance.now();
        }
      });
      conn.on("close", () => lostConnection("L'hôte s'est déconnecté."));
    });
    peer.on("error", (e) => leave(e.type === "peer-unavailable" ? "Partie introuvable : vérifie le code." : "Erreur réseau : " + e.type));
  }

  $("#btnHost").onclick = host;
  $("#btnJoin").onclick = () => join($("#joinCode").value);
  $("#joinCode").addEventListener("keydown", (e) => { if (e.key === "Enter") join(e.target.value); });
  $("#btnCancel").onclick = () => leave();
  $("#btnBot").onclick = () => {
    session = { mode: "bot", me: 0 };
    const botDeck = C.CARTES.map((c) => c.id).sort(() => Math.random() - 0.5).slice(0, 8);
    startHostGame([myName(), "🤖 Le Bot"], [deck, botDeck], true, allMyCards());
  };
  $("#btnBack").onclick = () => leave();

  // ---------- Lancement ----------
  function startHostGame(names, decks, withBot, cards) {
    const game = new Game(cards, decks, names);
    session.game = game;
    if (withBot) session.bot = new Bot(game, 1);
    let last = performance.now(), n = 0;
    session.overTicks = 0;
    session.simTimer = setInterval(() => {
      const now = performance.now();
      let dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      while (dt > 1e-6) { const s = Math.min(dt, 1 / 30); game.update(s); if (session.bot) session.bot.update(s); dt -= s; }
      if (session.conn && (++n % 2 === 0 || game.over)) { try { session.conn.send({ t: "state", s: game.snapshot(1) }); } catch {} }
      if (game.over && ++session.overTicks > 10) clearInterval(session.simTimer);
    }, 33);
    enterGame(names);
  }
  function startGuestGame(names) { menuMsg(""); enterGame(names); }

  function enterGame(names) {
    session.started = true;
    session.names = names;
    session.sel = null;
    session.handKey = "";
    $("#endOverlay").classList.add("hidden");
    $("#oppName").textContent = "⚔️ " + names[1 - session.me];
    show("gameScreen");
    resize();
    const loop = () => { if (!session) return; frame(); session.raf = requestAnimationFrame(loop); };
    session.raf = requestAnimationFrame(loop);
  }

  // =====================================================================
  //  AFFICHAGE
  // =====================================================================
  const cv = $("#arena"), ctx = cv.getContext("2d");
  let S = 20, OX = 0, OY = 0, DPR = 1;
  function resize() {
    const r = cv.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR);
    S = Math.min(r.width / W, r.height / H);
    OX = (r.width - W * S) / 2; OY = (r.height - H * S) / 2;
  }
  window.addEventListener("resize", resize);

  const flip = () => session && session.me === 1;
  const T = (x, y) => (flip() ? [(W - x) * S + OX, (H - y) * S + OY] : [x * S + OX, y * S + OY]);
  const toWorld = (px, py) => { let x = (px - OX) / S, y = (py - OY) / S; return flip() ? [W - x, H - y] : [x, y]; };

  function currentSnap() {
    if (!session) return null;
    if (session.mode !== "guest") return session.game ? session.game.snapshot(0) : null;
    return session.snap || null;
  }

  // Interpolation des positions côté invité (le réseau envoie ~15 images/s)
  function interpEnts(s) {
    if (session.mode !== "guest" || !session.prev) return s.e;
    const gap = Math.max(30, session.snapTime - session.prevTime);
    const a = Math.min(1, (performance.now() - session.snapTime) / gap);
    const prev = new Map(session.prev.e.map((e) => [e.i, e]));
    return s.e.map((e) => {
      const p = prev.get(e.i);
      if (!p || e.t) return e;
      return Object.assign({}, e, { x: p.x + (e.x - p.x) * a, y: p.y + (e.y - p.y) * a });
    });
  }

  const princessAliveIn = (s) => (o, side) => s.e.some((e) => e.c === "princess" && e.o === o && e.s === side);
  function placementOk(s, card, x, y) {
    if (x < 0.5 || x > W - 0.5 || y < 0.5 || y > H - 0.5) return false;
    if (card.type === "sort") return true;
    for (const e of s.e) if (e.t && Math.hypot(e.x - x, e.y - y) < e.r + 0.3) return false;
    return Game.zoneOk(session.me, x, y, princessAliveIn(s));
  }

  function emoji(txt, x, y, size, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(txt, x, y + size * 0.05);
    ctx.globalAlpha = 1;
  }
  function hpBar(x, y, w, ratio, mine) {
    ctx.fillStyle = "#000a"; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = mine ? "#60a5fa" : "#f87171"; ctx.fillRect(x - w / 2, y, w * Math.max(0, ratio), 4);
  }

  function frame() {
    const s = currentSnap();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const r = cv.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    if (!s) return;
    const me = session.me;

    for (let gx = 0; gx < W; gx++) for (let gy = 0; gy < H; gy++) {
      ctx.fillStyle = (gx + gy) % 2 ? "#5fae4a" : "#69ba53";
      ctx.fillRect(OX + gx * S, OY + gy * S, S + 0.5, S + 0.5);
    }
    ctx.fillStyle = "#3b9bd9"; ctx.fillRect(OX, OY + (RIVER - 1) * S, W * S, 2 * S);
    ctx.fillStyle = "#8b5e34";
    for (const b of BRIDGES) { const [bx] = T(b, 0); ctx.fillRect(bx - S, OY + (RIVER - 1.4) * S, 2 * S, 2.8 * S); }
    ctx.strokeStyle = "#0002"; ctx.lineWidth = 2; ctx.strokeRect(OX, OY, W * S, H * S);

    const selId = session.sel != null ? s.me.hand[session.sel] : null;
    if (selId && CARDS[selId] && CARDS[selId].type !== "sort") {
      ctx.fillStyle = "rgba(220,30,30,0.22)";
      const alive = princessAliveIn(s);
      for (let gx = 0; gx < W; gx++) for (let gy = 0; gy < H; gy++) {
        const [wx, wy] = toWorld(OX + (gx + 0.5) * S, OY + (gy + 0.5) * S);
        if (!Game.zoneOk(me, wx, wy, alive)) ctx.fillRect(OX + gx * S, OY + gy * S, S + 0.5, S + 0.5);
      }
    }

    const ents = interpEnts(s).slice().sort((a, b) => (a.f - b.f) || (T(a.x, a.y)[1] - T(b.x, b.y)[1]));
    for (const e of ents) {
      const [x, y0] = T(e.x, e.y), mine = e.o === me, rad = e.r * S;
      if (e.t) {
        ctx.fillStyle = mine ? "#1e3a8a" : "#7f1d1d";
        ctx.beginPath(); ctx.arc(x, y0, rad, 0, 7); ctx.fill();
        ctx.fillStyle = mine ? "#3b82f6" : "#ef4444";
        ctx.beginPath(); ctx.arc(x, y0, rad * 0.8, 0, 7); ctx.fill();
        emoji(e.c === "king" ? "👑" : "🏰", x, y0, rad * 1.1);
        if (e.c === "king" && !e.a) emoji("💤", x + rad * 0.7, y0 - rad * 0.7, rad * 0.5);
        if (e.fl) { ctx.fillStyle = "#fff6"; ctx.beginPath(); ctx.arc(x, y0, rad, 0, 7); ctx.fill(); }
        hpBar(x, y0 - rad - 9, rad * 1.8, e.h / e.m, mine);
        ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.max(9, S * 0.45)}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(e.h, x, y0 + rad + S * 0.45);
        continue;
      }
      const y = e.f ? y0 - S * 0.5 : y0, rr = Math.max(rad, S * 0.32), alpha = e.d ? 0.5 : 1;
      ctx.fillStyle = "#0003"; ctx.beginPath(); ctx.ellipse(x, y0 + rr * 0.6, rr, rr * 0.4, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = mine ? "#3b82f6" : "#ef4444";
      ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      const im = IMG[e.c];
      if (im && im.complete && im.naturalWidth) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, rr * 0.85, 0, 7); ctx.clip();
        ctx.drawImage(im, x - rr * 0.85, y - rr * 0.85, rr * 1.7, rr * 1.7); ctx.restore();
      } else if (CARDS[e.c]) emoji(CARDS[e.c].emoji, x, y, rr * 1.4, alpha);
      ctx.globalAlpha = 1;
      if (e.fl) { ctx.fillStyle = "#fff7"; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); }
      if (e.h < e.m) hpBar(x, y - rr - 7, Math.max(S * 0.9, rr * 2), e.h / e.m, mine);
    }

    for (const p of s.p) {
      const [x, y] = T(p.x, p.y);
      const pc = CARDS[p.k];
      if (pc && IMG[p.k] && IMG[p.k].complete && IMG[p.k].naturalWidth) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, S * 0.6, 0, 7); ctx.clip(); ctx.drawImage(IMG[p.k], x - S * 0.6, y - S * 0.6, S * 1.2, S * 1.2); ctx.restore();
      } else if (pc) emoji(pc.emoji, x, y, S * 1.3);
      else { ctx.fillStyle = p.k === "orb" ? "#c084fc" : "#3f2a14"; ctx.beginPath(); ctx.arc(x, y, p.k === "orb" ? S * 0.22 : S * 0.12, 0, 7); ctx.fill(); }
    }
    for (const f of s.fx) {
      const [x, y] = T(f.x, f.y);
      const col = { spell: "255,140,0", splash: "230,200,255", boom: "255,90,0", poof: "255,255,255" }[f.k] || "255,255,255";
      ctx.fillStyle = `rgba(${col},${0.45 * f.a})`;
      ctx.beginPath(); ctx.arc(x, y, f.r * S * (f.k === "boom" ? 1.6 - f.a * 0.6 : 1), 0, 7); ctx.fill();
    }

    updateHud(s);
  }

  // ---------- HUD ----------
  function updateHud(s) {
    const m = Math.floor(s.tl / 60), sec = String(s.tl % 60).padStart(2, "0");
    const tm = $("#timer");
    tm.textContent = (s.ot ? "⏱️ PROLONG. " : "") + `${m}:${sec}` + (s.dbl ? " ×2" : "");
    tm.classList.toggle("dbl", s.dbl);
    const me = session.me;
    $("#crowns").textContent = `🔵 ${s.cr[me]} – ${s.cr[1 - me]} 🔴`;
    $("#elixirFill").style.width = `${s.me.el * 10}%`;
    $("#elixirNum").textContent = Math.floor(s.me.el);

    const key = s.me.hand.join(",") + "|" + s.me.next;
    if (key !== session.handKey) {
      session.handKey = key;
      const hand = $("#hand");
      hand.innerHTML = "";
      s.me.hand.forEach((id, i) => {
        const c = CARDS[id], el = document.createElement("div");
        el.className = "card";
        el.innerHTML = cardHtml(c);
        el.onclick = () => { session.sel = session.sel === i ? null : i; };
        hand.appendChild(el);
      });
      $("#next").innerHTML = s.me.next ? `Suivante<div class="pic">${picHtml(s.me.next)}</div>` : "";
    }
    [...$("#hand").children].forEach((el, i) => {
      el.classList.toggle("sel", session.sel === i);
      el.classList.toggle("poor", CARDS[s.me.hand[i]].cout > s.me.el);
    });

    if (s.over && $("#endOverlay").classList.contains("hidden")) {
      $("#endTitle").textContent = s.w === me ? "Victoire ! 🏆" : s.w === -1 ? "Égalité 🤝" : "Défaite… 💀";
      $("#endScore").textContent = `${s.names[me]}  ${s.cr[me]} 👑 – 👑 ${s.cr[1 - me]}  ${s.names[1 - me]}`;
      $("#endOverlay").classList.remove("hidden");
    }
  }

  let toastTimer;
  function toast(t) {
    const el = $("#toast"); el.textContent = t; el.classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), 1200);
  }

  cv.addEventListener("pointerdown", (ev) => {
    const s = currentSnap();
    if (!s || s.over || session.sel == null) return;
    const r = cv.getBoundingClientRect();
    const [x, y] = toWorld(ev.clientX - r.left, ev.clientY - r.top);
    const i = session.sel, card = CARDS[s.me.hand[i]];
    if (card.cout > s.me.el) return toast("Pas assez d'élixir !");
    if (!placementOk(s, card, x, y)) return toast("Pose ta troupe dans ton camp");
    if (session.mode === "guest") session.conn.send({ t: "play", i, x, y });
    else session.game.play(0, i, x, y);
    session.sel = null;
  });
})();
