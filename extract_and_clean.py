import os
import fitz  # PyMuPDF
from bs4 import BeautifulSoup

RAW_DIR = "data"
PROCESSED_DIR = "data/processed"

def extract_text_from_pdf(file_path):
    text = ""
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        print(f"[PDF Error] {file_path}: {e}")
    return text

def extract_text_from_html(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')
            return soup.get_text(separator="\n", strip=True)
    except Exception as e:
        print(f"[HTML Error] {file_path}: {e}")
        return ""

def process_files():
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    for filename in os.listdir(RAW_DIR):
        raw_path = os.path.join(RAW_DIR, filename)
        if not os.path.isfile(raw_path):
            continue

        name, ext = os.path.splitext(filename)
        output_path = os.path.join(PROCESSED_DIR, f"{name}.txt")

        if ext.lower() == ".pdf":
            text = extract_text_from_pdf(raw_path)
        elif ext.lower() == ".html":
            text = extract_text_from_html(raw_path)
        else:
            continue  # skip unsupported formats

        if text.strip():
            with open(output_path, 'w', encoding='utf-8') as out:
                out.write(text)
            print(f"[Extracted] {output_path}")
        else:
            print(f"[Skipped empty] {filename}")

if __name__ == "__main__":
    process_files()
