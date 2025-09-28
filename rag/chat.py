from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
import getpass
import os
from openai import OpenAI
from dotenv import load_dotenv
from groq import Groq
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
load_dotenv()

google_api = os.getenv("GOOGLE_API_KEY")
qdrant_url = os.getenv("QDRANT_URL")
qdrant_api = os.getenv("QDRANT_API_KEY")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

# FIXED: Correct parameter order
vector_db = QdrantVectorStore.from_existing_collection(
    embedding=embeddings,  # Named parameter
    collection_name="my",  
    url=qdrant_url,
    api_key=qdrant_api,
)

user_query = str(input("👦🏻 Ask any Questions:  "))

search_results = vector_db.similarity_search(user_query, k=3)  # Added k parameter

# FIXED: Corrected typo in 'metadata'
context = "\n\n".join([
    f"Page Content: {result.page_content}\nPage Number: {result.metadata['page']}\nFile Location: {result.metadata['source']}" 
    for result in search_results
])

SYSTEM_PROMPT = f"""
You are a helpful assistant that answers user queries based on the provided context
retrieved from a pdf file along with page contents and page numbers.

provide all the relevant information from the context and answer the user's question and provide the detail answer to the user query.

Context:
{context}

Instructions:
- Answer based only on the provided context
- If the context doesn't contain relevant information, say "I don't have enough information to answer this question based on the document."
- Be concise and helpful
- Reference page numbers when applicable
"""

# FIXED: Correct Gemini API configuration
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)


chat_completion = client.chat.completions.create(
    messages=[
        {
            "role":"system",
            "content": SYSTEM_PROMPT,

        },
        {
            "role": "user",
            "content": user_query,
        },
    ],
    model="llama-3.3-70b-versatile",
)

print(chat_completion.choices[0].message.content)