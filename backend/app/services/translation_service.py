import re
import logging
from collections import OrderedDict
from typing import List, Dict, Any, Optional, Tuple
import httpx
from app.config import settings

logger = logging.getLogger("landguard.translation")

# ── Primary Supported Languages (Direct LLM Ingestion) ──────────────────────
SUPPORTED_LANGUAGES: List[Dict[str, Any]] = [
    {
        "code": "en",
        "name": "English",
        "native_name": "English",
        "region": "National & International Lingua Franca",
        "is_fallback": False,
    },
    {
        "code": "hi",
        "name": "Hindi",
        "native_name": "हिन्दी",
        "region": "Uttarakhand, Himachal Pradesh, Jammu & Kashmir (Himalayan Belt)",
        "is_fallback": False,
    },
    {
        "code": "ne",
        "name": "Nepali",
        "native_name": "नेपाली",
        "region": "Sikkim, Darjeeling & Kalimpong Hills",
        "is_fallback": False,
    },
    {
        "code": "as",
        "name": "Assamese",
        "native_name": "অসমীয়া",
        "region": "Assam Hill Tracts, Brahmaputra Gateway to Northeast",
        "is_fallback": False,
    },
    {
        "code": "bn",
        "name": "Bengali",
        "native_name": "বাংলা",
        "region": "Darjeeling Foothills & West Bengal Hill Corridors (NH-10)",
        "is_fallback": False,
    },
    {
        "code": "mni",
        "name": "Manipuri (Meitei)",
        "native_name": "ꯃꯩꯇꯩꯂꯣꯟ",
        "region": "Manipur Hill Districts & Imphal Valley (Tupul Corridor)",
        "is_fallback": False,
    },
    {
        "code": "ml",
        "name": "Malayalam",
        "native_name": "മലയാളം",
        "region": "Western Ghats (Wayanad Scarp, Idukki High Ranges)",
        "is_fallback": False,
    },
    {
        "code": "ta",
        "name": "Tamil",
        "native_name": "தமிழ்",
        "region": "Western Ghats (Nilgiris, Anaimalai, Kodaikanal Hills)",
        "is_fallback": False,
    },
    {
        "code": "kn",
        "name": "Kannada",
        "native_name": "ಕನ್ನಡ",
        "region": "Western Ghats (Kodagu, Uttara Kannada, Malenadu)",
        "is_fallback": False,
    },
]

# ── Documented Fallback Mapping for Hyper-Local & Tribal Languages ─────────
FALLBACK_LANGUAGE_MAP: Dict[str, Dict[str, Any]] = {
    # Central / Western Himalayan Belt
    "gbm": {
        "code": "gbm",
        "name": "Garhwali",
        "native_name": "गढ़वळि",
        "region": "Uttarakhand (Garhwal Himalaya — Chamoli, Kedarnath, Uttarkashi)",
        "fallback": "hi",
        "fallback_name": "Hindi",
        "reason": "Central Pahari language lacking standardized LLM token coverage. Safely routed to Hindi.",
    },
    "kfy": {
        "code": "kfy",
        "name": "Kumaoni",
        "native_name": "कुमाऊँनी",
        "region": "Uttarakhand (Kumaon Himalaya — Nainital, Pithoragarh, Almora)",
        "fallback": "hi",
        "fallback_name": "Hindi",
        "reason": "Central Pahari language lacking standardized LLM token coverage. Safely routed to Hindi.",
    },
    "him": {
        "code": "him",
        "name": "Pahari / Western Pahari",
        "native_name": "पहाड़ी",
        "region": "Himachal Pradesh (Mandi, Kullu, Shimla, Sirmaur)",
        "fallback": "hi",
        "fallback_name": "Hindi",
        "reason": "Western Pahari dialect cluster; LLMs hallucinate syntax. Safely routed to Hindi.",
    },
    "kns": {
        "code": "kns",
        "name": "Kinnauri",
        "native_name": "किन्नौरी",
        "region": "Himachal Pradesh (Kinnaur, Spiti Valley)",
        "fallback": "hi",
        "fallback_name": "Hindi",
        "reason": "Tibeto-Burman language without open LLM training corpus. Safely routed to Hindi.",
    },
    "doi": {
        "code": "doi",
        "name": "Dogri",
        "native_name": "डोगरी",
        "region": "Jammu & Kashmir / HP border hills (Udhampur, Doda)",
        "fallback": "hi",
        "fallback_name": "Hindi",
        "reason": "Indo-Aryan hill language; open LLM generation produces fragmented text. Safely routed to Hindi.",
    },

    # Meghalaya (Shillong Plateau / Garo Hills)
    "kha": {
        "code": "kha",
        "name": "Khasi",
        "native_name": "Ka Ktien Khasi",
        "region": "Meghalaya (Khasi & Jaintia Hills, Cherrapunji)",
        "fallback": "en",
        "fallback_name": "English",
        "secondary_fallback": "as",
        "reason": "Austroasiatic hill language; official state administration in English. Safely routed to English.",
    },
    "grt": {
        "code": "grt",
        "name": "Garo",
        "native_name": "A·chik",
        "region": "Meghalaya (Garo Hills)",
        "fallback": "en",
        "fallback_name": "English",
        "secondary_fallback": "as",
        "reason": "Tibeto-Burman language in Latin script; official state administration in English. Safely routed to English.",
    },

    # Mizoram
    "lus": {
        "code": "lus",
        "name": "Mizo",
        "native_name": "Mizo ṭawng",
        "region": "Mizoram (Aizawl, Lunglei Hills)",
        "fallback": "en",
        "fallback_name": "English",
        "reason": "High English literacy for emergency and disaster communications. Safely routed to English.",
    },

    # Sikkim & Darjeeling Hills (Indigenous Himalayan)
    "lep": {
        "code": "lep",
        "name": "Lepcha",
        "native_name": "Róng",
        "region": "Sikkim (Dzongu, North Sikkim) & Darjeeling",
        "fallback": "ne",
        "fallback_name": "Nepali",
        "reason": "Indigenous Himalayan language without reliable LLM models. Safely routed to Sikkim lingua franca Nepali.",
    },
    "tsj": {
        "code": "tsj",
        "name": "Bhutia",
        "native_name": "འབྲས་ལྗོངས་སྐད",
        "region": "Sikkim & Kalimpong Hills",
        "fallback": "ne",
        "fallback_name": "Nepali",
        "reason": "Tibetic language without reliable LLM tokenization. Safely routed to Sikkim lingua franca Nepali.",
    },

    # Arunachal Pradesh (Eastern Himalayan Tribals)
    "njz": {
        "code": "njz",
        "name": "Nyishi",
        "native_name": "Nyishi",
        "region": "Arunachal Pradesh (Papum Pare, East Kameng, Kurung Kumey)",
        "fallback": "en",
        "fallback_name": "English",
        "secondary_fallback": "hi",
        "reason": "Tani tribal language; official state administrative language is English. Safely routed to English.",
    },
    "adi": {
        "code": "adi",
        "name": "Adi",
        "native_name": "Adi",
        "region": "Arunachal Pradesh (East Siang, Upper Siang)",
        "fallback": "en",
        "fallback_name": "English",
        "secondary_fallback": "hi",
        "reason": "Tani tribal language; official state administrative language is English. Safely routed to English.",
    },
}

LANGUAGE_NAME_LOOKUP = {
    "en": "English",
    "hi": "Hindi",
    "ne": "Nepali",
    "as": "Assamese",
    "bn": "Bengali",
    "mni": "Manipuri (Meitei)",
    "ml": "Malayalam",
    "ta": "Tamil",
    "kn": "Kannada",
}


class TranslationService:
    def __init__(self, cache_size: int = 64):
        # In-memory LRU cache: (tuple(texts), target_lang) -> list[str]
        self._cache: "OrderedDict[Tuple[Tuple[str, ...], str], List[str]]" = OrderedDict()
        self._cache_size = cache_size

    def _cache_get(self, key: Tuple[Tuple[str, ...], str]) -> Optional[List[str]]:
        if key not in self._cache:
            return None
        self._cache.move_to_end(key)
        return self._cache[key]

    def _cache_set(self, key: Tuple[Tuple[str, ...], str], value: List[str]) -> None:
        self._cache[key] = value
        self._cache.move_to_end(key)
        while len(self._cache) > self._cache_size:
            self._cache.popitem(last=False)

    def parse_numbered_translations(self, response_text: str, expected_count: int, fallback_texts: Optional[List[str]] = None) -> List[str]:
        """
        Parses numbered list output (e.g. '1. ...' or '1) ...') from LLM.
        Guarantees strict 1:1 index-ordered correspondence with input items.
        """
        if fallback_texts is None:
            fallback_texts = [""] * expected_count

        lines = [line.strip() for line in response_text.strip().split("\n") if line.strip()]
        numbered_map: Dict[int, str] = {}
        
        # Regex to capture: 1. Text, 1) Text, [1] Text, 1: Text
        num_pattern = re.compile(r"^(?:\[?(\d+)\]?[\.\)\:\-]\s*|\*\*(\d+)[\.\)]\*\*\s*)(.*)$")

        for line in lines:
            match = num_pattern.match(line)
            if match:
                idx_str = match.group(1) or match.group(2)
                content = match.group(3).strip()
                # Strip leading/trailing quotes or markdown bold wrapping
                content = re.sub(r"^\*{1,2}(.*?)\*{1,2}$", r"\1", content).strip('"\'' )
                try:
                    num = int(idx_str)
                    if 1 <= num <= expected_count and content:
                        numbered_map[num] = content
                except ValueError:
                    continue

        results: List[str] = []
        for i in range(1, expected_count + 1):
            if i in numbered_map and numbered_map[i]:
                results.append(numbered_map[i])
            else:
                # Fallback to original text if a particular index was omitted
                results.append(fallback_texts[i - 1] if i - 1 < len(fallback_texts) else "")

        return results

    async def translate_batch(self, texts: List[str], target_lang: str) -> Dict[str, Any]:
        """
        Translates a list of UI strings in a single batch via local Ollama LLM.
        Redirects hyper-local languages via FALLBACK_LANGUAGE_MAP and returns used_fallback status.
        """
        if not texts:
            return {
                "lang": target_lang,
                "translations": [],
                "used_fallback": False,
                "fallback_target": None,
                "note": None,
                "available": True,
            }

        # 1. Check if language is English (pass-through)
        if target_lang.lower() == "en":
            return {
                "lang": "en",
                "translations": texts,
                "used_fallback": False,
                "fallback_target": None,
                "note": None,
                "available": True,
            }

        # 2. Check Fallback Mapping for unsupported hyper-local / tribal languages
        target_lower = target_lang.lower()
        used_fallback = False
        fallback_target: Optional[str] = None
        note: Optional[str] = None
        actual_lang = target_lower

        if target_lower in FALLBACK_LANGUAGE_MAP:
            mapping = FALLBACK_LANGUAGE_MAP[target_lower]
            actual_lang = mapping["fallback"]
            used_fallback = True
            fallback_target = actual_lang
            note = f"Shown in {mapping['fallback_name']} — {mapping['name']} is not reliably supported by LLMs"
            logger.info(f"Language '{target_lang}' redirected via FALLBACK_LANGUAGE_MAP to '{actual_lang}'.")

        # If redirected target happens to be English:
        if actual_lang == "en":
            return {
                "lang": target_lang,
                "translations": texts,
                "used_fallback": used_fallback,
                "fallback_target": fallback_target,
                "note": note,
                "available": True,
            }

        # 2b. Unknown language (not supported, not in fallback map)
        supported_codes = {item["code"] for item in SUPPORTED_LANGUAGES}
        if actual_lang not in supported_codes:
            return {
                "lang": target_lang,
                "translations": texts,
                "used_fallback": False,
                "fallback_target": None,
                "note": None,
                "available": False,
                "error": f"Unsupported language code '{target_lang}'",
            }

        # 3. Check Session Cache
        cache_key = (tuple(texts), actual_lang)
        cached = self._cache_get(cache_key)
        if cached is not None:
            logger.info(f"Serving translation for '{actual_lang}' ({len(texts)} items) from in-memory cache.")
            return {
                "lang": target_lang,
                "translations": cached,
                "used_fallback": used_fallback,
                "fallback_target": fallback_target,
                "note": note,
                "available": True,
            }

        try:
            translations: List[str] = []
            chunk_size = max(1, int(settings.TRANSLATION_CHUNK_SIZE))
            for start in range(0, len(texts), chunk_size):
                chunk = texts[start:start + chunk_size]
                translations.extend(await self._translate_chunk(chunk, actual_lang))
            self._cache_set(cache_key, translations)

            return {
                "lang": target_lang,
                "translations": translations,
                "used_fallback": used_fallback,
                "fallback_target": fallback_target,
                "note": note,
                "available": True,
            }

        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.warning(f"Ollama is unreachable or timed out ({type(exc).__name__}): {exc}")
            return {
                "lang": target_lang,
                "translations": texts,
                "used_fallback": used_fallback,
                "fallback_target": fallback_target,
                "note": note,
                "available": False,
                "error": f"Ollama connection unavailable or timed out ({type(exc).__name__})",
            }
        except Exception as exc:
            logger.error(f"Unexpected error in translate_batch: {exc}", exc_info=True)
            return {
                "lang": target_lang,
                "translations": texts,
                "used_fallback": used_fallback,
                "fallback_target": fallback_target,
                "note": note,
                "available": False,
                "error": str(exc),
            }

    async def _translate_chunk(self, texts: List[str], actual_lang: str) -> List[str]:
        lang_display_name = LANGUAGE_NAME_LOOKUP.get(actual_lang, actual_lang)
        numbered_input = "\n".join(f"{i + 1}. {text}" for i, text in enumerate(texts))
        prompt = (
            f"You are a professional geotechnical and disaster early-warning UI translator.\n"
            f"Translate each numbered line of English UI text into {lang_display_name} ({actual_lang}).\n"
            f"Requirements:\n"
            f"1. Return ONLY the numbered list with the exact same numbers in numerical order (1 to {len(texts)}).\n"
            f"2. Keep domain terms accurate for civil/landslide engineering.\n"
            f"3. Do NOT include greetings, intro sentences, notes, or explanations.\n\n"
            f"{numbered_input}"
        )
        llm_response = await self._request_ollama(prompt)
        return self.parse_numbered_translations(llm_response, len(texts), fallback_texts=texts)

    async def _request_ollama(self, prompt: str) -> str:
        ollama_url = f"{settings.OLLAMA_HOST.rstrip('/')}/api/generate"
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "top_p": 0.9,
            },
        }
        async with httpx.AsyncClient(timeout=settings.TRANSLATION_TIMEOUT_SECONDS) as client:
            resp = await client.post(ollama_url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Ollama HTTP {resp.status_code}")
            return resp.json().get("response", "")

    def get_languages_metadata(self) -> Dict[str, Any]:
        """Returns the structured list of directly supported languages and regional fallback maps."""
        return {
            "supported": SUPPORTED_LANGUAGES,
            "fallback_map": FALLBACK_LANGUAGE_MAP,
            "default_model": settings.OLLAMA_MODEL,
        }


translation_service = TranslationService()
