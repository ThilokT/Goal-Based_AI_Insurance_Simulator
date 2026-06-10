"""
GenAI Chat Service — Insurance Advisor Persona.

Uses LangChain + Gemini with conversation memory for context-aware
financial advisory chat. Includes context extraction to pull structured
user profile data (age, income, goals) from chat history.

Also implements Groq (Llama) fallback for when Gemini is rate-limited.

Usage:
    from ai_services.chat_service import ChatService
    chat = ChatService()
    response = chat.send_message("user-123", "I'm 30 and earn 12 LPA")
"""
import json
import time
from typing import Optional

import google.generativeai as genai
from rich.console import Console

from ai_services.config import (
    GEMINI_API_KEY,
    GROQ_API_KEY,
    CHAT_MODEL,
    GROQ_CHAT_MODEL,
)
from ai_services.models import UserProfile, FinancialGoal

console = Console()

# ── System Prompt (Insurance Advisor Persona) ─────────────

SYSTEM_PROMPT = """You are **LifeMap Advisor**, a friendly, knowledgeable, and empathetic 
AI-powered financial insurance advisor working for a goal-based insurance planning platform.

## Your Personality
- Warm, conversational, and non-judgmental
- You simplify complex insurance and financial concepts
- You use Indian financial context (INR, Indian tax laws, Indian insurance products)
- You never give hard guarantees — always frame as projections and estimates

## Your Job
1. **Understand the user**: Ask about their age, income, family situation, existing 
   coverage, and financial goals through natural conversation.
2. **Identify goals**: Help users articulate life goals — child education, home buying, 
   retirement, family protection, wealth creation, etc.
3. **Educate**: Explain insurance concepts (term vs ULIP vs endowment, riders, etc.) 
   in simple language when relevant.
4. **Recommend**: After understanding the user, suggest appropriate insurance categories 
   (not specific products yet — the recommendation engine handles that).

## Conversation Guidelines
- Start by greeting the user and asking about their primary financial concern
- Ask ONE question at a time — don't overwhelm with multiple questions
- Use follow-up questions to dig deeper into goals
- Acknowledge and validate the user's financial situation
- Keep responses concise (2-4 paragraphs max)
- Use bullet points for lists
- Include relevant emojis sparingly for warmth (💡, ✅, 📊)

## Important Rules
- NEVER recommend specific product names or policy numbers
- NEVER guarantee returns or specific amounts
- ALWAYS include a brief disclaimer when discussing projections
- If the user asks about something outside insurance/financial planning, politely redirect
- If you detect the user is in financial distress, be extra empathetic and suggest 
  professional financial counseling

## Context Extraction
When the user shares personal/financial details, internally note:
- Age, income, expenses
- Number of dependents
- Existing insurance coverage
- Risk appetite indicators
- Specific goals mentioned (with approximate amounts and timelines)
"""

EXTRACTION_PROMPT = """Analyze the following conversation between a financial advisor and a user. 
Extract structured information about the user's profile and financial goals.

Return a valid JSON object with these fields (use null for unknown values):
{{
    "age": <int or null>,
    "annual_income": <float or null, in INR>,
    "monthly_expenses": <float or null, in INR>,
    "existing_coverage": <float or null, in INR>,
    "dependents": <int or null>,
    "risk_appetite": <"conservative" | "moderate" | "aggressive" | null>,
    "city": <string or null>,
    "marital_status": <"single" | "married" | "divorced" | "widowed" | null>,
    "occupation": <string or null>,
    "goals": [
        {{
            "goal_type": <string, e.g., "retirement", "child_education", "home_purchase">,
            "target_amount": <float, estimated in INR>,
            "target_year": <int, calendar year>,
            "priority": <int 1-5, 1=highest>,
            "monthly_contribution": <float or null>,
            "notes": <string or null>
        }}
    ]
}}

IMPORTANT:
- For amounts mentioned in lakhs, convert to INR (1 lakh = 100,000)
- For amounts in crores, convert to INR (1 crore = 10,000,000)
- If the user says "12 LPA", annual_income = 1,200,000
- Estimate target_year from context (e.g., "in 5 years" = current_year + 5)
- If no goals are mentioned, return an empty goals array
- Return ONLY the JSON, no other text

Conversation:
{conversation}
"""


class ChatService:
    """
    Conversational AI service for insurance advisory.

    Manages per-user conversation history, generates contextual responses
    using Gemini (with Groq fallback), and extracts structured user
    profile data from conversations.

    This is a standalone class. P2 wraps it in a `/api/chat` endpoint.
    """

    def __init__(self):
        """Initialize the chat service with Gemini model."""
        self._conversations: dict[str, list[dict]] = {}
        self._gemini_model = genai.GenerativeModel(
            model_name=CHAT_MODEL,
            system_instruction=SYSTEM_PROMPT,
        )
        self._groq_client = None
        self._use_fallback = False
        self._last_gemini_failure: float = 0
        self._fallback_cooldown = 60  # seconds before retrying Gemini

        console.print(f"[green]✅ ChatService initialized (model: {CHAT_MODEL})[/green]")

    def _get_groq_client(self):
        """Lazy-initialize the Groq client for fallback."""
        if self._groq_client is None:
            if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
                console.print("[yellow]⚠️  Groq API key not set — fallback disabled[/yellow]")
                return None
            try:
                from groq import Groq
                self._groq_client = Groq(api_key=GROQ_API_KEY)
                console.print("[green]✅ Groq fallback client ready[/green]")
            except ImportError:
                console.print("[yellow]⚠️  groq package not installed — fallback disabled[/yellow]")
                return None
        return self._groq_client

    def _should_use_fallback(self) -> bool:
        """Check if we should use Groq fallback instead of Gemini."""
        if not self._use_fallback:
            return False
        # Try Gemini again after cooldown period
        if time.time() - self._last_gemini_failure > self._fallback_cooldown:
            self._use_fallback = False
            console.print("[cyan]🔄 Retrying Gemini after cooldown...[/cyan]")
            return False
        return True

    # ── Conversation Management ───────────────────────────

    def get_history(self, user_id: str) -> list[dict]:
        """
        Get conversation history for a user.

        Args:
            user_id: Unique user identifier.

        Returns:
            List of message dicts with 'role' and 'content' keys.
        """
        if user_id not in self._conversations:
            self._conversations[user_id] = []
        return self._conversations[user_id]

    def clear_history(self, user_id: str) -> None:
        """Clear conversation history for a user."""
        self._conversations[user_id] = []
        console.print(f"[dim]🗑️  Cleared history for user {user_id}[/dim]")

    def load_history(self, user_id: str, messages: list[dict]) -> None:
        """
        Load conversation history from an external source (e.g., database).

        Args:
            user_id: Unique user identifier.
            messages: List of message dicts with 'role' and 'content' keys.
        """
        self._conversations[user_id] = messages

    # ── Gemini Chat ───────────────────────────────────────

    def _send_gemini(self, user_id: str, message: str) -> str:
        """Send message via Gemini and return the response text."""
        history = self.get_history(user_id)

        # Build Gemini-compatible history
        gemini_history = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [msg["content"]]})

        chat = self._gemini_model.start_chat(history=gemini_history)
        response = chat.send_message(message)
        return response.text

    # ── Groq Fallback Chat ────────────────────────────────

    def _send_groq(self, user_id: str, message: str) -> str:
        """Send message via Groq (Llama) fallback."""
        client = self._get_groq_client()
        if client is None:
            raise RuntimeError("No fallback provider available")

        history = self.get_history(user_id)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model=GROQ_CHAT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content

    # ── Main Send Method ──────────────────────────────────

    def send_message(self, user_id: str, message: str) -> dict:
        """
        Send a user message and get an AI response.

        Tries Gemini first, falls back to Groq on rate-limit or failure.

        Args:
            user_id: Unique user identifier.
            message: The user's message text.

        Returns:
            Dict with 'response', 'provider', and 'history_length' keys.
        """
        provider = "gemini"

        try:
            if self._should_use_fallback():
                response_text = self._send_groq(user_id, message)
                provider = "groq"
            else:
                try:
                    response_text = self._send_gemini(user_id, message)
                except Exception as e:
                    error_str = str(e).lower()
                    if "rate" in error_str or "429" in error_str or "quota" in error_str:
                        console.print(
                            f"[yellow]⚠️  Gemini rate-limited, switching to Groq: {e}[/yellow]"
                        )
                        self._use_fallback = True
                        self._last_gemini_failure = time.time()
                        response_text = self._send_groq(user_id, message)
                        provider = "groq"
                    else:
                        raise

        except Exception as e:
            console.print(f"[red]❌ Chat error: {e}[/red]")
            response_text = (
                "I apologize, but I'm experiencing technical difficulties right now. "
                "Please try again in a moment. If the issue persists, you can still "
                "explore our product catalog while I get back online. 🔧"
            )
            provider = "error"

        # Update conversation history
        history = self.get_history(user_id)
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": response_text})

        return {
            "response": response_text,
            "provider": provider,
            "history_length": len(history),
        }

    # ── Context Extraction ────────────────────────────────

    def extract_context(self, user_id: str) -> UserProfile:
        """
        Extract structured user profile data from the conversation history.

        Uses the LLM to analyze the full conversation and pull out
        age, income, goals, and other profile data as a UserProfile object.

        Args:
            user_id: The user whose conversation to analyze.

        Returns:
            A validated UserProfile with extracted data.
        """
        history = self.get_history(user_id)
        if not history:
            console.print("[yellow]⚠️  No conversation history to extract from[/yellow]")
            return UserProfile()

        # Format conversation for extraction
        conversation_text = "\n".join(
            f"{msg['role'].upper()}: {msg['content']}" for msg in history
        )

        prompt = EXTRACTION_PROMPT.format(conversation=conversation_text)

        try:
            model = genai.GenerativeModel(CHAT_MODEL)
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

            raw_json = response.text.strip()
            # Clean potential markdown code fences
            if raw_json.startswith("```"):
                raw_json = raw_json.split("\n", 1)[1]
            if raw_json.endswith("```"):
                raw_json = raw_json.rsplit("```", 1)[0]

            data = json.loads(raw_json)

            # Convert goals to FinancialGoal objects
            goals = []
            for g in data.get("goals", []):
                try:
                    goals.append(FinancialGoal(**g))
                except Exception:
                    continue  # Skip malformed goals
            data["goals"] = goals

            profile = UserProfile(**{k: v for k, v in data.items() if v is not None})
            console.print(f"[green]✅ Extracted profile: age={profile.age}, "
                         f"income={profile.annual_income}, "
                         f"goals={len(profile.goals)}[/green]")
            return profile

        except Exception as e:
            console.print(f"[red]❌ Context extraction failed: {e}[/red]")
            return UserProfile()

    def extract_context_from_messages(self, messages: list[dict]) -> UserProfile:
        """
        Extract structured profile from an arbitrary list of messages,
        without requiring a stored conversation.

        Args:
            messages: List of message dicts with 'role' and 'content'.

        Returns:
            A validated UserProfile.
        """
        temp_user_id = "__extraction_temp__"
        self._conversations[temp_user_id] = messages
        profile = self.extract_context(temp_user_id)
        del self._conversations[temp_user_id]
        return profile


# ── CLI Entry Point (Interactive Chat) ────────────────────
def main():
    """Run an interactive terminal chat for testing."""
    chat = ChatService()
    user_id = "test-user"

    console.print("\n[bold cyan]💬 LifeMap Advisor — Interactive Chat[/bold cyan]")
    console.print("[dim]Type 'quit' to exit, 'extract' to see extracted profile[/dim]\n")

    while True:
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() == "quit":
            break
        if user_input.lower() == "extract":
            profile = chat.extract_context(user_id)
            console.print(f"\n[bold]Extracted Profile:[/bold]\n{profile.model_dump_json(indent=2)}\n")
            continue

        result = chat.send_message(user_id, user_input)
        console.print(f"\n[bold green]Advisor ({result['provider']}):[/bold green] {result['response']}\n")


if __name__ == "__main__":
    main()
