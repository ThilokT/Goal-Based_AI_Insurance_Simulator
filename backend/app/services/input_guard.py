import re
from typing import Optional

class InputGuard:
    """
    ~80% of attacks use recognizable phrases (OWASP LLM Top 10 research).
    This catches "low-hanging fruit" — script kiddies and bots.
    Remaining 20% is caught by system prompt hardening (Layer 2).
    """
    
    INJECTION_PATTERNS = [
        # Direct instruction override
        r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)",
        r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)",
        r"override\s+(system|previous|all)\s+(prompt|instructions?)",
        
        # Role reassignment
        r"you\s+are\s+now\s+(?!lifemap)",
        r"act\s+as\s+(?!a\s+financial)",
        r"pretend\s+(to\s+be|you\s+are)",
        r"switch\s+to\s+.*mode",
        
        # System prompt extraction
        r"(show|reveal|display|print|output)\s+(your|the)\s+(system\s+)?(prompt|instructions?)",
        
        # Admin impersonation
        r"(i\s+am|this\s+is)\s+(the\s+)?(developer|admin|owner)",
        r"maintenance\s+mode",
        r"debug\s+mode",
    ]
    
    def __init__(self):
        self._compiled = [re.compile(p, re.IGNORECASE) for p in self.INJECTION_PATTERNS]
    
    def check(self, message: str) -> Optional[str]:
        for pattern in self._compiled:
            if pattern.search(message):
                return "Blocked: injection detected"
        
        # Keyword density analysis
        keywords = ["instruction", "prompt", "system", "ignore", "override",
                     "bypass", "jailbreak", "roleplay", "pretend", "admin"]
        words = message.lower().split()
        if len(words) > 5:
            density = sum(1 for w in words if w in keywords) / len(words)
            if density > 0.15:
                return "Blocked: high instruction keyword density"
        return None
