import os
import re
import hashlib
import asyncio
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger("landguard.tts")

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    logger.warning("edge_tts is not installed. Neural TTS will not be available.")

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "tts_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

CURATED_VOICES: List[Dict[str, str]] = [
    {
        "id": "en-US-ChristopherNeural",
        "name": "Christopher (Neural Deep Male)",
        "locale": "en-US",
        "gender": "Male",
        "tag": "TACTICAL COMMANDER",
        "description": "Deep, authoritative, natural American male voice — perfect for geotechnical disaster alerts.",
    },
    {
        "id": "en-US-AriaNeural",
        "name": "Aria (Neural Studio Female)",
        "locale": "en-US",
        "gender": "Female",
        "tag": "STUDIO ASSISTANT",
        "description": "Crystal-clear, articulate, and friendly studio-grade American female voice.",
    },
    {
        "id": "en-IN-NeerjaExpressiveNeural",
        "name": "Neerja (Indian Expressive Female)",
        "locale": "en-IN",
        "gender": "Female",
        "tag": "REGIONAL EXPERT",
        "description": "High-fidelity natural Indian English accent — ideal for Indian geographic corridors.",
    },
    {
        "id": "en-IN-PrabhatNeural",
        "name": "Prabhat (Indian Natural Male)",
        "locale": "en-IN",
        "gender": "Male",
        "tag": "REGIONAL OFFICER",
        "description": "Calm, professional Indian English male voice for geotechnical risk communications.",
    },
    {
        "id": "en-US-GuyNeural",
        "name": "Guy (Neural Broadcast Male)",
        "locale": "en-US",
        "gender": "Male",
        "tag": "BROADCAST ANCHOR",
        "description": "Broadcast-style professional tone suited for emergency situation reports.",
    },
    {
        "id": "en-GB-SoniaNeural",
        "name": "Sonia (Neural British Female)",
        "locale": "en-GB",
        "gender": "Female",
        "tag": "SCIENTIFIC ADVISOR",
        "description": "Crisp British English voice for scientific slope analysis and explanations.",
    },
]

DEFAULT_VOICE = "en-US-ChristopherNeural"


class TTSService:
    def __init__(self):
        self.memory_cache: Dict[str, bytes] = {}
        self.cache_dir = CACHE_DIR

    def get_voices(self) -> List[Dict[str, str]]:
        return CURATED_VOICES

    def sanitize_text(self, text: str) -> str:
        """
        Cleans markdown, expands geotechnical acronyms, and normalizes pronunciation
        for natural, human-like neural speech synthesis.
        """
        if not text:
            return ""

        # Remove markdown URLs: [title](url) -> title
        cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
        
        # Remove code blocks and inline code
        cleaned = re.sub(r'```[^`]*```', '', cleaned)
        cleaned = re.sub(r'`[^`]*`', '', cleaned)
        
        # Remove LaTeX wrappers e.g. $\phi'$ -> friction angle
        cleaned = re.sub(r'\$\s*\\phi\'?\s*\$', 'friction angle', cleaned)
        cleaned = re.sub(r'\$\s*\\sigma_?[nu]?\'?\s*\$', 'effective normal stress', cleaned)
        cleaned = re.sub(r'\$\s*u_?w?\s*\$', 'pore water pressure', cleaned)
        cleaned = re.sub(r'\$\s*\\tau\s*\$', 'shear stress', cleaned)
        cleaned = re.sub(r'\$[^$]+\$', '', cleaned)

        # Remove redundant acronym repetitions like (FoS) and (VWC)
        cleaned = re.sub(r'\([Ff][Oo][Ss]\)', '', cleaned)
        cleaned = re.sub(r'\([Vv][Ww][Cc]\)', '', cleaned)

        # Expand scientific acronyms and units
        cleaned = re.sub(r'\bFoS\b', 'Factor of Safety', cleaned)
        cleaned = re.sub(r'\bVWC\b', 'Volumetric Water Content', cleaned)
        cleaned = re.sub(r'\bIMU\b', 'I M U', cleaned)
        cleaned = re.sub(r'\bLoRa\b', 'Lora', cleaned)
        cleaned = re.sub(r'\bStation\s+LG-N0(\d)\b', r'Station L G N 0 \1', cleaned)
        cleaned = re.sub(r'\bLG-N0(\d)\b', r'Station L G N 0 \1', cleaned)
        
        cleaned = re.sub(r'°/min', ' degrees per minute', cleaned)
        cleaned = re.sub(r'°C', ' degrees Celsius', cleaned)
        cleaned = re.sub(r'°', ' degrees', cleaned)
        cleaned = re.sub(r'(\d+(?:\.\d+)?)\s*mm\b', r'\1 millimeters', cleaned)
        cleaned = re.sub(r'(\d+(?:\.\d+)?)\s*kPa\b', r'\1 kilopascals', cleaned)
        cleaned = re.sub(r'(\d+(?:\.\d+)?)\s*km\b', r'\1 kilometers', cleaned)
        cleaned = re.sub(r'(\d+(?:\.\d+)?)\s*m\b', r'\1 meters', cleaned)

        # Replace pipes and bullet markers with natural speech pauses
        cleaned = re.sub(r'\|', ', ', cleaned)
        cleaned = re.sub(r'\s*•\s*', '. ', cleaned)
        cleaned = re.sub(r'\s*:\s*\*\*', ': ', cleaned)

        # Strip emojis and non-ASCII decorative symbols
        cleaned = re.sub(r'[^\x00-\x7F]+', ' ', cleaned)
        
        # Remove markdown markers
        cleaned = re.sub(r'[*#_~>]', ' ', cleaned)
        
        # Collapse multiple spaces and trim
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        # Limit to reasonable length (up to 1500 chars per speech packet)
        if len(cleaned) > 1500:
            cleaned = cleaned[:1500].rsplit('.', 1)[0] + '.'

        return cleaned

    def _get_cache_key(self, text: str, voice: str, rate: str) -> str:
        raw = f"{text}_{voice}_{rate}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    async def synthesize(self, text: str, voice: Optional[str] = None, rate: str = "+0%") -> Tuple[bytes, bool]:
        """
        Synthesize text using open-source neural TTS (edge_tts) with multi-tier caching.
        Returns (audio_bytes, is_cached).
        """
        if not EDGE_TTS_AVAILABLE:
            raise RuntimeError("edge_tts engine is not available on this server.")

        cleaned_text = self.sanitize_text(text)
        if not cleaned_text:
            raise ValueError("Input text is empty after sanitization.")

        selected_voice = voice if voice and any(v["id"] == voice for v in CURATED_VOICES) else DEFAULT_VOICE
        cache_key = self._get_cache_key(cleaned_text, selected_voice, rate)

        # 1. Check in-memory cache
        if cache_key in self.memory_cache:
            return self.memory_cache[cache_key], True

        # 2. Check disk cache
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.mp3")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    audio_bytes = f.read()
                    if len(audio_bytes) > 0:
                        self.memory_cache[cache_key] = audio_bytes
                        return audio_bytes, True
            except Exception as e:
                logger.warning(f"Error reading disk cache {cache_file}: {e}")

        # 3. Generate via edge_tts
        try:
            communicate = edge_tts.Communicate(
                text=cleaned_text,
                voice=selected_voice,
                rate=rate,
            )

            chunks: List[bytes] = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])

            audio_bytes = b"".join(chunks)
            if not audio_bytes:
                raise RuntimeError("edge_tts produced zero audio bytes.")

            # Save to memory cache (keep memory reasonable: max 150 items)
            if len(self.memory_cache) > 150:
                self.memory_cache.pop(next(iter(self.memory_cache)))
            self.memory_cache[cache_key] = audio_bytes

            # Save to disk cache
            try:
                with open(cache_file, "wb") as f:
                    f.write(audio_bytes)
            except Exception as e:
                logger.warning(f"Could not write TTS disk cache: {e}")

            return audio_bytes, False

        except Exception as e:
            logger.error(f"TTS synthesis failed for text: '{cleaned_text[:40]}...': {e}")
            raise RuntimeError(f"Neural TTS synthesis error: {str(e)}")


tts_service = TTSService()
