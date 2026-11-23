// Einheitliche Eingabe: Tastatur, Maus (Pointer Lock) und Touch (virtueller Stick + Buttons).
import { settings, IS_TOUCH } from './config.js';
import { clamp } from './utils.js';

const ACTION_KEYS = {
  KeyE: 'interact',
  KeyF: 'flashlight',
  KeyC: 'crouch',
  KeyR: 'reload',
  KeyH: 'heal',
  KeyG: 'throw',
  KeyQ: 'cross',
  KeyB: 'pray',
  KeyV: 'fire',
  Tab: 'inventory',
  KeyI: 'inventory',
  Escape: 'pause',
  KeyP: 'pause',
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.edges = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.stick = { x: 0, y: 0 };
    this.touchSprint = false;
    this.enabled = false;
    this.locked = false;
    this.isTouch = IS_TOUCH;
    this.usingTouch = false;
    this.onPointerUnlock = null;
    this.bindKeyboard();
    this.bindMouse();
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      this.usingTouch = false;
      this.keys.add(e.code);
      const a = ACTION_KEYS[e.code];
      if (a) this.edges.add(a);
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') this.edges.add('crouchHold');
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') this.edges.add('crouchRelease');
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  bindMouse() {
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      const s = 0.0022 * settings.sensitivity;
      this.lookX += e.movementX * s;
      this.lookY += e.movementY * s * (settings.invertY ? -1 : 1);
    });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === this.canvas;
      if (was && !this.locked && this.onPointerUnlock) this.onPointerUnlock();
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.usingTouch) return;
      if (this.enabled && !this.locked) this.lock();
      else if (this.enabled && e.button === 0) this.edges.add('click');
    });
  }

  lock() {
    if (this.isTouch && this.usingTouch) return;
    if (!this.canvas.requestPointerLock) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      /* ignore */
    }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  // ---------------------------------------------------------------- Touch
  bindTouch(root) {
    const stickZone = root.querySelector('#tz-move');
    const lookZone = root.querySelector('#tz-look');
    const base = root.querySelector('#stick-base');
    const knob = root.querySelector('#stick-knob');
    let stickId = null;
    let lookId = null;
    let sx = 0;
    let sy = 0;
    let lx = 0;
    let ly = 0;
    const R = 56;

    const showStick = (x, y) => {
      base.style.display = 'block';
      base.style.left = x + 'px';
      base.style.top = y + 'px';
      knob.style.transform = 'translate(-50%,-50%)';
    };

    stickZone.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        this.usingTouch = true;
        for (const t of e.changedTouches) {
          if (stickId === null) {
            stickId = t.identifier;
            sx = t.clientX;
            sy = t.clientY;
            showStick(sx, sy);
          }
        }
      },
      { passive: false },
    );
    lookZone.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        this.usingTouch = true;
        for (const t of e.changedTouches) {
          if (lookId === null) {
            lookId = t.identifier;
            lx = t.clientX;
            ly = t.clientY;
          }
        }
      },
      { passive: false },
    );
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx;
          let dy = t.clientY - sy;
          const d = Math.hypot(dx, dy);
          if (d > R) {
            dx = (dx / d) * R;
            dy = (dy / d) * R;
          }
          this.stick.x = dx / R;
          this.stick.y = -dy / R;
          knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        } else if (t.identifier === lookId) {
          const s = 0.0055 * settings.touchSensitivity;
          this.lookX += (t.clientX - lx) * s;
          this.lookY += (t.clientY - ly) * s * (settings.invertY ? -1 : 1);
          lx = t.clientX;
          ly = t.clientY;
        }
      }
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          stickId = null;
          this.stick.x = 0;
          this.stick.y = 0;
          base.style.display = 'none';
        } else if (t.identifier === lookId) lookId = null;
      }
    };
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);

    const btn = (id, action, opts = {}) => {
      const el = root.querySelector(id);
      if (!el) return;
      el.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.usingTouch = true;
          el.classList.add('down');
          if (opts.toggle) opts.toggle(el);
          else this.edges.add(action);
        },
        { passive: false },
      );
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        el.classList.remove('down');
      });
      // Maus-Fallback (z.B. Touch-Laptop / Tests)
      el.addEventListener('click', (e) => {
        if (this.usingTouch) return;
        if (opts.toggle) opts.toggle(el);
        else this.edges.add(action);
      });
    };
    btn('#tb-interact', 'interact');
    btn('#tb-flash', 'flashlight');
    btn('#tb-crouch', 'crouch');
    btn('#tb-inv', 'inventory');
    btn('#tb-pause', 'pause');
    btn('#tb-throw', 'throw');
    btn('#tb-heal', 'heal');
    btn('#tb-reload', 'reload');
    btn('#tb-fire', 'fire');
    btn('#tb-cross', 'cross');
    btn('#tb-pray', 'pray');
    btn('#tb-sprint', null, {
      toggle: (el) => {
        this.touchSprint = !this.touchSprint;
        el.classList.toggle('on', this.touchSprint);
      },
    });
    this.sprintBtn = root.querySelector('#tb-sprint');
  }

  // Bewegungsvektor (x = rechts, y = vorwärts)
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l, mag: 1 };
    }
    const m = Math.hypot(this.stick.x, this.stick.y);
    if (m < 0.12) return { x: 0, y: 0, mag: 0 };
    const k = clamp((m - 0.12) / 0.88, 0, 1);
    return { x: (this.stick.x / m) * k, y: (this.stick.y / m) * k, mag: k };
  }

  sprinting() {
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) return true;
    const m = Math.hypot(this.stick.x, this.stick.y);
    if (this.touchSprint && m > 0.3) return true;
    return m > 0.97 && this.stick.y > 0.6;
  }

  resetTouchSprint() {
    if (this.touchSprint) {
      this.touchSprint = false;
      if (this.sprintBtn) this.sprintBtn.classList.remove('on');
    }
  }

  consumeLook() {
    const r = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return r;
  }

  pressed(a) {
    return this.edges.has(a);
  }

  endFrame() {
    this.edges.clear();
  }

  clear() {
    this.keys.clear();
    this.edges.clear();
    this.lookX = this.lookY = 0;
    this.stick.x = this.stick.y = 0;
  }
}
