from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.services.translation_service import translation_service

router = APIRouter(prefix="/translate", tags=["Translation"])


class TranslateUIRequest(BaseModel):
    lang: str = Field(..., description="Target ISO language code (e.g. 'hi', 'ne', 'as', 'gbm')")
    strings: List[str] = Field(..., description="List of English UI strings to translate in batch")


class TranslateUIResponse(BaseModel):
    lang: str
    translations: List[str]
    used_fallback: bool = False
    fallback_target: Optional[str] = None
    note: Optional[str] = None
    available: bool = True
    error: Optional[str] = None


@router.post("/ui", response_model=TranslateUIResponse)
async def translate_ui_strings(payload: TranslateUIRequest):
    """
    Translates a batch of UI strings into the requested mountain region language.
    If the requested language is in FALLBACK_LANGUAGE_MAP (hyper-local/tribal),
    it is safely translated into the mapped fallback target with used_fallback=True.
    """
    result = await translation_service.translate_batch(
        texts=payload.strings,
        target_lang=payload.lang,
    )
    return TranslateUIResponse(**result)


@router.get("/languages")
def get_supported_languages() -> Dict[str, Any]:
    """
    Returns the catalog of 9-10 directly LLM-supported languages and
    the documented fallback mapping for hyper-local/tribal languages.
    """
    return translation_service.get_languages_metadata()
