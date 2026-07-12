import os
import requests
import logging
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

def fetch_pdfs():
    # 1. Ensure save directory exists
    save_path = Path(SAVE_DIR)
    try:
        save_path.mkdir(parents=True, exist_ok=True)
        logging.info(f"Save directory verified: {save_path}")
    except Exception as e:
        logging.error(f"Failed to create directory {save_path}: {e}")
        return

    # 2. Setup GitHub API Request
    # If folder path is empty, we query the root
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{FOLDER_PATH}?ref={BRANCH}"
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    else:
        logging.warning("GITHUB_PAT environment variable not set. API rate limits may apply and private repos won't be accessible.")

    logging.info(f"Fetching contents from {url}")

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
    except requests.exceptions.HTTPError as e:
        logging.error(f"HTTP Error fetching repository contents: {e}")
        if response.status_code == 404:
            logging.error("The repository or folder was not found. Check permissions or path.")
        elif response.status_code == 403:
            logging.error("API rate limit exceeded or access forbidden.")
        return
    except requests.exceptions.Timeout:
        logging.error("Request timed out while fetching repository contents.")
        return
    except requests.exceptions.RequestException as e:
        logging.error(f"An error occurred: {e}")
        return

    contents = response.json()
    
    if not isinstance(contents, list):
        logging.error("Expected a list of files from GitHub API. Received something else.")
        return

    # 3. Filter for PDF files
    pdf_files = [item for item in contents if item.get('type') == 'file' and item.get('name', '').lower().endswith('.pdf')]
    
    if not pdf_files:
        logging.info("No PDF files found in the specified repository/folder.")
        return

    logging.info(f"Found {len(pdf_files)} PDF file(s). Starting download...")

    # 4. Download files
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
            
        except requests.exceptions.HTTPError as e:
            logging.error(f"Failed to download {file_name}. HTTP Error: {e}")
        except requests.exceptions.Timeout:
            logging.error(f"Download timed out for {file_name}.")
        except Exception as e:
            logging.error(f"An unexpected error occurred while downloading {file_name}: {e}")

if __name__ == "__main__":
    fetch_pdfs()
