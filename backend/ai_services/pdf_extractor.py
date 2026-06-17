"""
Extract structured product data from PDF brochures using LangChain and Gemini.
"""
import json
from pathlib import Path
from typing import Optional

from langchain_community.document_loaders import PyPDFLoader
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from rich.console import Console

from ai_services.models import ScrapedProduct
from ai_services.config import GEMINI_API_KEY, GROQ_API_KEY, CHAT_MODEL

console = Console()

class PDFExtractor:
    def __init__(self):
        # Primary API: Groq (using Llama 3 for fast, high-quality extraction)
        self.groq_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY,
            temperature=0
        )
        # Fallback API: Gemini
        self.gemini_llm = ChatGoogleGenerativeAI(
            model=CHAT_MODEL,
            api_key=GEMINI_API_KEY,
            temperature=0
        )

    def extract_product_from_pdf(self, pdf_path: str, fallback_url: str = "From PDF Extraction") -> Optional[ScrapedProduct]:
        """Reads a PDF and extracts structured product details using Gemini."""
        cache_file = Path(pdf_path).with_suffix('.json')
        if cache_file.exists():
            console.print(f"  [dim]⏭️  Loading cached extraction for {Path(pdf_path).name}...[/dim]")
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return ScrapedProduct(**data)
            except Exception as e:
                console.print(f"  [yellow]⚠️ Failed to load cache {cache_file}: {e}. Re-extracting...[/yellow]")

        console.print(f"  [blue]📄 Extracting details from {Path(pdf_path).name}...[/blue]")
        try:
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()

            # Limit to the first 15 pages to keep token usage within limits for the LLM
            text_for_llm = "\n".join([p.page_content for p in pages[:15]])

            prompt = f"""
You are an expert insurance product analyst. 
Extract the comprehensive product details from the following life insurance brochure text.
Pay special attention to the exact eligibility criteria (min/max age, terms, premium), key features, exclusions, and detailed coverage.

BROCHURE TEXT:
{text_for_llm}

Output the data as a pure JSON object matching this schema exactly:
{{
  "product_name": "string",
  "category": "term_insurance" | "ulip" | "savings" | "retirement" | "child" | "health" | "protection" | "other",
  "description": "string (at least 20 chars)",
  "features": [
    {{
      "feature_name": "string",
      "feature_value": "string",
      "feature_description": "string"
    }}
  ],
  "eligibility": {{
     "key": "value"
  }},
  "source_url": "{fallback_url}"
}}

Output ONLY the JSON, without markdown code blocks (no ```json ... ```).
"""
            import time
            response = None
            
            # ATTEMPT 1: Primary API (Groq)
            try:
                console.print(f"  [dim]⚡ Requesting extraction via Groq API...[/dim]")
                response = self.groq_llm.invoke(prompt)
                time.sleep(2) # tiny pause to respect Groq limits
            except Exception as groq_err:
                console.print(f"  [yellow]⚠️ Groq API failed ({groq_err}). Falling back to Gemini...[/yellow]")
                
                # ATTEMPT 2: Fallback API (Gemini) with retry logic
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        response = self.gemini_llm.invoke(prompt)
                        break  # Success
                    except Exception as e:
                        if attempt < max_retries - 1:
                            console.print(f"  [yellow]⚠️ Gemini API busy (Rate limit/503). Retrying in 65 seconds to clear quota... (Attempt {attempt+1}/{max_retries})[/yellow]")
                            time.sleep(65)  # Wait a full minute to clear the RPM bucket
                        else:
                            raise e # If it still fails after max retries, throw the error
                time.sleep(10) # Brief pause after successful Gemini call to not hammer the API

            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()

            data = json.loads(content)

            # Assign product_code from filename
            if "product_code" not in data or not data["product_code"]:
                data["product_code"] = Path(pdf_path).stem

            product = ScrapedProduct(**data)
            
            # --- FULL PDF RAG CHUNKING ---
            from langchain_text_splitters import RecursiveCharacterTextSplitter
            full_text = "\n".join([p.page_content for p in pages])
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
            )
            chunks = text_splitter.split_text(full_text)
            product.raw_chunks = chunks

            console.print(f"  [green]✅ PDF extracted: {product.product_name} ({len(chunks)} text chunks for RAG)[/green]")
            
            # Save to cache
            try:
                with open(cache_file, "w", encoding="utf-8") as f:
                    f.write(product.model_dump_json(indent=2))
                console.print(f"  [green]💾 Saved extraction cache to {cache_file.name}[/green]")
            except Exception as e:
                console.print(f"  [yellow]⚠️ Failed to save cache {cache_file}: {e}[/yellow]")

            return product

        except Exception as e:
            console.print(f"  [red]❌ Failed to extract from PDF {pdf_path}: {e}[/red]")
            return None
