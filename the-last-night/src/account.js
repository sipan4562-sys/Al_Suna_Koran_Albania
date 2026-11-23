// Konto & Vollversion: eigenes Konto (E-Mail + Passwort, ohne Google)
// und Einmalkauf über Stripe Checkout. Der Kauf wird auf dem Server geprüft.
const TOKEN_KEY = 'tln_session_v2';
const CACHE_KEY = 'tln_account_v2';
const CACHE_DAYS = 30;

export class Account {
  constructor() {
    this.config = null;
    this.user = null;
    this.premium = false;
    this.token = null;
    this.listeners = new Set();
    this.busy = false;
    this.message = '';
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
      this.token = localStorage.getItem(TOKEN_KEY) || null;
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (this.token && c && c.user && Date.now() - c.ts < CACHE_DAYS * 864e5) {
        this.user = c.user;
        this.premium = !!c.premium;
      }
    } catch (e) {
      /* ignore */
    }
  }

  saveCache() {
    try {
      if (this.token) localStorage.setItem(TOKEN_KEY, this.token);
      else localStorage.removeItem(TOKEN_KEY);
      if (this.user) localStorage.setItem(CACHE_KEY, JSON.stringify({ user: this.user, premium: this.premium, ts: Date.now() }));
      else localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  async api(path, body) {
    let r;
    try {
      r = await fetch('/api/' + path, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error('Keine Verbindung zum Server.');
    }
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
      this.config = { accounts: false, payments: false, priceCents: 1000, currency: 'EUR' };
    }
    if (this.token && this.config.accounts) await this.refresh();
    await this.handleReturn();
    this.emit();
  }

  get accountsAvailable() {
    return !!(this.config && this.config.accounts);
  }
  get available() {
    return !!(this.config && this.config.payments);
  }
  get loggedIn() {
    return !!(this.user && this.token);
  }

  get priceLabel() {
    const c = (this.config && this.config.priceCents) || 1000;
    return (c / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }

  async refresh() {
    try {
      const r = await this.api('me', { token: this.token });
      this.user = r.user;
      this.premium = !!r.premium;
    } catch (e) {
      if (e.status === 401) {
        this.token = null;
        this.user = null;
        this.premium = false;
        this.message = e.message;
      }
      // Bei Netzwerkfehlern bleibt der zwischengespeicherte Stand erhalten
    }
    this.saveCache();
  }

  async auth(action, email, password, name) {
    if (this.busy) return false;
    this.busy = true;
    this.message = action === 'register' ? 'Konto wird erstellt …' : 'Anmeldung …';
    this.emit();
    let ok = false;
    try {
      const r = await this.api('auth', { action, email, password, name });
      this.token = r.token;
      this.user = r.user;
      this.premium = !!r.premium;
      this.message = action === 'register' ? 'Willkommen! Dein Konto ist erstellt.' : this.premium ? 'Angemeldet – Vollversion aktiv.' : 'Angemeldet.';
      ok = true;
    } catch (e) {
      this.message = e.message;
    }
    this.busy = false;
    this.saveCache();
    this.emit();
    return ok;
  }

  async changePassword(oldPassword, newPassword) {
    try {
      const r = await this.api('password', { token: this.token, oldPassword, newPassword });
      this.token = r.token;
      this.message = 'Passwort geändert.';
      this.saveCache();
    } catch (e) {
      this.message = e.message;
    }
    this.emit();
  }

  async deleteAccount(password) {
    try {
      await this.api('delete', { token: this.token, password });
      this.signOut();
      this.message = 'Dein Konto wurde gelöscht.';
    } catch (e) {
      this.message = e.message;
    }
    this.emit();
  }

  signOut() {
    this.user = null;
    this.premium = false;
    this.token = null;
    this.message = 'Abgemeldet.';
    this.saveCache();
    this.emit();
  }

  async buy(consent) {
    if (!this.available) {
      this.message = 'Der Kauf ist im Moment nicht verfügbar.';
      this.emit();
      return;
    }
    if (!this.loggedIn) {
      this.message = 'Bitte zuerst anmelden oder ein Konto erstellen.';
      this.emit();
      return;
    }
    if (!consent) {
      this.message = 'Bitte bestätige die sofortige Freischaltung.';
      this.emit();
      return;
    }
    this.busy = true;
    this.message = 'Weiterleitung zur sicheren Bezahlseite …';
    this.emit();
    try {
      const r = await this.api('checkout', { token: this.token, consent: true });
      if (r.premium) {
        this.premium = true;
        this.message = 'Du besitzt die Vollversion bereits.';
        this.busy = false;
        this.saveCache();
        this.emit();
        return;
      }
      location.href = r.url;
    } catch (e) {
      this.busy = false;
      this.message = e.message;
      if (e.status === 401) this.signOut();
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
    try {
      const r = await this.api('verify', { token: this.token, sessionId: p.get('session_id') });
      if (r.premium) {
        this.premium = true;
        this.message = 'Danke! Die Vollversion ist freigeschaltet.';
        this.justReturned = 'success';
      } else {
        this.message = 'Die Zahlung ist noch nicht bestätigt. Bitte später erneut anmelden.';
        this.justReturned = 'pending';
      }
    } catch (e) {
      this.message = e.status === 401 ? 'Bitte melde dich an – dein Kauf wird dann automatisch erkannt.' : e.message;
      this.justReturned = 'error';
    }
    this.saveCache();
    clean();
  }
}
