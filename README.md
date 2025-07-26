# CampusGPT
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-v3.10+-blue.svg)
![React](https://img.shields.io/badge/react-18.0+-61DAFB.svg)

**CampusGPT** is a fully local, ChatGPT-style AI assistant designed for a college website (vce.ac.in). It continuously crawls and indexes all college-related content (HTML pages, PDFs, etc. from 2015 onward) into a vector database, and allows students to ask natural language questions to retrieve accurate, up-to-date information. The system is built on a Retrieval-Augmented Generation (RAG) pipeline, combining information retrieval with a local Large Language Model (LLM) to generate answers. Everything runs **offline on local devices** – no cloud services required – ensuring privacy and fast responses tailored to the college’s data.

## Key Features

* **Fully Offline Operation:** Runs entirely on local hardware with no cloud dependence. All data processing (scraping, embedding, and inference) and LLM querying are done locally, ensuring privacy and availability even without internet.
* **Comprehensive Campus Data Index:** Aggregates years of college content (news circulars, academic announcements, event brochures, etc.) dating from 2015 to present, by scraping the official website. Only recent and relevant files are downloaded (checks HTTP Last-Modified date to include 2015+ content), avoiding outdated data.
* **Automated Web Scraping Pipeline:** Uses Python `requests` and **BeautifulSoup** to crawl the site, following internal links recursively and queuing downloads. PDF, DOC, XLS files are identified and downloaded concurrently with a thread pool for efficiency. The crawler skips external links and avoids re-downloading files by tracking visited URLs.
* **Intelligent Data Processing:** Downloaded HTML pages are parsed to text, and PDFs/Docs are converted to text (via **PyMuPDF** for PDFs). Custom parsing and cleaning ensure that boilerplate navigation text is removed, focusing on main content.
* **Incremental Embedding with Deduplication:** All textual data is chunked and embedded into a **ChromaDB** vector store. The ingestion script computes a SHA-256 hash for each file and skips duplicates, enabling incremental updates – newly added documents can be embedded without reprocessing the entire dataset. This approach scaled to \~2.4 million text chunks in testing, demonstrating support for large corpora.
* **RAG Query Answering:** Combines vector search with a local LLM to answer questions. Uses **Nomic’s open-source embedding model** (via Ollama) to vectorize queries and documents – a high-performance text encoder with a large context window. Top \$k\$ (e.g. 5) relevant chunks are retrieved from Chroma for each query, and fed into the LLM to generate a context-informed answer. This ensures answers are grounded in actual campus data and reduces hallucinations.
* **Local LLM (Llama 3/Mistral):** Employs a 100% offline LLM (through **Ollama**), such as *Llama 3* or *Mistral*, to generate answers. The FastAPI backend wraps the LLM inference, so when a question is asked, the system assembles the prompt with retrieved context and the LLM produces a conversational answer. No OpenAI/API keys needed – the models run on-device via Ollama’s serving backend.
* **Realtime Chat Interface:** A React-based frontend provides an interactive chat experience akin to ChatGPT. Users can ask questions in a chat UI and receive answers with reference to college info. The interface updates dynamically and supports follow-up questions in context (since the backend retains no session state, each query is independent but the user can copy previous answers as needed).
* **Robust API Backend:** The Python **FastAPI** server handles queries from the frontend. It exposes a GET endpoint `/ask` that accepts a question and returns a JSON answer. CORS is enabled for the local dev frontend. The backend orchestrates the retrieval (via LangChain) and LLM inference, and is designed to handle multiple concurrent queries.

## Architecture Overview

The system follows a two-phase RAG architecture: (1) data ingestion (crawling, embedding indexing) and (2) query-time retrieval & generation. The diagram below illustrates this pipeline:
<img width="1536" height="1024" alt="rag overview" src="https://github.com/user-attachments/assets/9508db45-34b4-4160-8f53-6483c81b0f69" />
*Figure 1: Data ingestion pipeline – CampusGPT scrapes the website, converts documents to text, splits into chunks, and generates embeddings for each chunk using Nomic’s model. All embeddings are stored in a local ChromaDB vector index for fast similarity search.*

During **data ingestion**, CampusGPT crawls the college website to collect content and then builds a vector search index:

* **Web Crawling & Download:** The `scrape_site.py` script starts from the base URL and performs a breadth-first crawl of all internal links. It uses up to 10 worker threads to fetch pages in parallel. For each HTML page, it saves a local copy and extracts links to downloadable files (PDFs, Word, Excel). Before downloading a file, it checks the file’s HTTP Last-Modified header to ensure it’s from year ≥ 2015 (ignoring older content). Files are saved with unique names (paths converted to filenames). This process yields a folder of raw HTML and PDF documents (`vce_scraped_modified_2015_plus/`).
* **Content Extraction:** The `extract_and_clean.py` script processes the raw files to generate clean text. HTML files are parsed with BeautifulSoup to extract visible text, and PDFs are opened with PyMuPDF (`fitz`) to extract textual content. The script outputs `.txt` files for each document (stored under `data/processed/`). Basic cleaning (removing excessive whitespace, etc.) is done to optimize the text for embedding.
* **Chunking & Embedding:** The `embed.py` script prepares the text data for the vector database. It loads all `.txt` files (using LangChain’s DirectoryLoader), and removes any duplicate files by hashing their contents (this prevents re-indexing the same content twice, useful if the crawl is run periodically). Next, each document is split into smaller chunks (default \~1024 characters with 128 overlap) for better semantic embedding. A Nomic embedding model is run locally via Ollama to generate a high-dimensional vector for each chunk. These chunk vectors, along with metadata (source file, etc.), are stored in a persistent ChromaDB index on disk. The resulting index allows similarity search – given a query vector, we can quickly find relevant document chunks.
<img width="1536" height="1024" alt="GPT flow" src="https://github.com/user-attachments/assets/02060cb0-2812-4106-9f48-d08b44da75de" />
*Figure 2: Query retrieval and answer generation – At query time, CampusGPT embeds the user’s question, finds the most relevant chunks from the vector store, and constructs a prompt for the LLM. The local LLM (Llama 3/Mistral via Ollama) then generates a helpful answer using both the query and retrieved context.*

During **query time**, the system uses the stored embeddings and the LLM to answer user questions in natural language:

* **User Query Embedding:** When a user asks a question (via the chat UI or API), the backend first embeds this query using the same Nomic embedding model. This yields a vector representing the semantic meaning of the question.
* **Retrieval of Relevant Context:** Using the query vector, the system performs a similarity search in the ChromaDB index. It retrieves the top *k* most relevant text chunks (by cosine similarity) – typically, the 5 best-matching chunks are fetched to serve as context. These chunks might be excerpts from a relevant circular, a FAQ page, an academic calendar PDF, etc., that are related to the user’s question.
* **Constructing the Prompt:** The retrieved pieces of text are then combined with the user’s question to form a prompt for the LLM. For example, if the question is *“When is the last date to pay semester fees?”*, the retrieved context might include a chunk from a fees notification PDF mentioning the deadline. The prompt is formatted to include this context (often as a few quoted passages or a system message) followed by the question. This primes the LLM with factual data to base its answer on.
* **LLM Generation (Answering):** The prompt is passed to the local LLM (running via Ollama’s API). CampusGPT uses **LangChain** to interface with the LLM (OllamaLLM wrapper) and executes a RetrievalQA chain. The LLM (e.g. *Llama 3* or *Mistral* model) then produces a fluent answer in natural language, citing information from the retrieved context. For instance, it might answer: *“The last date to pay semester fees is March 10, 2025, as per the Finance Department circular dated Feb 20, 2025.”* The answer is returned as JSON from the FastAPI endpoint.
* **Frontend Display:** The React frontend receives the answer and displays it in a chat bubble format. It can also highlight or list the source document titles (if implemented) so the user knows where the information came from. The interface supports iterative Q\&A – the user can ask another question or clarify further. (Each query is handled independently by the backend, but the user can manually refer to earlier context if needed.)

This RAG approach ensures the answers are grounded in actual college data. Even if the LLM is small (running on a CPU, for example), providing it with relevant text snippets greatly improves the accuracy of responses. The system effectively functions like a specialized “college wiki chatbot,” retrieving exact details from official documents and delivering them in a conversational manner.

## Tech Stack

CampusGPT is built with the following technologies:

* **Python FastAPI:** Powers the backend REST API (`/ask` endpoint) for handling user queries. FastAPI was chosen for its high performance and easy integration with async IO (used for concurrent processing if needed). The backend logic loads the vector index and LLM chain at startup and handles queries in real-time.
* **React & TypeScript:** Used for the frontend web application. The React app provides a ChatGPT-like chat interface where users can type questions and view answers in a conversational format. It interacts with the FastAPI backend via HTTP requests. The UI is designed to be clean and responsive, making it easy for students to use.
* **LangChain (with Community Extensions):** Employed to streamline the RAG implementation. LangChain’s abstractions for loaders, text splitters, vector stores, and LLM chains greatly accelerated development. The project uses the `langchain_community` extensions like `DirectoryLoader` for loading files and `OllamaEmbeddings` for embedding via Ollama. The **RetrievalQA** chain from LangChain ties together the retriever and LLM for end-to-end query answering.
* **ChromaDB:** Serves as the vector database for document embeddings. Chroma was selected for its simplicity and performance in local deployments. The embeddings are stored persistently on disk (`chroma_nomic/` directory) so that the index can be reused across sessions without re-computation. With approximately 2.4 million chunks indexed, Chroma has demonstrated the ability to handle large scale data while still returning nearest neighbors within milliseconds.
* **Ollama + Local LLMs:** Ollama is used to run language models and embedding models locally. It provides an API to load models like *nomic-embed-text* (for embeddings) and *llama3* or *Mistral* (for text generation). The **Nomic Embeddings** model offers high-quality vector representations (reportedly outperforming OpenAI’s Ada embeddings on many tasks) and was crucial for effective document retrieval. The generative model (Llama 3/Mistral) is a cutting-edge open-source LLM that can run on consumer hardware (with quantization and GPU acceleration), enabling the chatbot to generate answers without any external API.
* **BeautifulSoup & Requests:** Used for web scraping and HTML parsing. `requests` handles HTTP interactions (including PDF downloads and HEAD requests for metadata), while BeautifulSoup parses HTML content to extract text and find links. This combo provides the “eyes and ears” of CampusGPT to gather the raw data from the website.
* **PyMuPDF (fitz):** A lightweight PDF reading library to extract text from PDF files. It is faster and more reliable for text extraction than some alternatives, and it preserves layout order which is useful for lengthy documents like annual reports or course handbooks.
* **Tqdm:** Provides progress bars in the console during long-running operations (like embedding millions of chunks), giving feedback to the developer/admin when updating the index.
* **Concurrent.futures (ThreadPool):** Utilized in the crawling stage to download multiple files in parallel. This significantly speeds up the ingestion of a large number of PDFs and pages by utilizing multiple threads for I/O-bound network operations.

## Installation and Setup

Follow these steps to install and run CampusGPT on your local machine:

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/viveak910/CampusGPT.git  
   cd CampusGPT
   ```

2. **Install Python Dependencies:** It’s recommended to use Python 3.10+ (tested on 3.11). Install required packages via pip:

   ```bash
   pip install fastapi uvicorn bs4 requests pymupdf tqdm langchain langchain-community langchain-ollama chromadb
   ```

   *Note:* The `langchain-ollama` and `langchain-community` packages provide the Ollama integration and extra loaders used in this project. Ensure these are installed to avoid import errors.

3. **Install Node and Frontend Dependencies:** Make sure you have Node.js (>= 18) and npm installed. Then install the React app’s packages:

   ```bash
   cd frontend  
   npm install  
   cd ..
   ```

   This will download all the required React/TypeScript packages for the chat interface.

4. **Install Ollama and Models:** CampusGPT relies on Ollama to run the models locally. Install Ollama by following instructions on the [official site](https://ollama.com/download) (available for Mac and Linux). Once installed, download the needed models by running:

   ```bash
   ollama pull nomic-embed-text  
   ollama pull llama3   # or ollama pull mistral
   ```

   This will fetch the Nomic embedding model and the LLM. *(Note: “llama3” here refers to the model available via Ollama. You can substitute a different model name if desired, but be sure to also update the code in `RAG.py` accordingly.)*

5. **Scrape the Website Content:** *(Optional – skip if you already have data to use)*
   Run the scraper to fetch the latest data from the college website:

   ```bash
   python scrape_site.py
   ```

   This will crawl **vce.ac.in** and download all pages and files (PDFs, etc.) updated in 2015 or later. The process might take a while on first run, depending on the size of the site and your network speed. All downloaded files will be saved under the directory specified by `DOWNLOAD_DIR` (default is `vce_scraped_modified_2015_plus/`). You can monitor the console output for progress (crawled pages and downloaded files).

6. **Extract Text from Files:** Once scraping is complete, convert the raw HTML/PDF files into plain text for embedding:

   ```bash
   python extract_and_clean.py
   ```

   By default, this script looks at a directory called `data/` for input files. You should do one of the following before running it:

   * Move or copy the contents of `vce_scraped_modified_2015_plus/` into the `data/` folder, **OR**
   * Edit `extract_and_clean.py` and set `RAW_DIR` to `"vce_scraped_modified_2015_plus"` (and possibly adjust `PROCESSED_DIR`).
     The script will output text files to `data/processed/` (or your configured `PROCESSED_DIR`). Each PDF or HTML becomes a `.txt` file containing its textual contents.

7. **Prepare Data for Embedding:** Now, consolidate the processed text files for embedding. For simplicity, move all files from `data/processed/` into the `data/` directory (since `embed.py` by default reads from `data/`). Ensure that `data/` now contains all the `.txt` files you want to index. You can remove any irrelevant files if needed.

8. **Embed the Documents:** Run the embedding script to generate vector embeddings and build the ChromaDB index:

   ```bash
   python embed.py
   ```

   This will load all texts from `data/`, remove duplicate files (by hashing content), split the texts into chunks of \~1024 characters, and invoke the Nomic embedding model for each chunk. This step may take significant time for a large number of documents (progress is shown with a tqdm bar). Upon completion, a new directory `chroma_nomic/` will appear, containing the persisted Chroma database with all embeddings. You only need to run this again when new data is added; it will append new embeddings without duplicating existing ones.

9. **Launch the Backend API Server:** Start the FastAPI app using Uvicorn (or another ASGI server):

   ```bash
   uvicorn RAG:app --host 0.0.0.0 --port 8000 --reload
   ```

   This will spin up the CampusGPT API on localhost (port 8000). The server will load the ChromaDB index and connect to the Ollama LLM on startup. You should see console logs indicating that the embeddings were loaded and the server is running. The `--reload` flag is optional (used for development to auto-reload on code changes).

10. **Run the Frontend (Chat Interface):** In a separate terminal, start the React development server:

    ```bash
    cd frontend  
    npm start
    ```

    This will run the app in development mode on [http://localhost:3000](http://localhost:3000). Your browser should open automatically; if not, visit that URL manually. The React app is configured (via proxy or CORS) to communicate with the backend at port 8000. You’ll see a chat window in your browser.

11. **Ask Questions!** With both the backend and frontend running, you can now interact with CampusGPT. Type a question in the chat box (for example: *“What events are coming up in December?”* or *“When was the last academic council meeting, and what decisions were made?”*). The assistant will respond with an answer sourced from the college’s data. Behind the scenes, the query hits the FastAPI `/ask` endpoint, which returns JSON like `{"answer": "… text ..."}` that the frontend displays. If the answer seems incomplete or you want more details, you can ask follow-up questions. The system is stateless per question, but since all relevant text is stored, you can inquire further on any topic covered in the documents.

**Note:** The very first query to the system might be a bit slower because the LLM model weights need to be loaded into memory by Ollama. Subsequent queries will be faster. The retrieval step (vector search) is extremely fast (few milliseconds even for millions of vectors), so most of the response time depends on the LLM’s generation speed and the size of the answer.

## Usage Example

Once set up, CampusGPT can answer a wide range of questions about the college. Here are a few example interactions to demonstrate its capabilities:

* *User:* **“What is the accreditation grade of the college?”**
  *CampusGPT:* The college is accredited by NAAC with an **“A++” grade**, indicating the highest level of academic excellence (as stated in the About section of the college website).

* *User:* **“List some upcoming cultural events on campus.”**
  *CampusGPT:* Our college’s cultural club has announced two upcoming events: **TechFest 2025** in March and **Cultural Day** in April. TechFest 2025 will include inter-collegiate hackathons, coding contests, and robotics workshops, while Cultural Day (April 20, 2025) will showcase student performances in music, dance, and drama. (These details are drawn from the Events circular released on Jan 10, 2025.)

* *User:* **“When do the mid-term exams start for CSE third year?”**
  *CampusGPT:* According to the academic calendar, the mid-term exams for 3rd year B.Tech (CSE) start on **15th February 2025**. The timetable was published in the exam notification dated Dec 22, 2024, which also notes that practical exams will follow in the first week of March 2025.

These examples illustrate how CampusGPT provides concise answers with specific details from official sources. The system is particularly useful for quickly finding information in lengthy documents (like finding a date in a PDF) or summarizing relevant points across multiple memos.

## Project Structure

For reference, here is an overview of the repository structure and important files:

```
CampusGPT/
├── scrape_site.py          # Web crawler to download site content (HTML, PDFs)
├── extract_and_clean.py    # Extracts text from raw files (HTML -> text, PDF -> text)
├── embed.py                # Chunks texts and generates embeddings, stores in ChromaDB
├── RAG.py                  # FastAPI app that handles retrieval and LLM QA (the backend)
├── data/                   # Directory to place text files for embedding (and/or raw files)
├── chroma_nomic/           # Directory where ChromaDB stores the vector index (created after running embed.py)
├── frontend/               # React frontend source code (chat interface)
│   ├── src/...             # React components, hooks, etc.
│   └── public/...          # Static assets
└── progress.json           # *(Optional/unused)* Placeholder for tracking crawl progress or metadata
```

* **`scrape_site.py`:** Contains the crawling logic using Python’s `requests` and multi-threading. It filters URLs to only the college’s domain and looks for file links. You can adjust parameters here like `MAX_WORKERS` (threads) or file types to include.
* **`extract_and_clean.py`:** Uses BeautifulSoup to parse HTML and PyMuPDF (`fitz`) for PDFs. If needed, you can extend this to handle other file types (e.g., DOCX via python-docx) or apply additional cleaning (regex to remove unwanted sections).
* **`embed.py`:** Uses LangChain’s `DirectoryLoader` to read all text files and then `RecursiveCharacterTextSplitter` to make chunks (currently 1024 chars with 128 overlap). It then initializes `OllamaEmbeddings(model="nomic-embed-text")` and creates a Chroma vector store from the documents. The `db.persist()` call ensures the index is saved to disk, so you don’t lose the embeddings on restart.
* **`RAG.py`:** The main API implementation. It sets up the FastAPI app and defines the `/ask` endpoint. On startup, it loads the persisted Chroma index (from `chroma_nomic`) and connects to the Ollama LLM. The `/ask` endpoint function simply takes the query, uses the LangChain `RetrievalQA` chain (`qa_chain.invoke`) to get an answer, and returns the answer as JSON. If you wanted to add more endpoints (for example, to add new documents on the fly or get sources), you could extend this file.
* **`frontend/src/`:** This contains the React app source. Notable components might include a chat window component, input box, and message list. The frontend likely calls the backend using `fetch` or axios – for instance, sending GET requests to `http://localhost:8000/ask?query=<user question>` and then displaying the response. (Ensure the backend is running and CORS is allowed – the code in `RAG.py` sets `allow_origins=["*"]` which is fine for local use.)

## Future Improvements

CampusGPT is fully functional, but there are opportunities to enhance it further:

* **Improved Freshness Tracking:** Currently, the scraper filters by year (2015+); a more sophisticated approach could track the last crawl time and only fetch new or modified content since the last run. Storing checksums or using `progress.json` to record crawled URLs and their last-modified dates would allow incremental updates without re-downloading unchanged files.
* **User Interface Features:** The chat UI could be enhanced with features like chat history, the ability to provide feedback on answers, or buttons to quickly open the source document for an answer. This would improve user trust and transparency, allowing them to verify answers against the original document.
* **Model Flexibility:** Integrating a mechanism to easily switch the LLM (for example, choosing between Llama 2, Llama 3, Mistral 7B, etc.) based on the hardware capabilities. This can be done by externalizing the model name to a config and possibly supporting model quantization for lower-end devices.
* **Answer Source Citations:** In a future update, the system could return source references along with the answer (e.g., “according to *Academic Calendar 2024-25* page 3”). LangChain’s `RetrievalQA` chain can be configured with `return_source_documents=True` to get the actual source texts used. These could then be displayed in the UI or used to generate reference footnotes in answers.
* **Deployment:** Although designed for local use, CampusGPT can be containerized (Docker) for ease of deployment. The FastAPI app and Ollama (which also provides a Docker image) can be orchestrated together. This would allow running the entire stack on a server or VM as an internal service for the college (while still not relying on external internet once set up).
