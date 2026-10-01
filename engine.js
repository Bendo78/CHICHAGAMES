// Moteur du jeu : simulation de l'arène (aucun affichage ici).
(function (root) {
  const W = 18, H = 32, RIVER = 16, BRIDGES = [3.5, 14.5];

  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function normCard(c) {
    return Object.assign({ type: "troupe", nombre: 1, cible: "sol", volant: false, zone: 0, taille: 0.5,
      portee: 0.8, vitesse: 1, cadence: 1, pv: 500, degats: 100, degatsTour: 0.4, rayon: 2 }, c);
  }

  class Game {
    constructor(cards, decks, names) {
      this.cards = {};
      cards.forEach((c) => (this.cards[c.id] = normCard(c)));
      this.duration = 180; this.t = 0; this.overtime = false;
      this.ents = []; this.proj = []; this.fx = []; this.nid = 1;
      this.over = false; this.winner = null; // 0, 1 ou -1 (égalité)
      this.names = names;
      this.players = [0, 1].map((p) => {
        const q = shuffle(decks[p].filter((id) => this.cards[id]).slice(0, 8));
        return { elixir: 5, hand: q.splice(0, 4), queue: q, crowns: 0 };
      });
      for (const p of [0, 1]) {
        this.add({ type: "tower", kind: "king", owner: p, x: 9, y: p === 0 ? 29.5 : 2.5, hp: 2600, r: 1.6, portee: 7, degats: 55, cadence: 1, active: false });
        for (const x of [3.5, 14.5])
          this.add({ type: "tower", kind: "princess", owner: p, x, y: p === 0 ? 25.5 : 6.5, hp: 1500, r: 1.2, portee: 7.5, degats: 50, cadence: 0.8, active: true, side: x < 9 ? "L" : "R" });
      }
    }

    add(o) { o.id = this.nid++; o.maxHp = o.hp; o.cd = 0; o.deploy = o.deploy || 0; o.volant = !!o.volant; o.flash = 0; this.ents.push(o); return o; }
    byId(id) { return id ? this.ents.find((e) => e.id === id) : null; }
    get timeLeft() { return this.overtime ? Math.max(0, this.duration + 60 - this.t) : Math.max(0, this.duration - this.t); }
    get double() { return this.overtime || this.timeLeft <= 60; }

    // ---------- Pose des cartes ----------
    static zoneOk(p, x, y, princessAlive) {
      if (Math.abs(y - RIVER) < 1) return false;
      if (p === 0 ? y >= RIVER + 1 : y <= RIVER - 1) return true;
      // Poche dans le camp adverse si une tour princesse est tombée
      for (const side of ["L", "R"]) {
        if (!princessAlive(1 - p, side)) {
          const inX = side === "L" ? x < 9 : x > 9;
          const inY = p === 0 ? y >= 10 : y <= 22;
          if (inX && inY) return true;
        }
      }
      return false;
    }
    canPlace(p, card, x, y) {
      if (x < 0.5 || x > W - 0.5 || y < 0.5 || y > H - 0.5) return false;
      if (card.type === "sort") return true;
      for (const e of this.ents) if (e.type === "tower" && Math.hypot(e.x - x, e.y - y) < e.r + 0.3) return false;
      return Game.zoneOk(p, x, y, (o, side) => this.ents.some((e) => e.kind === "princess" && e.owner === o && e.side === side && e.hp > 0));
    }
    play(p, i, x, y) {
      if (this.over || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      const pl = this.players[p], id = pl.hand[i], card = this.cards[id];
      if (!card || pl.elixir < card.cout || !this.canPlace(p, card, x, y)) return false;
      pl.elixir -= card.cout;
      pl.hand[i] = pl.queue.shift(); pl.queue.push(id);
      if (card.type === "sort") {
        const king = this.ents.find((e) => e.kind === "king" && e.owner === p);
        this.proj.push({ x: king ? king.x : 9, y: king ? king.y : p === 0 ? 30 : 2, tx: x, ty: y, speed: 13, spell: id, owner: p });
      } else {
        const n = card.nombre;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + 0.6, rr = n === 1 ? 0 : 0.45 + 0.08 * n;
          this.add({ type: "unit", card: id, owner: p, x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, hp: card.pv, r: card.taille,
            portee: card.portee, degats: card.degats, cadence: card.cadence, vitesse: card.vitesse, cible: card.cible,
            volant: card.volant, zone: card.zone, sight: 5.5, deploy: 1 });
        }
      }
      return true;
    }

    // ---------- Boucle de simulation ----------
    update(dt) {
      if (this.over) return;
      this.t += dt;
      const rate = (this.double ? 2 : 1) / 2.8;
      for (const pl of this.players) pl.elixir = Math.min(10, pl.elixir + rate * dt);
      for (const e of this.ents) {
        if (e.flash > 0) e.flash -= dt;
        if (e.hp <= 0) continue;
        if (e.deploy > 0) { e.deploy -= dt; continue; }
        e.cd = Math.max(0, e.cd - dt);
        if (e.type === "tower") this.towerAI(e); else this.unitAI(e, dt);
      }
      this.updateProj(dt);
      this.separate();
      for (const f of this.fx) f.ttl -= dt;
      this.fx = this.fx.filter((f) => f.ttl > 0);
      this.cleanup();
      this.checkTime();
    }

    canTarget(e, o) {
      if (!o || o.hp <= 0 || o.owner === e.owner) return false;
      if (e.type === "tower") return o.type === "unit";
      return Game.filter(e.cible, o);
    }
    static filter(cible, o) {
      if (cible === "batiments") return o.type === "tower";
      if (o.volant && cible !== "tout") return false;
      return true;
    }
    nearest(e, ok) {
      let best = null, bd = Infinity;
      for (const o of this.ents) { if (!ok(o)) continue; const d = dist(e, o) - o.r; if (d < bd) { bd = d; best = o; } }
      return best;
    }

    towerAI(t) {
      if (!t.active) return;
      let tg = this.byId(t.targetId);
      if (!this.canTarget(t, tg) || dist(t, tg) - tg.r > t.portee)
        tg = this.nearest(t, (o) => this.canTarget(t, o) && dist(t, o) - o.r <= t.portee);
      t.targetId = tg ? tg.id : null;
      if (tg && t.cd <= 0) { this.shoot(t, tg); t.cd = t.cadence; }
    }

    unitAI(e, dt) {
      let tg = this.byId(e.targetId);
      if (!this.canTarget(e, tg)) { tg = null; e.locked = false; }
      if (!e.locked) {
        let cand = null;
        if (e.cible !== "batiments") cand = this.nearest(e, (o) => o.type === "unit" && this.canTarget(e, o) && dist(e, o) - o.r <= e.sight);
        if (!cand) cand = this.nearest(e, (o) => o.type === "tower" && this.canTarget(e, o));
        tg = cand;
      }
      e.targetId = tg ? tg.id : null;
      if (!tg) return;
      const gap = dist(e, tg) - tg.r - e.r;
      if (gap <= e.portee) {
        if (!e.locked) { e.locked = true; e.cd = Math.max(e.cd, e.cadence * 0.4); }
        if (e.cd <= 0) { this.attack(e, tg); e.cd = e.cadence; }
      } else { e.locked = false; this.moveToward(e, tg, dt); }
    }

    moveToward(e, tg, dt) {
      let tx = tg.x, ty = tg.y;
      if (!e.volant) {
        const s = e.y >= RIVER ? 1 : -1, ts = ty >= RIVER ? 1 : -1;
        if (s !== ts) { // il faut traverser la rivière par un pont
          const b = BRIDGES.reduce((best, bx) => (Math.abs(e.x - bx) + Math.abs(tx - bx) < Math.abs(e.x - best) + Math.abs(tx - best) ? bx : best));
          if (Math.abs(e.x - b) > 0.35) { tx = b; ty = RIVER + s * 1.2; } else { tx = b; ty = RIVER - s * 1.5; }
        }
      }
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, step = Math.min(d, e.vitesse * dt);
      e.x += (dx / d) * step; e.y += (dy / d) * step;
    }

    attack(e, tg) {
      if (e.portee >= 2) this.shoot(e, tg);
      else this.hitArea({ dmg: e.degats, zone: e.zone, owner: e.owner, cible: e.cible }, tg.x, tg.y, tg);
    }
    shoot(e, tg) {
      const tower = e.type === "tower";
      this.proj.push({ x: e.x, y: e.y, tid: tg.id, tx: tg.x, ty: tg.y, speed: tower ? 14 : 11, dmg: e.degats, zone: tower ? 0 : e.zone,
        owner: e.owner, cible: tower ? "tout" : e.cible, k: !tower && e.zone ? "orb" : "arrow" });
    }
    hitArea(src, x, y, tg) {
      if (src.zone > 0) {
        for (const o of this.ents)
          if (o.owner !== src.owner && o.hp > 0 && Game.filter(src.cible, o) && Math.hypot(o.x - x, o.y - y) <= src.zone + o.r) this.damage(o, src.dmg);
        this.fx.push({ x, y, r: src.zone, ttl: 0.3, max: 0.3, k: "splash" });
      } else if (tg && tg.hp > 0) this.damage(tg, src.dmg);
    }
    damage(o, amt) {
      o.hp -= amt; o.flash = 0.12;
      if (o.kind === "king" && !o.active) o.active = true;
    }

    updateProj(dt) {
      for (const p of this.proj) {
        const t = this.byId(p.tid);
        if (t && t.hp > 0) { p.tx = t.x; p.ty = t.y; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
        if (d <= step) {
          p.done = true;
          if (p.spell) this.castSpell(p); else this.hitArea(p, p.tx, p.ty, t && t.hp > 0 ? t : null);
        } else { p.x += (dx / d) * step; p.y += (dy / d) * step; }
      }
      this.proj = this.proj.filter((p) => !p.done);
    }
    castSpell(p) {
      const c = this.cards[p.spell];
      for (const o of this.ents)
        if (o.owner !== p.owner && o.hp > 0 && Math.hypot(o.x - p.tx, o.y - p.ty) <= c.rayon + o.r)
          this.damage(o, o.type === "tower" ? c.degats * c.degatsTour : c.degats);
      this.fx.push({ x: p.tx, y: p.ty, r: c.rayon, ttl: 0.6, max: 0.6, k: "spell" });
    }

    separate() {
      const u = this.ents.filter((e) => e.hp > 0);
      for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) {
        const a = u[i], b = u[j];
        if (a.volant !== b.volant) continue;
        const ta = a.type === "tower", tb = b.type === "tower";
        if (ta && tb) continue;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d >= min) continue;
        if (d < 1e-4) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
        const push = (min - d) * 0.6, nx = dx / d, ny = dy / d;
        if (ta) { b.x += nx * push; b.y += ny * push; }
        else if (tb) { a.x -= nx * push; a.y -= ny * push; }
        else {
          const tot = a.maxHp + b.maxHp, fa = b.maxHp / tot, fb = a.maxHp / tot;
          a.x -= nx * push * fa; a.y -= ny * push * fa; b.x += nx * push * fb; b.y += ny * push * fb;
        }
      }
      for (const e of u) {
        if (e.type === "tower") continue;
        e.x = Math.max(0.4, Math.min(W - 0.4, e.x)); e.y = Math.max(0.4, Math.min(H - 0.4, e.y));
        if (!e.volant && Math.abs(e.y - RIVER) < 1 && !BRIDGES.some((b) => Math.abs(e.x - b) < 1)) e.y = RIVER + (e.y >= RIVER ? 1 : -1);
      }
    }

    cleanup() {
      for (const e of this.ents) {
        if (e.hp > 0 || e.dead) continue;
        e.dead = true;
        if (e.type === "tower") {
          const other = 1 - e.owner;
          this.fx.push({ x: e.x, y: e.y, r: 2.5, ttl: 0.9, max: 0.9, k: "boom" });
          if (e.kind === "king") { this.players[other].crowns = 3; this.end(other); }
          else {
            this.players[other].crowns = Math.min(3, this.players[other].crowns + 1);
            const k = this.ents.find((t) => t.kind === "king" && t.owner === e.owner);
            if (k) k.active = true;
            if (this.overtime) this.end(other); // mort subite
          }
        } else this.fx.push({ x: e.x, y: e.y, r: 0.6, ttl: 0.4, max: 0.4, k: "poof" });
      }
      this.ents = this.ents.filter((e) => !e.dead);
    }

    checkTime() {
      if (this.over) return;
      const [a, b] = this.players.map((p) => p.crowns);
      if (!this.overtime && this.t >= this.duration) {
        if (a !== b) this.end(a > b ? 0 : 1); else this.overtime = true;
      } else if (this.overtime && this.t >= this.duration + 60) {
        if (a !== b) return this.end(a > b ? 0 : 1);
        const low = (p) => Math.min(...this.ents.filter((e) => e.type === "tower" && e.owner === p).map((e) => e.hp / e.maxHp));
        const l0 = low(0), l1 = low(1);
        this.end(Math.abs(l0 - l1) < 0.001 ? -1 : l0 > l1 ? 0 : 1);
      }
    }
    end(w) { if (!this.over) { this.over = true; this.winner = w; } }

    // État envoyé à l'affichage (et au pote en ligne)
    snapshot(me) {
      const pl = this.players[me], r2 = (v) => Math.round(v * 100) / 100;
      return {
        tl: Math.ceil(this.timeLeft), ot: this.overtime, dbl: this.double,
        e: this.ents.map((e) => ({ i: e.id, o: e.owner, c: e.type === "tower" ? e.kind : e.card, x: r2(e.x), y: r2(e.y),
          h: Math.max(0, Math.round(e.hp)), m: e.maxHp, r: e.r, t: e.type === "tower" ? 1 : 0, f: e.volant ? 1 : 0,
          d: e.deploy > 0 ? 1 : 0, a: e.active ? 1 : 0, s: e.side || "", fl: e.flash > 0 ? 1 : 0 })),
        p: this.proj.map((p) => ({ x: r2(p.x), y: r2(p.y), k: p.spell || p.k })),
        fx: this.fx.map((f) => ({ x: r2(f.x), y: r2(f.y), r: f.r, a: r2(f.ttl / f.max), k: f.k })),
        me: { el: pl.elixir, hand: pl.hand.slice(), next: pl.queue[0] },
        cr: [this.players[0].crowns, this.players[1].crowns], names: this.names, over: this.over, w: this.winner,
      };
    }
  }

  // ---------- Bot d'entraînement ----------
  class Bot {
    constructor(game, p) { this.g = game; this.p = p; this.timer = 2; this.threshold = 7; }
    update(dt) {
      const g = this.g, me = this.p, enemy = 1 - me;
      if (g.over) return;
      this.timer -= dt; if (this.timer > 0) return;
      this.timer = 0.5 + Math.random() * 0.6;
      const pl = g.players[me];
      const hand = pl.hand.map((id, i) => ({ id, i, c: g.cards[id] })).filter((h) => h.c.cout <= pl.elixir);
      if (!hand.length) return;
      const enemies = g.ents.filter((e) => e.type === "unit" && e.owner === enemy);
      const mySide = (y) => (me === 1 ? y < RIVER : y > RIVER);

      for (const h of hand.filter((h) => h.c.type === "sort")) {
        for (const e of enemies) {
          const hit = enemies.filter((o) => Math.hypot(o.x - e.x, o.y - e.y) <= h.c.rayon);
          const value = hit.reduce((s, o) => s + Math.min(o.hp, h.c.degats), 0);
          if (hit.length >= 3 || value >= h.c.cout * 300) if (g.play(me, h.i, e.x, e.y)) return;
        }
      }
      const troops = hand.filter((h) => h.c.type !== "sort");
      if (!troops.length) return;
      const pick = troops[Math.floor(Math.random() * troops.length)];
      const threats = enemies.filter((e) => mySide(e.y));
      if (threats.length) {
        const t = threats.reduce((a, b) => (me === 1 ? (b.y < a.y ? b : a) : (b.y > a.y ? b : a)));
        const y = me === 1 ? Math.max(1, Math.min(t.y - 2.5, RIVER - 1.5)) : Math.min(H - 1, Math.max(t.y + 2.5, RIVER + 1.5));
        this.tryPlace(pick, t.x, y);
      } else if (pl.elixir >= this.threshold) {
        const bx = BRIDGES[Math.floor(Math.random() * 2)];
        const y = me === 1 ? (pick.c.cible === "batiments" ? 13.5 : 9 + Math.random() * 3) : (pick.c.cible === "batiments" ? 18.5 : 20 + Math.random() * 3);
        if (this.tryPlace(pick, bx, y)) this.threshold = 6 + Math.random() * 4;
      }
    }
    tryPlace(h, x, y) {
      for (let k = 0; k < 6; k++) {
        const jx = Math.max(1, Math.min(W - 1, x + (Math.random() - 0.5) * k)), jy = y + (Math.random() - 0.5) * k * 0.5;
        if (this.g.play(this.p, h.i, jx, jy)) return true;
      }
      return false;
    }
  }

  // ---------- Cartes créées par les joueurs ----------
  // Limites des curseurs [min, max, pas] — aussi revérifiées quand une carte arrive d'un pote
  const LIMITS = {
    pv: [50, 5000, 50], degats: [10, 1000, 10], cadence: [0.4, 3, 0.1], vitesse: [0.5, 2.5, 0.1],
    portee: [0.5, 7, 0.5], nombre: [1, 6, 1], zone: [0, 2.5, 0.5], taille: [0.3, 0.9, 0.05],
    sortDegats: [50, 1500, 50], rayon: [1, 5, 0.5],
  };
  const clampNum = (v, [a, b]) => { v = +v; if (!Number.isFinite(v)) v = a; return Math.min(b, Math.max(a, v)); };

  // Puissance d'une carte exprimée en élixir (calibrée sur les cartes de base)
  function rawCost(c) {
    if (c.type === "sort") return (c.degats * Math.pow(c.rayon, 0.8)) / 300;
    const ehp = c.pv * c.nombre, dps = (c.degats / c.cadence) * c.nombre * (1 + c.zone * 0.6);
    let v = Math.pow(ehp, 0.6) * Math.pow(dps, 0.4);
    v *= Math.sqrt(c.vitesse);
    if (c.portee >= 2) v *= 1 + (c.portee - 1) * 0.08;
    if (c.cible === "tout") v *= 1.15; else if (c.cible === "batiments") v *= 0.85;
    if (c.volant) v *= 1.15;
    v *= Math.pow(0.85, c.nombre - 1);
    return v / 170;
  }
  const costOf = (c) => Math.max(1, Math.min(10, Math.round(rawCost(c))));

  // Nettoie une carte (venant de l'éditeur, d'un code de partage ou d'un pote) et calcule son coût
  function makeCustomCard(raw) {
    if (!raw || typeof raw !== "object") return null;
    const s = (v, n) => String(v == null ? "" : v).slice(0, n).trim();
    const c = {
      id: /^p[a-z0-9]{4,16}$/.test(raw.id) ? raw.id : "p" + Math.random().toString(36).slice(2, 10),
      perso: true, nom: s(raw.nom, 28) || "Ma carte", emoji: s(raw.emoji, 8) || "⭐",
      description: s(raw.description, 80), type: raw.type === "sort" ? "sort" : "troupe",
    };
    if (typeof raw.image === "string" && raw.image.length < 60000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(raw.image)) c.image = raw.image;
    if (c.type === "sort") {
      c.degats = clampNum(raw.degats, LIMITS.sortDegats); c.rayon = clampNum(raw.rayon, LIMITS.rayon); c.degatsTour = 0.4;
    } else {
      for (const k of ["pv", "degats", "cadence", "vitesse", "portee", "nombre", "zone", "taille"]) c[k] = clampNum(raw[k], LIMITS[k]);
      c.nombre = Math.round(c.nombre);
      c.cible = ["sol", "tout", "batiments"].includes(raw.cible) ? raw.cible : "sol";
      c.volant = !!raw.volant;
    }
    c.puissance = rawCost(c);
    c.cout = costOf(c);
    c.tropForte = c.puissance > 10.5;
    return c;
  }

  root.ClashEngine = { Game, Bot, W, H, RIVER, BRIDGES, normCard, LIMITS, rawCost, makeCustomCard };
})(typeof window !== "undefined" ? window : globalThis);
