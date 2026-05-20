#!/usr/bin/env bash
# Meeting Notes AI — Startskript (öffnet Browser automatisch)
set -e

cd "$(dirname "$0")"

PORT=8000
URL="http://localhost:$PORT"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       Meeting Notes AI  📝               ║"
echo "  ║  Lokale KI · PDF-Export · Bildanalyse    ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Python-Umgebung ─────────────────────────────────────────────────────────
if [ ! -d ".venv" ]; then
  echo "  ▶ Erstelle virtuelle Umgebung..."
  python3 -m venv .venv
fi

source .venv/bin/activate
echo "  ▶ Prüfe Abhängigkeiten..."
pip install -q -r requirements.txt

# ── Ollama ───────────────────────────────────────────────────────────────────
if command -v ollama &>/dev/null; then
  if ! pgrep -x ollama &>/dev/null; then
    echo "  ▶ Starte Ollama..."
    ollama serve &>/dev/null &
    sleep 2
  else
    echo "  ✓ Ollama läuft bereits"
  fi

  echo "  ▶ Prüfe Modelle..."
  for MODEL in "${OLLAMA_MODEL:-llama3.2}" "${OLLAMA_VISION_MODEL:-llava}"; do
    if ! ollama list 2>/dev/null | grep -q "^$MODEL"; then
      echo "    Lade $MODEL (einmalig, kann einige Minuten dauern)..."
      ollama pull "$MODEL"
    else
      echo "    ✓ $MODEL verfügbar"
    fi
  done
else
  echo "  ⚠  Ollama nicht gefunden."
  echo "     Installiere es unter: https://ollama.com/download"
fi

# ── Browser öffnen ───────────────────────────────────────────────────────────
open_browser() {
  sleep 1.5
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$URL"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v xdg-open &>/dev/null; then
      xdg-open "$URL"
    elif command -v sensible-browser &>/dev/null; then
      sensible-browser "$URL"
    fi
  elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
    start "$URL"
  fi
}

open_browser &

# ── Netzwerk-Info ────────────────────────────────────────────────────────────
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "?")

echo ""
echo "  ┌─────────────────────────────────────────┐"
echo "  │  ✅ Server gestartet                     │"
echo "  │                                         │"
echo "  │  💻 Desktop:  $URL            │"
echo "  │  📱 Mobil:    http://$LOCAL_IP:$PORT       │"
echo "  │                                         │"
echo "  │  Zum Beenden:  Strg + C                 │"
echo "  └─────────────────────────────────────────┘"
echo ""
echo "  🌐 Browser wird geöffnet..."
echo ""

uvicorn main:app --host 0.0.0.0 --port $PORT
