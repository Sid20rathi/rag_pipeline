import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.chat_models import init_chat_model
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


# --- 1. Define the Structured Schema (The target output) ---
class ResumeProfile(BaseModel):
    """Structured and summarized data extracted from a user's resume."""
    full_name: str = Field(description="The candidate's full name.")
    total_experience_summary: str = Field(description="A concise summary of the candidate's total professional experience (e.g., '10+ years in Python and Next.js').")
    core_skills: list[str] = Field(description="List of all the skills mentioned in the skill section of the resume, separated into distinct list items (e.g., 'TypeScript', 'PostgreSQL', 'FastAPI').")
    most_relevant_project_summary: list[str] = Field(description="A 2-3 sentence summary of the candidate's most relevant project (like ActionNote) or a major career achievement.")
    projects: list[str] = Field(description="List of all the projects mentioned in the resume,with one line of summary for each project.(eg,'QueryMentor):A website for candidate to prepare for job interviews by providing practice questions and feedback.,'ActionNote':A note-taking app with AI-powered features for better organization and retrieval of information.')")

# --- 2. Setup and PDF Loading ---

# Replace this with the actual path to your resume PDF
PDF_FILE_PATH = "Master_Resume.pdf" 
# Ensure GOOGLE_API_KEY is set in your .env file
API_KEY = os.getenv("GOOGLE_API_KEY") 

def extract_from_pdf(pdf_path: str):
    # Load the PDF content
    loader = PyPDFLoader(pdf_path)
    # This loads the document and splits it by page, which is a good starting point
    documents = loader.load()
    
    # Concatenate all page content into a single string
    full_text = "\n\n".join(doc.page_content for doc in documents)

    if not full_text:
        print(f"Error: Could not read text from {pdf_path}")
        return None

    # --- 3. LLM Setup (Use Groq by changing the model/API setup) ---
    llm = init_chat_model(
        "google_genai:gemini-2.5-flash", 
        api_key=API_KEY
    )
    
    # --- 4. Define the Extraction Chain ---
    # The prompt explicitly asks the LLM to perform the extraction task
    system_prompt = (
        "You are an expert resume parser. Your task is to accurately extract "
        "and summarize the candidate's professional details from the provided text. "
        "The output MUST strictly conform to the provided JSON schema."
    )
    
    extraction_prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Here is the resume text: {resume_text}"),
    ])
    
    # Use the LLM's structured output capability to force JSON
    structured_extractor = extraction_prompt | llm.with_structured_output(ResumeProfile)

    # --- 5. Invoke the Chain ---
    try:
        print(f"Sending {len(full_text)} characters of text to the LLM for structured extraction...")
        
        # Invoke the chain, passing the full text
        parsed_data: ResumeProfile = structured_extractor.invoke({"resume_text": full_text})
        
        # Print the structured result
        print("\n--- Structured Resume Data Extracted ---")
        print(f"Name: {parsed_data.full_name}")
        print(f"Experience: {parsed_data.total_experience_summary}")
        print(f"Skills: {parsed_data.core_skills}...")
        print(f"Projects: {parsed_data.projects}...")
        
        # You would typically store this parsed_data in your PostgreSQL/Neon DB now
        return parsed_data

    except Exception as e:
        print(f"An error occurred during LLM processing: {e}")
        return None


if __name__ == "__main__":
    if not API_KEY:
        print("Please set the GOOGLE_API_KEY environment variable.")
    else:
        # Ensure the PDF path is correct!
        extract_from_pdf(PDF_FILE_PATH)