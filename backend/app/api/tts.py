from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict

from app.services.tts_service import tts_service, CURATED_VOICES, DEFAULT_VOICE

router = APIRouter(prefix="/tts", tags=["Neural Text-To-Speech"])


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2500, description="Text to synthesize with neural speech")
    voice: Optional[str] = Field(default=DEFAULT_VOICE, description="Voice ID from available voices")
    rate: Optional[str] = Field(default="+0%", description="Speech rate adjustment (e.g. '+0%', '+10%', '-5%')")


@router.get("/voices", response_model=List[Dict[str, str]])
def get_tts_voices():
    """Retrieve all available high-fidelity neural voices with metadata."""
    return tts_service.get_voices()


@router.get("/health")
def get_tts_health():
    """Check health and cache metrics of the neural TTS engine."""
    from app.services.tts_service import EDGE_TTS_AVAILABLE
    return {
        "status": "online" if EDGE_TTS_AVAILABLE else "degraded",
        "engine": "Microsoft Edge Neural TTS (Open-Source)",
        "cached_items_memory": len(tts_service.memory_cache),
        "available_voices": len(CURATED_VOICES),
        "default_voice": DEFAULT_VOICE,
    }


@router.post("/speak")
async def synthesize_speech(payload: TTSRequest):
    """
    Synthesize text into studio-grade neural audio (MP3).
    Returns binary audio stream with caching headers.
    """
    try:
        audio_bytes, is_cached = await tts_service.synthesize(
            text=payload.text,
            voice=payload.voice,
            rate=payload.rate or "+0%",
        )

        headers = {
            "Content-Type": "audio/mpeg",
            "Content-Length": str(len(audio_bytes)),
            "Content-Disposition": "inline; filename=speech.mp3",
            "X-TTS-Cached": "true" if is_cached else "false",
            "Cache-Control": "public, max-age=86400",
        }

        return Response(content=audio_bytes, media_type="audio/mpeg", headers=headers)

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"TTS synthesis failed: {str(e)}")
