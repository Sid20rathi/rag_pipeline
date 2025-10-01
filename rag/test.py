from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
import getpass
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

google_api = os.getenv("GOOGLE_API_KEY")


if not google_api:
    print("❌ GOOGLE_API_KEY not found in environment variables")
    exit(1)

embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", api_key=google_api)

try:
    vector_db = QdrantVectorStore.from_existing_collection(
        embeddings,
        "my_documents",  
        url="http://localhost:6333",
        prefer_grpc=False
    )
    print("✅ Successfully connected to Qdrant collection")
except Exception as e:
    print(f"❌ Error connecting to Qdrant: {e}")
    exit(1)

user_query = str(input("👦🏻 Ask any Questions:  "))

try:
    search_results = vector_db.similarity_search(user_query, k=3)  # Added k parameter
    print(f"✅ Found {len(search_results)} relevant documents")
    
    
    context = "\n\n".join([
        f"Page Content: {result.page_content}\nPage Number: {result.metadata.get('page', 'N/A')}\nFile Location: {result.metadata.get('source', 'N/A')}" 
        for result in search_results
    ])
    
except Exception as e:
    print(f"❌ Error during similarity search: {e}")
    exit(1)

SYSTEM_PROMPT = f"""
You are a helpful assistant that answers user queries based on the provided context
retrieved from PDF files along with page contents and page numbers.

Context:
{context}

Instructions:
- Answer the user's question using only the provided context
- If the context doesn't contain enough information to answer the question, say so
- Be specific and reference page numbers when available
- Keep your response concise and helpful
"""

try:
   
    client = OpenAI(
        api_key=google_api,  
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )

    
    response = client.chat.completions.create(
        model="gemini-1.5-flash", 
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": user_query
            }
        ],
        temperature=0.1
    )

    print(f"\n🤖: {response.choices[0].message.content}")
    
except Exception as e:
    print(f"❌ Error with Gemini API: {e}")
    print("Make sure you're using the correct model name and API key")