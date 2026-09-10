import logging
import os
import shutil
import subprocess
import tempfile
from typing import Optional

logger = logging.getLogger("landguard.stt")

try:
    import speech_recognition as sr
    SR_AVAILABLE = True
except ImportError:
    sr = None
    SR_AVAILABLE = False

FFMPEG = shutil.which("ffmpeg")


def _convert_to_wav(src_path: str, dst_path: str) -> None:
    if not FFMPEG:
        raise RuntimeError("ffmpeg is required to transcribe browser audio.")
    cmd = [
        FFMPEG,
        "-y",
        "-i",
        src_path,
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "wav",
        dst_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(dst_path):
        raise RuntimeError(result.stderr[-400:] if result.stderr else "ffmpeg conversion failed")


def transcribe_audio(payload: bytes, filename: str = "clip.webm", language: str = "en-IN") -> str:
    if not payload:
        raise ValueError("Empty audio clip")
    if not SR_AVAILABLE:
        raise RuntimeError("SpeechRecognition is not installed on the server.")

    suffix = os.path.splitext(filename or "")[1] or ".webm"
    tmp_dir = tempfile.mkdtemp(prefix="geobot-stt-")
    src_path = os.path.join(tmp_dir, f"in{suffix}")
    wav_path = os.path.join(tmp_dir, "speech.wav")

    try:
        with open(src_path, "wb") as handle:
            handle.write(payload)

        if suffix.lower() in {".wav", ".wave"}:
            wav_path = src_path
        else:
            _convert_to_wav(src_path, wav_path)

        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio = recognizer.record(source)

        text = recognizer.recognize_google(audio, language=language or "en-IN")
        cleaned = (text or "").strip()
        if not cleaned:
            raise ValueError("No speech detected")
        return cleaned
    except sr.UnknownValueError as exc:
        raise ValueError("Could not understand the audio") from exc
    except sr.RequestError as exc:
        logger.warning("Google STT request failed: %s", exc)
        raise RuntimeError("Voice transcription service is unreachable") from exc
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def stt_health() -> dict:
    return {
        "available": SR_AVAILABLE and bool(FFMPEG),
        "engine": "server-side Google STT via SpeechRecognition",
        "ffmpeg": bool(FFMPEG),
        "speech_recognition": SR_AVAILABLE,
    }
