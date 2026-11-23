// Konto & Vollversion: Google-Anmeldung (Google Identity Services) und
// Einmalkauf über Stripe Checkout. Die Prüfung des Kaufs passiert auf dem Server.
const CACHE_KEY = 'tln_account_v1';
const CACHE_DAYS = 30;

export class Account {
  constructor() {
    this.config = null;
    this.user = null;
    this.premium = false;
    this.idToken = null;
    this.listeners = new Set();
    this.status = 'idle';
    this.message = '';
    this.gsiReady = false;
    this.loadCache();
  }

  on(fn) {
    this.listeners.add(fn);
  }
  emit() {
    for (const fn of this.listeners) fn(this);
  }

  loadCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && c.user && Date.now() - c.ts < CACHE_DAYS * 864e5) {
        this.user = c.user;
        this.premium = !!c.premium;
      }
    } catch (e) {
      /* ignore */
    }
    try {
      this.idToken = sessionStorage.getItem('tln_idtoken') || null;
    } catch (e) {
      /* ignore */
    }
  }

  saveCache() {
    try {
      if (this.user) localStorage.setItem(CACHE_KEY, JSON.stringify({ user: this.user, premium: this.premium, ts: Date.now() }));
      else localStorage.removeItem(CACHE_KEY);
      if (this.idToken) sessionStorage.setItem('tln_idtoken', this.idToken);
      else sessionStorage.removeItem('tln_idtoken');
    } catch (e) {
      /* ignore */
    }
  }

  async api(path, body) {
    const r = await fetch('/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let j = {};
    try {
      j = await r.json();
    } catch (e) {
      /* ignore */
    }
    if (!r.ok) {
      const err = new Error(j.error || 'Server nicht erreichbar.');
      err.status = r.status;
      throw err;
    }
    return j;
  }

  async init() {
    try {
      this.config = await this.api('config');
    } catch (e) {
      this.config = { googleClientId: null, payments: false, priceCents: 1000, currency: 'EUR' };
    }
    if (this.config.googleClientId) this.loadGsi();
    await this.handleReturn();
    this.emit();
  }

  get available() {
    return !!(this.config && this.config.payments);
  }

  get priceLabel() {
    const c = (this.config && this.config.priceCents) || 1000;
    return (c / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }

  loadGsi() {
    if (document.getElementById('gsi-script')) return;
    const s = document.createElement('script');
    s.id = 'gsi-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      const g = window.google && window.google.accounts && window.google.accounts.id;
      if (!g) return;
      g.initialize({
        client_id: this.config.googleClientId,
        callback: (resp) => this.onCredential(resp.credential),
        auto_select: true,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
        itp_support: true,
      });
      this.gsiReady = true;
      this.renderButtons();
      // Bereits angemeldete Nutzer still neu bestätigen (für frisches Token)
      if (this.user && !this.idToken) g.prompt();
      this.emit();
    };
    document.head.appendChild(s);
  }

  // Google-Anmeldeknöpfe in alle Platzhalter rendern
  renderButtons() {
    if (!this.gsiReady) return;
    const g = window.google.accounts.id;
    document.querySelectorAll('.gsi-slot').forEach((el) => {
      if (el.dataset.rendered) return;
      el.dataset.rendered = '1';
      g.renderButton(el, { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'rectangular', locale: 'de', width: 260 });
    });
  }

  async onCredential(token) {
    this.idToken = token;
    this.status = 'checking';
    this.message = 'Anmeldung wird geprüft …';
    this.emit();
    try {
      const r = await this.api('me', { idToken: token });
      this.user = r.user;
      this.premium = !!r.premium;
      this.status = 'ok';
      this.message = this.premium ? 'Vollversion aktiv.' : '';
    } catch (e) {
      this.status = 'error';
      this.message = e.message;
      if (e.status === 401) this.idToken = null;
    }
    this.saveCache();
    this.emit();
  }

  signOut() {
    this.user = null;
    this.premium = false;
    this.idToken = null;
    this.message = 'Abgemeldet.';
    try {
      window.google && window.google.accounts.id.disableAutoSelect();
    } catch (e) {
      /* ignore */
    }
    this.saveCache();
    this.emit();
  }

  async buy(consent) {
    if (!this.available) {
      this.message = 'Der Kauf ist im Moment nicht verfügbar.';
      this.emit();
      return;
    }
    if (!this.user || !this.idToken) {
      this.message = 'Bitte zuerst mit Google anmelden.';
      this.emit();
      if (this.gsiReady) window.google.accounts.id.prompt();
      return;
    }
    if (!consent) {
      this.message = 'Bitte bestätige die sofortige Freischaltung.';
      this.emit();
      return;
    }
    this.status = 'checking';
    this.message = 'Weiterleitung zur sicheren Bezahlseite …';
    this.emit();
    try {
      const r = await this.api('checkout', { idToken: this.idToken, consent: true });
      if (r.premium) {
        this.premium = true;
        this.message = 'Du besitzt die Vollversion bereits.';
        this.saveCache();
        this.emit();
        return;
      }
      this.saveCache();
      location.href = r.url;
    } catch (e) {
      this.status = 'error';
      this.message = e.message;
      if (e.status === 401) {
        this.idToken = null;
        this.saveCache();
      }
      this.emit();
    }
  }

  // Rückkehr von der Bezahlseite (?purchase=success&session_id=…)
  async handleReturn() {
    const p = new URLSearchParams(location.search);
    const state = p.get('purchase');
    if (!state) return;
    const clean = () => {
      const keep = new URLSearchParams(location.search);
      keep.delete('purchase');
      keep.delete('session_id');
      const q = keep.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
    };
    if (state === 'cancel') {
      this.message = 'Kauf abgebrochen – es wurde nichts berechnet.';
      this.justReturned = 'cancel';
      clean();
      return;
    }
    const sid = p.get('session_id');
    try {
      const r = await this.api('verify', { sessionId: sid });
      if (r.premium) {
        this.premium = true;
        if (!this.user && r.user) this.user = { sub: r.user.sub, email: r.user.email, name: r.user.email };
        this.message = 'Danke! Die Vollversion ist freigeschaltet.';
        this.justReturned = 'success';
      } else {
        this.message = 'Die Zahlung ist noch nicht bestätigt. Bitte später erneut anmelden.';
        this.justReturned = 'pending';
      }
    } catch (e) {
      this.message = e.message;
      this.justReturned = 'error';
    }
    this.saveCache();
    clean();
  }
}
