import os
import time
import asyncio
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

class JobDetails(BaseModel):
    """Structured data extracted from the job posting summary."""
    job_description: str = Field(description="The detailed description of the job role and responsibilities.")
    about_company: str = Field(description="The general information about the company.")
    company_name: str = Field(description="The name of the company posting the job.")

URL = "https://www.linkedin.com/jobs/view/4338316134/?alternateChannel=search&eBP=CwEAAAGbESYQs7n9qC5MJBHZZpdINcYrx7pXgVpPNhc2R6UXGa3GRQVPpJ5MlpKMcl3B-2Y-6dvfDd2PPALj-9hBFapyEbc7PiwEahrWLJ4DKBF0_y5mF87iOcL1Z-RSVhprHVcaqC6Rz0tj84nM-sDnRDjQMHIsbTIFNU3JZVy1YamjvkPIg4cRzgF1Ga6xjetV28B7G0cvrcIibkDub4-P6A2g5X2ixct5UqN0Uw5HHhUqwHbILt2Z3lmjcR3vaR3WqckxrKzhgJmSVlOXWFIVOSqT2C-w_H52ciW_VD5708ez2Sn0CG_aQNGkZA-p7vn6yYAXUcnc5RWJKo5Y37f758m6LjTaKXOh2gHMr97fswTXyka7GUa0WIcXf8jbO4_GNMxf057cGd6nL5kEdSOdlIXnL3mhkPVFIYhFWdDwQYQRTqgyVWA0xyhVGnffj-QToIRN-jtvi2AV4WG4hKMr8bO07DMqBZT-m8bXtDecfQ&refId=M0JvNOUUA12VLv65epD5%2Bg%3D%3D&trackingId=IWtoALE15O5RYqPDSlmhqA%3D%3D"

async def scrape_page_content(url: str) -> str:
    """Async function to scrape page content using Playwright"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the page
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        # Wait for content to load
        await page.wait_for_timeout(3000)

        # Get the page content
        content = await page.inner_text("body")

        # Close browser
        await browser.close()
        return content

def summarize_with_gemini(page_text: str) -> JobDetails:
    """Use Gemini to extract job descriptions + company info"""
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )

    parser_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a recruiter assistant. Your task is to extract the required fields from the following text. From the text below: 1. provide detailed job descriptions. 2. Summarize what the company does. 3. Highlight skills, technologies, experience levels, and locations if available."),
        ("human", "Text to parse: {text}"),
    ])
    
    structured_parser = parser_prompt | llm.with_structured_output(JobDetails)
    response = structured_parser.invoke({"text": page_text})
    return response

async def main():
    """Main async function to run the scraping and analysis"""
    start = time.time()

    print("🔎 Scraping page...")
    page_text = await scrape_page_content(URL)

    print("🧠 Analyzing with Gemini...")
    result = summarize_with_gemini(page_text)

    end = time.time()

    print("\n" + "=" * 80)
    print(result)
    print("=" * 80)
    print("job_description:", result.job_description)
    print("=" * 80)
    print("about_company:", result.about_company)
    print("=" * 80)
    print("company_name:", result.company_name)
    print(f"⏱️ Time taken: {end - start:.2f}s")

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())