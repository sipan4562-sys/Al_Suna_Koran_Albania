import os
import json
import base64
import httpx
import asyncio
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import aiofiles

from pdf_generator import generate_meeting_pdf

OLLAMA_BASE = os.getenv("OLLAMA_HOST", "http://localhost:11434")
TEXT_MODEL  = os.getenv("OLLAMA_MODEL", "llama3.2")
VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "llava")

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("output")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Meeting Notes AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/output", StaticFiles(directory="output"), name="output")


@app.get("/", response_class=HTMLResponse)
async def root():
    async with aiofiles.open("templates/index.html", encoding="utf-8") as f:
        return await f.read()


@app.get("/api/models")
async def list_models():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            return {"models": models, "connected": True}
    except Exception:
        return {"models": [], "connected": False}


@app.post("/api/process-notes")
async def process_notes(
    raw_notes: str = Form(...),
    title: str = Form("Meeting"),
    attendees: str = Form(""),
    date: str = Form(""),
    language: str = Form("de"),
):
    meeting_date = date or datetime.now().strftime("%d.%m.%Y")

    lang_hint = "auf Deutsch" if language == "de" else "in English"
    prompt = f"""Du bist ein professioneller Meeting-Assistent. Verarbeite die folgenden Meeting-Notizen {lang_hint} und strukturiere sie klar.

Gib die Antwort als JSON zurück mit GENAU diesen Feldern:
{{
  "zusammenfassung": "Kurze Zusammenfassung des Meetings (2-3 Sätze)",
  "themen": ["Thema 1", "Thema 2", ...],
  "beschluesse": ["Beschluss 1", "Beschluss 2", ...],
  "aufgaben": [
    {{"aufgabe": "Was zu tun ist", "verantwortlich": "Name oder Team", "frist": "Datum oder offen"}},
    ...
  ],
  "naechste_schritte": ["Schritt 1", "Schritt 2", ...],
  "offene_fragen": ["Frage 1", "Frage 2", ...]
}}

Meeting-Notizen:
{raw_notes}

Antworte NUR mit dem JSON, ohne Markdown-Codeblöcke."""

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                f"{OLLAMA_BASE}/api/generate",
                json={"model": TEXT_MODEL, "prompt": prompt, "stream": False},
            )
            r.raise_for_status()
            raw_response = r.json()["response"].strip()

            # Strip markdown code fences if present
            if raw_response.startswith("```"):
                lines = raw_response.split("\n")
                raw_response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

            structured = json.loads(raw_response)
    except json.JSONDecodeError:
        structured = {
            "zusammenfassung": raw_response[:500],
            "themen": [],
            "beschluesse": [],
            "aufgaben": [],
            "naechste_schritte": [],
            "offene_fragen": [],
        }
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama nicht erreichbar. Bitte starte Ollama mit: ollama serve",
        )

    pdf_path = generate_meeting_pdf(
        title=title,
        date=meeting_date,
        attendees=[a.strip() for a in attendees.split(",") if a.strip()],
        raw_notes=raw_notes,
        structured=structured,
    )

    return {
        "structured": structured,
        "pdf_filename": pdf_path.name,
        "pdf_url": f"/output/{pdf_path.name}",
    }


@app.post("/api/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    question: str = Form("Was siehst du auf diesem Bild? Beschreibe es detailliert."),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Nur Bilddateien erlaubt.")

    content = await file.read()
    b64_image = base64.b64encode(content).decode()

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(
                f"{OLLAMA_BASE}/api/generate",
                json={
                    "model": VISION_MODEL,
                    "prompt": question,
                    "images": [b64_image],
                    "stream": False,
                },
            )
            r.raise_for_status()
            analysis = r.json()["response"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama nicht erreichbar. Bitte starte Ollama mit: ollama serve",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"analysis": analysis, "filename": file.filename}


@app.get("/api/download/{filename}")
async def download_pdf(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden.")
    return FileResponse(path, media_type="application/pdf", filename=filename)
