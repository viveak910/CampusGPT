import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from queue import Queue
import threading

BASE_URL = "https://vce.ac.in/"
DOWNLOAD_DIR = "vce_scraped_modified_2015_plus"
MAX_WORKERS = 10  # Adjust as needed

visited = set()
lock = threading.Lock()
url_queue = Queue()

def is_valid_url(url):
    parsed = urlparse(url)
    return parsed.netloc == "vce.ac.in"

def is_recent_file(url):
    try:
        head = requests.head(url, timeout=10, allow_redirects=True)
        if "Last-Modified" in head.headers:
            last_modified = head.headers["Last-Modified"]
            last_modified_date = datetime.strptime(last_modified, "%a, %d %b %Y %H:%M:%S %Z")
            return last_modified_date.year >= 2015
        else:
            return False
    except Exception as e:
        print(f"[Error Checking Date] {url} - {e}")
        return False

def download_file(url):
    filename = url.replace("https://vce.ac.in/", "").replace("/", "_")
    local_path = os.path.join(DOWNLOAD_DIR, filename)
    try:
        with requests.get(url, stream=True, timeout=10) as r:
            if r.status_code == 200:
                with open(local_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"[Downloaded] {url}")
    except Exception as e:
        print(f"[Error Downloading] {url} - {e}")

def crawl_page(url):
    with lock:
        if url in visited or not is_valid_url(url):
            return
        visited.add(url)

    print(f"[Crawling] {url}")
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Save HTML page (optional)
        local_path = os.path.join(DOWNLOAD_DIR, url.replace(BASE_URL, "").replace("/", "_") + ".html")
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'w', encoding='utf-8') as f:
            f.write(soup.prettify())

        file_urls = []
        next_links = []

        for tag in soup.find_all(['a', 'link', 'script']):
            href = tag.get('href') or tag.get('src')
            if href:
                full_url = urljoin(url, href)
                if any(full_url.endswith(ext) for ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx']):
                    file_urls.append(full_url)

        for link in soup.find_all('a', href=True):
            next_url = urljoin(url, link['href'])
            if is_valid_url(next_url):
                next_links.append(next_url)

        # Add new pages to crawl
        with lock:
            for link in next_links:
                if link not in visited:
                    url_queue.put(link)

        # Parallel file downloads
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as file_pool:
            futures = [file_pool.submit(download_file, url)
                       for url in file_urls if is_recent_file(url)]
            for _ in as_completed(futures):
                pass

    except Exception as e:
        print(f"[Error Crawling] {url} - {e}")

def main():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    url_queue.put(BASE_URL)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        while not url_queue.empty():
            tasks = []
            for _ in range(min(url_queue.qsize(), MAX_WORKERS)):
                next_url = url_queue.get()
                tasks.append(executor.submit(crawl_page, next_url))
            for _ in as_completed(tasks):
                pass

if __name__ == "__main__":
    main()
