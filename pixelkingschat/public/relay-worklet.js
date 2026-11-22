// Pixelkingschat – Audio-Worklets für die Anruf-Weiterleitung
// "pk-cap": Mikrofon → 12 kHz Mono, Stücke à 250 ms an den Hauptthread
// "pk-play": empfangene 12-kHz-Stücke mit kleinem Puffer gegen Ruckler abspielen

const RATE = 12000;

class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / RATE;
    this.pos = 0;
    this.buf = new Float32Array(RATE / 4);
    this.n = 0;
    this.last = 0;
  }
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    // einfache Verkleinerung mit Mittelwert (wirkt als Tiefpass gegen Verzerrungen)
    for (let i = 0; i < ch.length; i++) {
      this.acc = (this.acc || 0) + ch[i];
      this.cnt = (this.cnt || 0) + 1;
      this.pos += 1;
      if (this.pos >= this.step) {
        this.pos -= this.step;
        this.buf[this.n++] = this.acc / this.cnt;
        this.acc = 0;
        this.cnt = 0;
        if (this.n === this.buf.length) {
          this.port.postMessage(this.buf.slice(0));
          this.n = 0;
        }
      }
    }
    return true;
  }
}

class Player extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.cur = null;
    this.idx = 0;
    this.frac = 0;
    this.buffered = 0;
    this.started = false;
    this.step = RATE / sampleRate;
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d === "reset") {
        this.queue = [];
        this.cur = null;
        this.buffered = 0;
        this.started = false;
        return;
      }
      this.queue.push(d);
      this.buffered += d.length;
      // Zu viel Verzögerung? Ältestes Stück verwerfen (hält es nah an Echtzeit)
      while (this.buffered > RATE * 0.7 && this.queue.length > 1) this.buffered -= this.queue.shift().length;
    };
  }
  next() {
    if (this.cur && this.idx < this.cur.length) return this.cur[this.idx++];
    this.cur = this.queue.shift() || null;
    this.idx = 0;
    if (!this.cur) {
      this.started = false;
      return 0;
    }
    this.buffered -= this.cur.length;
    return this.cur[this.idx++];
  }
  process(_, outputs) {
    const out = outputs[0][0];
    if (!this.started) {
      // erst losspielen, wenn ~120 ms im Puffer sind
      if (this.buffered < RATE * 0.12) {
        out.fill(0);
        return true;
      }
      this.started = true;
      this.a = this.next();
      this.b = this.next();
    }
    for (let i = 0; i < out.length; i++) {
      out[i] = this.a + (this.b - this.a) * this.frac;
      this.frac += this.step;
      while (this.frac >= 1) {
        this.frac -= 1;
        this.a = this.b;
        this.b = this.started ? this.next() : 0;
      }
    }
    return true;
  }
}

registerProcessor("pk-cap", Capture);
registerProcessor("pk-play", Player);
