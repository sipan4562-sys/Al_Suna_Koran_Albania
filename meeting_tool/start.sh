#!/usr/bin/env bash
# Meeting Notes AI — Startskript
set -e

cd "$(dirname "$0")"

echo "═══════════════════════════════════════════"
echo "   Meeting Notes AI – Lokale KI + PDF"
echo "═══════════════════════════════════════════"

# Python-Umgebung
if [ ! -d ".venv" ]; then
  echo "▶ Erstelle virtuelle Umgebung..."
  python3 -m venv .venv
fi

source .venv/bin/activate
echo "▶ Installiere Abhängigkeiten..."
pip install -q -r requirements.txt

# Ollama-Modelle prüfen
if command -v ollama &>/dev/null; then
  echo "▶ Starte Ollama im Hintergrund..."
  ollama serve &>/dev/null &
  sleep 2
  echo "▶ Lade Modelle (falls noch nicht vorhanden)..."
  ollama pull "${OLLAMA_MODEL:-llama3.2}" &
  ollama pull "${OLLAMA_VISION_MODEL:-llava}" &
  wait
else
  echo "⚠  Ollama nicht gefunden. Installiere es von https://ollama.com"
fi

echo ""
echo "▶ Starte Web-Server auf http://localhost:8000"
echo "   (Mobilgerät: http://$(hostname -I | awk '{print $1}'):8000)"
echo ""
echo "   Zum Beenden: Strg+C"
echo "═══════════════════════════════════════════"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
