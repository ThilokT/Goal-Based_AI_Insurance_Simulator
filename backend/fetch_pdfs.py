import os
import requests
import logging
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Configuration
GITHUB_TOKEN = os.getenv('GITHUB_PAT')
REPO_OWNER = 'ThilokT'
REPO_NAME = 'ICIC_Product_pdfs'
FOLDER_PATH = '' # Root directory
BRANCH = 'main'

# Default to the absolute path provided, but allow override via environment variable for CI/CD
DEFAULT_SAVE_DIR = r"C:\Users\hp\Downloads\Goal-Based_AI_Insurance_Simulator-main\Goal-Based_AI_Insurance_Simulator-main\backend\data\brochures"
SAVE_DIR = os.getenv("SAVE_DIR", DEFAULT_SAVE_DIR)

# Path to ChromaDB for cleanup
CHROMA_DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "chroma_db")

def has_recent_commits(headers):
    """Check if there are any commits in the last 30 days on the target repository."""
    one_month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    commits_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/commits?sha={BRANCH}&since={one_month_ago}"
    
    logging.info(f"Checking for new commits since {one_month_ago}...")
    try:
        response = requests.get(commits_url, headers=headers, timeout=10)
        response.raise_for_status()
        commits = response.json()
        
        if len(commits) > 0:
            logging.info(f"Found {len(commits)} recent commit(s) in the PDF repository.")
            return True
        else:
            logging.info("No new commits found in the last 30 days.")
            return False
            
    except Exception as e:
        logging.error(f"Failed to fetch commits: {e}")
        # If we fail to check, assume True so we don't accidentally skip an important update
        return True

def cleanup_old_data(save_path):
    """Wipe the existing brochures and ChromaDB data to prevent duplicates and stale files."""
    logging.info("Wiping old PDFs from the brochures folder...")
    try:
        if save_path.exists():
            for item in save_path.iterdir():
                if item.is_file() and item.suffix.lower() == '.pdf':
                    item.unlink()
                    logging.info(f"Deleted old PDF: {item.name}")
    except Exception as e:
        logging.error(f"Error wiping old PDFs: {e}")
        
    logging.info("Wiping existing ChromaDB collection...")
    chroma_path = Path(CHROMA_DB_DIR)
    try:
        if chroma_path.exists() and chroma_path.is_dir():
            shutil.rmtree(chroma_path)
            logging.info("Successfully deleted ChromaDB directory.")
    except Exception as e:
        logging.error(f"Error wiping ChromaDB: {e}")

def fetch_pdfs():
    # Setup headers
    headers = {
        "Accept": "application/vnd.github.v3+json",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    else:
        logging.warning("GITHUB_PAT environment variable not set. API rate limits may apply.")

    # 1. Smart Check
    if not has_recent_commits(headers):
        logging.info("Pipeline skipped: The PDF repository has not changed recently.")
        return

    # 2. Cleanup Data
    save_path = Path(SAVE_DIR)
    cleanup_old_data(save_path)

    try:
        save_path.mkdir(parents=True, exist_ok=True)
        logging.info(f"Save directory verified: {save_path}")
    except Exception as e:
        logging.error(f"Failed to create directory {save_path}: {e}")
        return

    # 3. Setup GitHub API Request for files
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{FOLDER_PATH}?ref={BRANCH}"
    logging.info(f"Fetching contents from {url}")

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except Exception as e:
        logging.error(f"An error occurred fetching contents: {e}")
        return

    contents = response.json()
    if not isinstance(contents, list):
        logging.error("Expected a list of files from GitHub API.")
        return

    # 4. Filter for PDF files
    pdf_files = [item for item in contents if item.get('type') == 'file' and item.get('name', '').lower().endswith('.pdf')]
    
    if not pdf_files:
        logging.info("No PDF files found in the specified repository/folder.")
        return

    logging.info(f"Found {len(pdf_files)} PDF file(s). Starting download...")

    # 5. Download files
    for pdf in pdf_files:
        file_name = pdf['name']
        download_url = pdf['download_url']
        file_path = save_path / file_name

        logging.info(f"Downloading: {file_name}")
        try:
            pdf_response = requests.get(download_url, headers=headers, timeout=15)
            pdf_response.raise_for_status()
            
            with open(file_path, 'wb') as f:
                f.write(pdf_response.content)
            logging.info(f"Successfully downloaded: {file_name}")
            
        except Exception as e:
            logging.error(f"An unexpected error occurred while downloading {file_name}: {e}")

if __name__ == "__main__":
    fetch_pdfs()
