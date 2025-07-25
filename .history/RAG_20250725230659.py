from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings, OllamaLLM
from langchain.chains import RetrievalQA

# === Setup ===
PERSIST_DIR = "chroma_nomic"

# === Load vector store and models ===
embedding = OllamaEmbeddings(model="nomic-embed-text")
vectordb = Chroma(persist_directory=PERSIST_DIR, embedding_function=embedding)
retriever = vectordb.as_retriever(search_kwargs={"k": 5})
llm = OllamaLLM(model="llama3")
qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

# === FastAPI setup ===
app = FastAPI(title="CampusGPT API")

@app.get("/ask")
def ask_question(query: str = Query(..., description="Your question for CampusGPT")):
    try:
        response = qa_chain.invoke({"query": query})
        return JSONResponse(content={"answer": response['result']})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
