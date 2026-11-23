// DOM-Oberfläche: Menüs, HUD, Inventar, Dokumente, Tastenfeld, Kameramodus.
import { settings, saveSettings, IS_TOUCH } from './config.js';
import { NOTES } from './story.js';

const $ = (s) => document.querySelector(s);

const ICONS = {
  flashlight: '<svg viewBox="0 0 24 24"><path d="M7 2h10l-1 6H8L7 2zm1 7h8v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9z" fill="#d8cfb8"/><circle cx="12" cy="5" r="1.6" fill="#fff6c8"/></svg>',
  battery: '<svg viewBox="0 0 24 24"><rect x="8" y="4" width="8" height="17" rx="1.5" fill="#c7a63a"/><rect x="10" y="2" width="4" height="2" fill="#bbb"/><rect x="8" y="10" width="8" height="4" fill="#222"/></svg>',
  medkit: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2" fill="#ddd"/><rect x="10.5" y="8.5" width="3" height="8" fill="#b11"/><rect x="8" y="11" width="8" height="3" fill="#b11"/><rect x="9" y="3.5" width="6" height="3" rx="1" fill="none" stroke="#ddd" stroke-width="1.5"/></svg>',
  bottle: '<svg viewBox="0 0 24 24"><path d="M10 2h4v5l2 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3z" fill="#3d7a35" opacity=".9"/></svg>',
  staff_key: '<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="4" fill="none" stroke="#c98a3a" stroke-width="2"/><path d="M11 12h10v3h-2v-2h-2v2h-2v-3" fill="#c98a3a" stroke="#c98a3a"/></svg>',
  basement_key: '<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="4" fill="none" stroke="#aab" stroke-width="2"/><path d="M11 12h10v3h-2v-2h-2v2h-2v-3" fill="#aab" stroke="#aab"/></svg>',
  fuse: '<svg viewBox="0 0 24 24"><rect x="6" y="8" width="12" height="8" rx="2" fill="#e8e4d8"/><rect x="2" y="9" width="4" height="6" fill="#b87333"/><rect x="18" y="9" width="4" height="6" fill="#b87333"/></svg>',
  revolver: '<svg viewBox="0 0 24 24"><path d="M3 8h13l1-2h3v3h-2l-1 2h-3l-1 1 1 5-1 1H9l1-6H3z" fill="#9a9aa0"/><circle cx="13" cy="10" r="2.2" fill="#555"/></svg>',
  cross: '<svg viewBox="0 0 24 24"><path d="M10.5 2h3v6h5v3h-5v11h-3V11h-5V8h5z" fill="#d8b04a"/><circle cx="12" cy="9.5" r="7.5" fill="none" stroke="#8a6a22" stroke-width="1" stroke-dasharray="1 2"/></svg>',
  ammo: '<svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="10" fill="#8a5a32"/><rect x="6" y="4" width="3" height="6" rx="1.5" fill="#d8b04a"/><rect x="10.5" y="4" width="3" height="6" rx="1.5" fill="#d8b04a"/><rect x="15" y="4" width="3" height="6" rx="1.5" fill="#d8b04a"/></svg>',
  code: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" fill="#d6ccb2"/><text x="12" y="15" font-size="7" text-anchor="middle" fill="#7a1010" font-family="monospace">####</text></svg>',
};

const ITEM_INFO = {
  flashlight: ['Taschenlampe', 'Eine schwere Stabtaschenlampe. [F] ein/aus. Licht macht dich sichtbar.'],
  battery: ['Batterie', 'Monozelle. [R] um die Batterie der Taschenlampe zu wechseln.'],
  medkit: ['Verbandskasten', 'Stellt 50 Lebenspunkte wieder her. [H] benutzen.'],
  bottle: ['Glasflasche', '[G] werfen – das Klirren lockt es an einen anderen Ort.'],
  staff_key: ['Personalschlüssel', 'Öffnet die Sicherheitstür zum Personaltrakt (Westflügel).'],
  basement_key: ['Kellerschlüssel', 'Öffnet die Tür zum Treppenhaus in den Keller (Ostende des Hauptflurs).'],
  fuse: ['Sicherung NH-63', 'Für den Sicherungskasten des Notstromaggregats im Keller.'],
  code: ['Code (notiert)', ''],
  revolver: ['Revolver', 'Vollversion. [Klick] oder [V] schießen. Ein Treffer betäubt das Monster und treibt es in die Flucht.'],
  cross: ['Kreuzkette', 'Vollversion. [Q]: 12 Sekunden lang kann es dich nicht angreifen. Danach 2 Minuten Ruhe.'],
};

export class UI {
  constructor(game) {
    this.game = game;
    this.screens = {};
    document.querySelectorAll('.screen').forEach((el) => (this.screens[el.id.replace('screen-', '')] = el));
    this.hud = $('#hud');
    this.promptEl = $('#prompt');
    this.objEl = $('#objective-text');
    this.objWrap = $('#objective');
    this.toastsEl = $('#toasts');
    this.touchEl = $('#touch-ui');
    this.monitorEl = $('#monitor-ui');
    this.fadeEl = $('#fade');
    this.fpsEl = $('#fps');
    this.back = null;
    this.invTab = 'items';
    this.invSel = null;
    this.lastPrompt = null;
    if (IS_TOUCH) {
      document.body.classList.add('touch');
      // Tastenkürzel-Hinweise auf Touch-Geräten ausblenden
      document.querySelectorAll('.btn').forEach((b) => (b.textContent = b.textContent.replace(/\s*\[.*?\]/, '')));
    }
    this.bind();
    this.syncSettings();
  }

  // ---------------------------------------------------------------- Bildschirme
  show(name) {
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('hidden', k !== name);
    this.current = name;
    document.body.classList.toggle('overlay-open', !!name);
    const first = name && this.screens[name] && this.screens[name].querySelector('.btn:not(:disabled)');
    if (first && !IS_TOUCH) setTimeout(() => first.focus({ preventScroll: true }), 30);
  }
  hideAll() {
    this.show(null);
  }
  setHud(on) {
    this.hud.classList.toggle('hidden', !on);
    const touch = on && (IS_TOUCH || this.game.input.usingTouch);
    this.touchEl.classList.toggle('hidden', !touch);
    document.body.classList.toggle('playing', on);
  }
  setLoading(p, text) {
    $('#load-fill').style.width = Math.round(p * 100) + '%';
    if (text) $('#load-text').textContent = text;
  }
  fade(to, white = false, ms = 800) {
    this.fadeEl.classList.toggle('white', white);
    this.fadeEl.style.transition = `opacity ${ms}ms`;
    this.fadeEl.style.opacity = to;
  }

  bind() {
    const g = this.game;
    const on = (id, fn) => $(id).addEventListener('click', (e) => {
      e.preventDefault();
      g.audio.init();
      fn();
    });
    on('#btn-new', () => g.newGame());
    on('#btn-continue', () => g.continueGame());
    on('#btn-settings', () => this.openSub('settings', 'menu'));
    on('#btn-controls', () => this.openSub('controls', 'menu'));
    on('#btn-credits', () => this.openSub('credits', 'menu'));
    on('#btn-intro', () => g.startPlaying());
    on('#btn-resume', () => g.resume());
    on('#btn-pause-inv', () => g.openInventory());
    on('#btn-pause-settings', () => this.openSub('settings', 'pause'));
    on('#btn-pause-controls', () => this.openSub('controls', 'pause'));
    on('#btn-pause-checkpoint', () => g.loadCheckpoint());
    on('#btn-pause-menu', () => g.toMenu());
    on('#btn-settings-back', () => this.closeSub());
    on('#btn-controls-back', () => this.closeSub());
    on('#btn-credits-back', () => this.closeSub());
    on('#btn-inv-close', () => g.closeOverlay());
    on('#btn-note-close', () => g.closeOverlay());
    on('#btn-kp-close', () => g.closeOverlay());
    on('#btn-retry', () => g.loadCheckpoint());
    on('#btn-dead-menu', () => g.toMenu());
    on('#btn-end-menu', () => g.toMenu());
    on('#btn-shop', () => this.openShop('menu'));
    on('#btn-pause-shop', () => this.openShop('pause'));
    on('#btn-shop-back', () => this.closeSub());
    on('#btn-buy', () => g.account.buy(document.getElementById('shop-consent').checked));
    document.querySelectorAll('.acc-signout').forEach((b) => b.addEventListener('click', () => g.account.signOut()));
    document.getElementById('shop-consent').addEventListener('change', () => {
      g.account.message = '';
      this.refreshAccount();
    });
    on('#cam-prev', () => g.cycleCam(-1));
    on('#cam-next', () => g.cycleCam(1));
    on('#cam-exit', () => g.exitMonitors());

    document.querySelectorAll('.tab').forEach((t) =>
      t.addEventListener('click', () => {
        this.invTab = t.dataset.tab;
        this.invSel = null;
        this.refreshInventory();
      }),
    );

    // Tastenfeld
    document.querySelectorAll('.kp-grid button').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault();
        this.kpPress(b.dataset.k);
      }),
    );
    window.addEventListener('keydown', (e) => {
      if (this.current === 'keypad') {
        if (/^Digit\d$/.test(e.code) || /^Numpad\d$/.test(e.code)) this.kpPress(e.code.slice(-1));
        else if (e.code === 'Backspace') this.kpPress('C');
        else if (e.code === 'Enter' || e.code === 'NumpadEnter') this.kpPress('OK');
      }
    });

    // Einstellungen
    const bindRange = (id, key, fn) => {
      const el = $(id);
      el.addEventListener('input', () => {
        settings[key] = parseFloat(el.value);
        saveSettings();
        fn && fn();
      });
    };
    bindRange('#set-brightness', 'brightness', () => g.applySettings());
    bindRange('#set-volume', 'volume', () => g.applySettings());
    bindRange('#set-music', 'music', () => g.applySettings());
    bindRange('#set-sens', 'sensitivity');
    bindRange('#set-tsens', 'touchSensitivity');
    bindRange('#set-fov', 'fov', () => g.applySettings());
    const bindCheck = (id, key, fn) => {
      const el = $(id);
      el.addEventListener('change', () => {
        settings[key] = el.checked;
        saveSettings();
        fn && fn();
      });
    };
    bindCheck('#set-invert', 'invertY');
    bindCheck('#set-bob', 'headBob');
    bindCheck('#set-fps', 'showFps', () => (this.fpsEl.textContent = ''));
    $('#set-quality').addEventListener('change', (e) => {
      settings.quality = e.target.value;
      saveSettings();
      g.applyQuality();
    });
  }

  syncSettings() {
    $('#set-brightness').value = settings.brightness;
    $('#set-volume').value = settings.volume;
    $('#set-music').value = settings.music;
    $('#set-sens').value = settings.sensitivity;
    $('#set-tsens').value = settings.touchSensitivity;
    $('#set-fov').value = settings.fov;
    $('#set-quality').value = settings.quality;
    $('#set-invert').checked = settings.invertY;
    $('#set-bob').checked = settings.headBob;
    $('#set-fps').checked = settings.showFps;
  }

  openSub(name, back) {
    this.back = back;
    this.syncSettings();
    this.show(name);
  }
  closeSub() {
    this.show(this.back || 'menu');
  }

  setContinue(enabled) {
    $('#btn-continue').disabled = !enabled;
  }

  // ---------------------------------------------------------------- Konto & Shop
  openShop(back) {
    this.back = back;
    this.show('shop');
    this.refreshAccount();
  }

  refreshAccount() {
    const g = this.game;
    const a = g.account;
    if (!a) return;
    document.body.classList.toggle('premium', !!g.premium);
    const bar = document.getElementById('account-bar-menu');
    bar.classList.toggle('show', !!a.user);
    bar.classList.toggle('premium', !!g.premium);
    bar.querySelector('.acc-name').textContent = a.user ? a.user.name || a.user.email : '';
    const price = a.priceLabel;
    document.getElementById('shop-price').textContent = price;
    const sb = document.getElementById('btn-shop');
    sb.textContent = g.premium ? '✝ Vollversion aktiv' : `✝ Vollversion · ${price.replace(',00', '')}`;
    document.getElementById('shop-user').innerHTML = a.user
      ? `Angemeldet als <b>${escapeHtml(a.user.email || a.user.name || '')}</b> · <button class="link-btn acc-signout2">Abmelden</button>`
      : 'Melde dich an, damit dein Kauf an dein Konto gebunden ist und auf allen Geräten gilt.';
    const so = document.querySelector('.acc-signout2');
    if (so) so.addEventListener('click', () => a.signOut());
    const gsi = document.getElementById('gsi-shop');
    gsi.style.display = a.user && a.idToken ? 'none' : 'block';
    const nl = document.getElementById('shop-nologin');
    nl.textContent = !a.config ? 'Verbinde …' : !a.config.googleClientId ? 'Die Anmeldung ist im Moment nicht verfügbar.' : a.user && !a.idToken ? 'Bitte erneut anmelden, um zu kaufen.' : '';
    document.getElementById('shop-step-buy').classList.toggle('disabled', !(a.user && a.idToken) || !a.available || g.premium);
    document.getElementById('shop-step-login').classList.toggle('hidden', !!g.premium);
    document.getElementById('shop-step-buy').classList.toggle('hidden', !!g.premium);
    document.getElementById('shop-owned').classList.toggle('hidden', !g.premium);
    let msg = a.message || '';
    if (!msg && a.config && !a.available) msg = 'Der Kauf ist im Moment nicht verfügbar.';
    document.getElementById('shop-msg').textContent = msg;
    a.renderButtons();
    if (a.justReturned && this.current === 'menu') {
      a.justReturned = null;
      this.openShop('menu');
    }
  }

  refreshAbilities() {
    this._abT = 0;
  }

  updateAbilities(g) {
    const show = g.premium && !!g.state.inv.revolver;
    const box = document.getElementById('abilities');
    box.classList.toggle('hidden', !show);
    if (!show) return;
    this._abT = (this._abT || 0) - 1;
    if (this._abT > 0) return;
    this._abT = 6;
    const inv = g.state.inv;
    const a = g.ab;
    const reloading = g.revolver && g.revolver.reloadT > 0;
    document.getElementById('ab-ammo').textContent = reloading ? 'lädt …' : `${inv.ammo} | ${inv.reserve}`;
    const tbA = document.getElementById('tb-ammo');
    if (tbA) tbA.textContent = reloading ? '…' : `${inv.ammo}/${inv.reserve}`;
    const setCd = (id, tid, valId, active, cd, total) => {
      const el = document.getElementById(id);
      el.classList.toggle('active', active > 0);
      document.getElementById(valId).textContent = active > 0 ? `${Math.ceil(active)} s` : cd > 0 ? `${Math.ceil(cd)} s` : 'bereit';
      el.querySelector('.cd').style.width = cd > 0 ? `${(1 - cd / total) * 100}%` : '100%';
      const tb = document.getElementById(tid);
      if (tb) {
        tb.classList.toggle('cooldown', cd > 0 && active <= 0);
        tb.classList.toggle('on', active > 0);
        tb.querySelector('.cd').style.width = cd > 0 ? `${(1 - cd / total) * 100}%` : '100%';
      }
    };
    setCd('ab-cross', 'tb-cross', 'ab-cross-val', a.crossT, a.crossCd, 120);
    setCd('ab-pray', 'tb-pray', 'ab-pray-val', a.prayT, a.prayCd, 60);
  }

  // ---------------------------------------------------------------- HUD
  setPrompt(text) {
    if (text === this.lastPrompt) return;
    this.lastPrompt = text;
    const el = this.promptEl;
    const ch = $('#crosshair');
    const ib = $('#tb-interact');
    if (!text) {
      el.classList.remove('show');
      ch.classList.remove('active');
      ib && ib.classList.remove('ready');
      return;
    }
    const actionable = text.startsWith('[E]');
    const label = actionable ? text.slice(3).trim() : text;
    const key = IS_TOUCH || this.game.input.usingTouch ? 'E' : 'E';
    el.innerHTML = actionable ? `<span class="key">${key}</span>${escapeHtml(label)}` : escapeHtml(label);
    el.classList.add('show');
    ch.classList.toggle('active', actionable);
    ib && ib.classList.toggle('ready', actionable);
  }

  setObjective(text, flash) {
    if (this.objEl.textContent === text) return;
    this.objEl.textContent = text;
    this.layoutStatus();
    if (flash) {
      this.objWrap.classList.remove('flash');
      void this.objWrap.offsetWidth;
      this.objWrap.classList.add('flash');
    }
  }

  layoutStatus() {
    if (!document.body.classList.contains('touch')) return;
    const st = document.getElementById('status');
    const r = this.objWrap.getBoundingClientRect();
    st.style.top = Math.round(r.bottom + 8) + 'px';
  }

  toast(msg, ms = 3200) {
    if (this.toastsEl.children.length > 3) this.toastsEl.firstChild.remove();
    const last = this.toastsEl.lastChild;
    if (last && last.textContent === msg) return;
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    this.toastsEl.appendChild(d);
    setTimeout(() => (d.style.opacity = 0), ms);
    setTimeout(() => d.remove(), ms + 600);
  }

  checkpointFlash() {
    const el = $('#checkpoint-flash');
    el.classList.add('show');
    clearTimeout(this._cp);
    this._cp = setTimeout(() => el.classList.remove('show'), 2200);
  }

  updateHud(player, inv, dt) {
    // Batterie
    const bat = $('#battery');
    const cells = bat.querySelectorAll('i');
    const n = Math.ceil(player.battery / 20);
    cells.forEach((c, i) => c.classList.toggle('on', i < n));
    bat.classList.toggle('low', player.battery < 22);
    bat.classList.toggle('off', !player.flashOn);
    bat.style.opacity = inv.flashlight ? 1 : 0;
    $('#bat-count').textContent = '×' + inv.batteries;
    // Leben / Ausdauer
    const h = $('#health');
    h.querySelector('i').style.width = player.health + '%';
    h.style.opacity = player.health < 99 ? 1 : 0.25;
    const st = $('#stamina');
    st.querySelector('i').style.width = player.stamina + '%';
    st.classList.toggle('exhausted', player.exhausted);
    st.style.opacity = player.stamina < 99 ? 1 : 0;
    // Touch-Buttons abhängig vom Inventar
    const tt = $('#tb-throw');
    if (tt) tt.style.display = inv.bottles > 0 ? 'flex' : 'none';
    const th = $('#tb-heal');
    if (th) th.style.display = inv.medkits > 0 && player.health < 100 ? 'flex' : 'none';
    const tr = $('#tb-reload');
    if (tr) tr.style.display = inv.batteries > 0 && player.battery < 70 ? 'flex' : 'none';
    const tc = $('#tb-crouch');
    if (tc) tc.classList.toggle('on', player.crouched);
    const tf = $('#tb-flash');
    if (tf) {
      tf.classList.toggle('on', player.flashOn);
      tf.style.display = inv.flashlight ? 'flex' : 'none';
    }
    // FPS
    if (settings.showFps) {
      this._fpsT = (this._fpsT || 0) + dt;
      this._fpsN = (this._fpsN || 0) + 1;
      if (this._fpsT > 0.5) {
        this.fpsEl.textContent = Math.round(this._fpsN / this._fpsT) + ' FPS';
        this._fpsT = 0;
        this._fpsN = 0;
      }
    }
  }

  hideKeyHint() {
    const k = $('#hint-keys');
    if (k) k.style.opacity = 0;
  }

  setHiding(on) {
    $('#hide-overlay').classList.toggle('show', on);
  }

  // ---------------------------------------------------------------- Inventar
  refreshInventory() {
    const g = this.game;
    const s = g.state;
    const inv = s.inv;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === this.invTab));
    $('#inv-items').classList.toggle('hidden', this.invTab !== 'items');
    $('#inv-docs').classList.toggle('hidden', this.invTab !== 'docs');
    const detail = $('#inv-detail');
    detail.innerHTML = '';
    if (this.invTab === 'items') {
      const items = [];
      if (inv.flashlight) items.push(['flashlight', 1]);
      if (inv.batteries) items.push(['battery', inv.batteries]);
      if (inv.medkits) items.push(['medkit', inv.medkits]);
      if (inv.bottles) items.push(['bottle', inv.bottles]);
      if (inv.staffKey) items.push(['staff_key', 1]);
      if (inv.basementKey) items.push(['basement_key', 1]);
      if (inv.fuses) items.push(['fuse', inv.fuses]);
      if (s.flags.codeKnown) items.push(['code', 1]);
      if (g.premium && inv.revolver) items.push(['revolver', (inv.ammo || 0) + (inv.reserve || 0)]);
      if (g.premium && inv.cross) items.push(['cross', 1]);
      const grid = $('#inv-items');
      grid.innerHTML = items.length ? '' : '<div class="empty">Deine Taschen sind leer.</div>';
      for (const [k, c] of items) {
        const el = document.createElement('div');
        el.className = 'slot' + (this.invSel === k ? ' sel' : '');
        el.innerHTML = `${ICONS[k]}<span>${ITEM_INFO[k][0]}</span>${c > 1 ? `<span class="count">×${c}</span>` : ''}`;
        el.addEventListener('click', () => {
          this.invSel = k;
          this.refreshInventory();
        });
        grid.appendChild(el);
      }
      if (this.invSel) {
        const k = this.invSel;
        const info =
          k === 'code'
            ? `Vier Ziffern, gesehen auf KAM 3: <b>${s.code}</b>`
            : k === 'revolver'
              ? `${ITEM_INFO[k][1]}<br>Trommel: ${inv.ammo} · Reserve: ${inv.reserve}`
              : ITEM_INFO[k][1];
        detail.innerHTML = `<div><b>${ITEM_INFO[k][0]}</b></div><div>${info}</div>`;
        const act = { battery: ['Batterie einsetzen', () => g.useBattery()], medkit: ['Benutzen', () => g.useMedkit()], bottle: ['Werfen', () => { g.closeOverlay(); g.throwBottle(); }], flashlight: [g.player.flashOn ? 'Ausschalten' : 'Einschalten', () => g.player.toggleFlash()] }[k];
        if (act) {
          const b = document.createElement('button');
          b.className = 'btn';
          b.textContent = act[0];
          b.addEventListener('click', () => {
            act[1]();
            this.refreshInventory();
          });
          detail.appendChild(b);
        }
      }
    } else {
      const docs = $('#inv-docs');
      docs.innerHTML = s.notes.length ? '' : '<div class="empty">Noch keine Dokumente gefunden.</div>';
      for (const id of s.notes) {
        const b = document.createElement('button');
        b.className = 'doc';
        b.textContent = NOTES[id].title;
        b.addEventListener('click', () => g.readNote(id, true));
        docs.appendChild(b);
      }
    }
  }

  showNote(id) {
    const n = NOTES[id];
    $('#note-title').textContent = n.title;
    $('#note-text').textContent = n.text.replace('{CODE}', this.game.state.code);
    this.show('note');
    $('.paper').scrollTop = 0;
  }

  // ---------------------------------------------------------------- Tastenfeld
  openKeypad(cb) {
    this.kpCb = cb;
    this.kpValue = '';
    this.kpRender();
    this.game.setOverlay('keypad');
    this.show('keypad');
  }
  kpRender(err) {
    const d = $('#kp-display');
    d.textContent = (this.kpValue + '____').slice(0, 4);
    d.classList.toggle('err', !!err);
  }
  kpPress(k) {
    const g = this.game;
    if (this.current !== 'keypad' || this.kpValue === undefined) return;
    if (k === 'C') {
      this.kpValue = '';
      g.audio.beep('key');
    } else if (k === 'OK') {
      if (this.kpValue.length < 4) return g.audio.beep('error');
      const ok = this.kpCb && this.kpCb(this.kpValue);
      if (ok) {
        g.closeOverlay();
        return;
      }
      this.kpRender(true);
      this.kpValue = '';
      setTimeout(() => this.kpRender(), 700);
      return;
    } else if (this.kpValue.length < 4) {
      this.kpValue += k;
      g.audio.beep('key');
    }
    this.kpRender();
  }

  // ---------------------------------------------------------------- Kameramodus
  setMonitor(on, name) {
    this.monitorEl.classList.toggle('hidden', !on);
    if (name) $('#cam-name').textContent = name;
  }
  monitorTick(warn) {
    const d = new Date();
    const h = 3;
    const m = d.getMinutes();
    const s = d.getSeconds();
    $('#cam-time').textContent = `31.10.87  0${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    $('#cam-warning').classList.toggle('show', !!warn);
  }

  // ---------------------------------------------------------------- Tod / Ende
  showDead(cause) {
    const sub = {
      attack: 'Es hat dich gefunden.',
      locker: 'Es hat gesehen, wo du dich versteckt hast.',
    }[cause] || 'Die Nacht hat dich verschlungen.';
    $('#dead-sub').textContent = sub;
    this.show('dead');
  }
  showEnd(stats) {
    $('#end-text').textContent =
      'Das erste Licht des Morgens fällt auf den Kies vor dem Tor. Hinter dir schreit etwas deinen Namen – einen Namen, an den du dich jetzt wieder erinnerst. Manche Dinge sollte man nicht vergessen.';
    $('#end-stats').innerHTML = stats;
    this.show('end');
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
