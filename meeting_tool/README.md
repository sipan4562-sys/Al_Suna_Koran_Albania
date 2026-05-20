# Meeting Notes AI 📝

Lokales Tool zur KI-gestützten Aufbereitung von Meeting-Notizen mit PDF-Export und Bildanalyse.

## Voraussetzungen

- **Python 3.10+**
- **[Ollama](https://ollama.com)** (lokal installiert)

## Schnellstart

```bash
# 1. Ollama installieren (einmalig)
#    → https://ollama.com/download

# 2. Modelle laden (einmalig)
ollama pull llama3.2      # Text-Verarbeitung (~2 GB)
ollama pull llava         # Bildanalyse       (~4 GB)

# 3. Tool starten
chmod +x start.sh
./start.sh
```

Danach im Browser öffnen: **http://localhost:8000**

Vom Mobilgerät (selbes WLAN): `http://<IP-deines-Rechners>:8000`

## Funktionen

| Funktion | Beschreibung |
|---|---|
| 📋 Notizen aufbereiten | Rohe Stichwörter → strukturiertes Meeting-Protokoll |
| 📌 Aufgaben extrahieren | Wer macht was bis wann |
| ✅ Beschlüsse | Automatisch erkannte Entscheidungen |
| 📄 PDF-Export | Professionelle PDF-Vorlage, sofort downloadbar |
| 🖼️ Bildanalyse | Whiteboard, Diagramm, Screenshot → Textanalyse |

## Umgebungsvariablen

```bash
OLLAMA_HOST=http://localhost:11434   # Ollama URL
OLLAMA_MODEL=llama3.2                # Text-Modell
OLLAMA_VISION_MODEL=llava            # Vision-Modell
```

## Alternative Modelle

| Modell | Größe | Qualität |
|---|---|---|
| `llama3.2` | 2 GB | Gut (Standard) |
| `mistral` | 4 GB | Sehr gut |
| `gemma2` | 5 GB | Sehr gut |
| `llava` | 4 GB | Vision (Standard) |
| `llava-phi3` | 2 GB | Vision (klein) |

## Projektstruktur

```
meeting_tool/
├── main.py           # FastAPI-Backend
├── pdf_generator.py  # PDF-Vorlage (ReportLab)
├── templates/
│   └── index.html    # Web-Frontend
├── uploads/          # Temporäre Uploads
├── output/           # Generierte PDFs
├── requirements.txt
└── start.sh          # Startskript
```
