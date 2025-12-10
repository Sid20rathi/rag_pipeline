import os
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage

load_dotenv()

URL = "https://www.linkedin.com/jobs/view/4321067049/?alternateChannel=search&eBP=CwEAAAGbB25h74f2z43WrVj20EnnCa7cwEHh5t2NmIuE--nFIfNsHb2DvYkRW1g2xw-8I__IH9npVXW_kqxGd9iP34KKUCBEqQWodzKVdNiL_8dTCqJHn11QVUFCAPwdrwz9OZeoOiAht0MsMuKcumnjwCZfDZP8mDntrmc6yl3EtsqUvZpzJcVcGp1ToWR_00xT7B6TyDS1cV-XZ6xD06ECkfxDNQHpEnC8Sh7jLcc-b5E_F8l-CBtzf9ZpGB2G-9IYtL-io-Phji0USEu7eoTZAljqtjj8uEba3QhI805c9nBFx-4SLW2IOS8LxhTTHgs5xi5CW4ZiCzn7ddvdORuF-HCA-4gqFowLud7LjAdjdxGeg4KBzZX77Wed3Sa68qliYA11HC9l4KNN6ATY2gLnkYuUUO0bl4HlhB28zTB7eN8fjoGQgfe_pJqVN47P8UfqXMP7TRgJC6OmF7bBfMzJFLi16af1dhPJaurzWgW9AA&refId=EFlA7FEE1gEPN2bRprigxQ%3D%3D&trackingId=B%2BQmP1b2MiqhRypV56hUag%3D%3D"


def scrape_page_content(url: str) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # ✅ Fix: do NOT wait for networkidle
        page.goto(url, wait_until="domcontentloaded", timeout=60000)

        # Let JS finish rendering
        page.wait_for_timeout(3000)

        content = page.inner_text("body")

        browser.close()
        return content



def summarize_with_gemini(page_text: str) -> str:
    """Use Gemini to extract job descriptions + company info"""

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )

    prompt = f"""
You are a recruiter assistant.

From the text below:
1. Extract all job roles and provide detailed job descriptions.
2. Summarize what the company does.
3. Highlight skills, technologies, experience levels, and locations if available.

TEXT:
{page_text}
"""

    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content


if __name__ == "__main__":
    start = time.time()

    print("🔎 Scraping page...")
    page_text = scrape_page_content(URL)

    print("🧠 Analyzing with Gemini...")
    result = summarize_with_gemini(page_text)

    end = time.time()

    print("\n" + "=" * 80)
    print(result)
    print("=" * 80)
    print(f"⏱️ Time taken: {end - start:.2f}s")
