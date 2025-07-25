from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings, OllamaLLM
from langchain.chains import RetrievalQA

# === Setup ===
PERSIST_DIR = "chroma_nomic"

# === Load vector store ===
embedding = OllamaEmbeddings(model="nomic-embed-text")
vectordb = Chroma(
    persist_directory=PERSIST_DIR,
    embedding_function=embedding
)

retriever = vectordb.as_retriever(search_kwargs={"k": 5})
llm = OllamaLLM(model="llama3")

qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

while True:
    query = input("\n🔍 Ask a question (or type 'exit'): ")
    if query.lower() in ['exit', 'quit']:
        break
    response = qa_chain.invoke({"query": query})
    print(f"\n🤖 Answer: {response}")
