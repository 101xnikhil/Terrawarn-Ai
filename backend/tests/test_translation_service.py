import asyncio
import pytest
from unittest.mock import patch, AsyncMock
from app.services.translation_service import (
    translation_service,
    TranslationService,
    FALLBACK_LANGUAGE_MAP,
    SUPPORTED_LANGUAGES,
)


def test_numbered_output_parsing_and_order():
    """Verify regex correctly parses numbered LLM outputs and preserves 1:1 order."""
    service = TranslationService()
    
    raw_llm_output = (
        "Here are the translations:\n"
        "1. मेट्रिक्स (Metrics)\n"
        "2) स्टेशन टेलीमेट्री\n"
        "3: भू-स्थानिक जीआईएस\n"
        "4. **खतरे की चेतावनी**\n"
    )
    
    inputs = ["Metrics", "Station Telemetry", "Geospatial GIS", "Hazard Alert"]
    parsed = service.parse_numbered_translations(raw_llm_output, expected_count=4, fallback_texts=inputs)
    
    assert len(parsed) == 4
    assert parsed[0] == "मेट्रिक्स (Metrics)"
    assert parsed[1] == "स्टेशन टेलीमेट्री"
    assert parsed[2] == "भू-स्थानिक जीआईएस"
    assert parsed[3] == "खतरे की चेतावनी"


def test_numbered_output_parsing_with_missing_indices():
    """If LLM omits an index, the parser should gracefully fall back to the original text for that index."""
    service = TranslationService()
    
    raw_output_missing_2 = (
        "1. मेट्रिक्स\n"
        "3. भू-स्थानिक जीआईएस\n"
    )
    
    inputs = ["Metrics", "Station Telemetry", "Geospatial GIS"]
    parsed = service.parse_numbered_translations(raw_output_missing_2, expected_count=3, fallback_texts=inputs)
    
    assert len(parsed) == 3
    assert parsed[0] == "मेट्रिक्स"
    assert parsed[1] == "Station Telemetry"  # preserved original as fallback
    assert parsed[2] == "भू-स्थानिक जीआईएस"


def test_fallback_map_redirection_garhwali_to_hindi():
    """Garhwali ('gbm') must redirect to Hindi ('hi') and flag used_fallback=True."""
    service = TranslationService()
    
    with patch.object(service, "_request_ollama", new=AsyncMock(return_value="1. मेट्रिक्स\n2. सेटिंग्स\n")):
        result = asyncio.run(service.translate_batch(["Metrics", "Settings"], target_lang="gbm"))
        
        assert result["lang"] == "gbm"
        assert result["used_fallback"] is True
        assert result["fallback_target"] == "hi"
        assert "Hindi" in result["note"]
        assert result["translations"] == ["मेट्रिक्स", "सेटिंग्स"]


def test_fallback_map_redirection_khasi_to_english():
    """Khasi ('kha') must redirect to English ('en') and flag used_fallback=True."""
    service = TranslationService()
    
    result = asyncio.run(service.translate_batch(["Hazard Alert", "Evacuate Now"], target_lang="kha"))
    
    assert result["lang"] == "kha"
    assert result["used_fallback"] is True
    assert result["fallback_target"] == "en"
    assert result["translations"] == ["Hazard Alert", "Evacuate Now"]


def test_english_passthrough():
    """English requests must pass through without hitting the LLM."""
    service = TranslationService()
    
    result = asyncio.run(service.translate_batch(["Metrics", "Settings"], target_lang="en"))
    
    assert result["lang"] == "en"
    assert result["used_fallback"] is False
    assert result["translations"] == ["Metrics", "Settings"]


def test_session_caching():
    """Identical requests must be served from cache without duplicate network requests."""
    service = TranslationService()
    
    mock_ollama = AsyncMock(return_value="1. ড্যাশবোর্ড\n2. সতৰ্কবাৰ্তা\n")
    with patch.object(service, "_request_ollama", new=mock_ollama):
        res1 = asyncio.run(service.translate_batch(["Dashboard", "Alerts"], target_lang="as"))
        assert mock_ollama.call_count == 1
        assert res1["translations"] == ["ড্যাশবোর্ড", "সতৰ্কবাৰ্তা"]

        res2 = asyncio.run(service.translate_batch(["Dashboard", "Alerts"], target_lang="as"))
        assert mock_ollama.call_count == 1
        assert res2["translations"] == ["ড্যাশবোর্ড", "সতৰ্কবাৰ্তা"]


def test_ollama_unreachable_graceful_handling():
    """When Ollama is unreachable, service should return original strings with available=False."""
    import httpx
    service = TranslationService()
    
    with patch.object(service, "_request_ollama", side_effect=httpx.ConnectError("Connection refused")):
        result = asyncio.run(service.translate_batch(["Metrics", "Node LG-N01"], target_lang="hi"))
        
        assert result["lang"] == "hi"
        assert result["available"] is False
        assert result["translations"] == ["Metrics", "Node LG-N01"]
        assert "unavailable" in result["error"]


def test_api_languages_endpoint(client):
    """GET /api/v1/translate/languages returns supported languages and fallback map."""
    resp = client.get("/api/v1/translate/languages")
    assert resp.status_code == 200
    data = resp.json()
    
    assert "supported" in data
    assert "fallback_map" in data
    
    # Check directly supported codes include mountain languages
    codes = [item["code"] for item in data["supported"]]
    for expected in ["en", "hi", "ne", "as", "bn", "mni", "ml", "ta", "kn"]:
        assert expected in codes
        
    # Check fallback map contains key mountain regions
    assert "gbm" in data["fallback_map"]
    assert "kfy" in data["fallback_map"]
    assert "kha" in data["fallback_map"]
    assert "lep" in data["fallback_map"]


def test_api_translate_ui_endpoint(client):
    """POST /api/v1/translate/ui endpoint handles batch payload."""
    payload = {
        "lang": "en",
        "strings": ["Mission Control", "Geospatial GIS"]
    }
    resp = client.post("/api/v1/translate/ui", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["lang"] == "en"
    assert data["translations"] == ["Mission Control", "Geospatial GIS"]
    assert data["used_fallback"] is False
