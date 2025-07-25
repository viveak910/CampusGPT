import os
import hashlib
from tqdm import tqdm
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain.vectorstores import Chroma


# === CONFIG ===
DATA_DIR = "data"               # Folder with .txt files
PERSIST_DIR = "chroma_nomic"        # ChromaDB directory
CHUNK_SIZE = 1024                   # Chunk size for splitting
CHUNK_OVERLAP = 128                 # Overlap between chunks

# === FUNCTION: HASHING ===
def file_hash(path):
    """Generate SHA256 hash of file contents."""
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

# === LOAD FILES ===
print(f"📁 Loading files from {DATA_DIR}...")
loader = DirectoryLoader(
    DATA_DIR,
    glob="**/*.txt",
    loader_cls=TextLoader,
    use_multithreading=True,
)
docs = loader.load()
print(f"✅ Loaded {len(docs)} files.")

# === REMOVE DUPLICATES BY HASH ===
seen_hashes = set()
unique_docs = []
for doc in docs:
    h = file_hash(doc.metadata['source'])
    if h not in seen_hashes:
        seen_hashes.add(h)
        doc.metadata['file_hash'] = h
        unique_docs.append(doc)

print(f"🧹 Filtered to {len(unique_docs)} unique files.")

# === CHUNKING ===
print("🔪 Splitting into chunks...")
splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP
)
chunks = splitter.split_documents(unique_docs)
print(f"✅ Created {len(chunks)} chunks.")

# === INIT EMBEDDING MODEL ===
print("🧠 Initializing Nomic embeddings (Ollama)...")
embedding = OllamaEmbeddings(model="nomic-embed-text")

# === STORE EMBEDDINGS IN CHROMA ===
print("📦 Embedding and saving to ChromaDB...")
db = Chroma.from_documents(
    documents=tqdm(chunks, desc="🔁 Embedding"),
    embedding=embedding,                  # ✅ Important fix
    persist_directory=PERSIST_DIR                  # ✅ Enables persist()
)
db.persist()
print(f"✅ All embeddings saved to: {PERSIST_DIR}")
