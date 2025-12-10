from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
import getpass
import os
from dotenv import load_dotenv
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
load_dotenv()

goggle_api = os.getenv("GOOGLE_API_KEY")
qdrant_url = os.getenv("QDRANT_URL")
qdrant_api = os.getenv("QDRANT_API_KEY")


pdf_path  = Path(__file__).parent / "Master_Resume.pdf"
loader = PyPDFLoader(pdf_path)



docs = loader.load()


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=100,
    chunk_overlap=20,
    length_function=len,
    is_separator_regex=False,
)
texts = text_splitter.split_documents(docs)


embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

qdrant = QdrantVectorStore.from_documents(
    texts,
    embeddings,
    url=qdrant_url,
    api_key=qdrant_api,
    collection_name="resume_collection",
   
)


