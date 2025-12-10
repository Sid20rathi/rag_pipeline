import google.genai as genai
from google.genai.types import Tool, GenerateContentConfig
import os
import time
from dotenv import load_dotenv

load_dotenv()

os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")



client = genai.Client()
model_id = "gemini-2.5-flash"

tools = [
  {"url_context": {}},
]

url = "https://www.linkedin.com/jobs/view/4321067049/?alternateChannel=search&eBP=CwEAAAGbB25h74f2z43WrVj20EnnCa7cwEHh5t2NmIuE--nFIfNsHb2DvYkRW1g2xw-8I__IH9npVXW_kqxGd9iP34KKUCBEqQWodzKVdNiL_8dTCqJHn11QVUFCAPwdrwz9OZeoOiAht0MsMuKcumnjwCZfDZP8mDntrmc6yl3EtsqUvZpzJcVcGp1ToWR_00xT7B6TyDS1cV-XZ6xD06ECkfxDNQHpEnC8Sh7jLcc-b5E_F8l-CBtzf9ZpGB2G-9IYtL-io-Phji0USEu7eoTZAljqtjj8uEba3QhI805c9nBFx-4SLW2IOS8LxhTTHgs5xi5CW4ZiCzn7ddvdORuF-HCA-4gqFowLud7LjAdjdxGeg4KBzZX77Wed3Sa68qliYA11HC9l4KNN6ATY2gLnkYuUUO0bl4HlhB28zTB7eN8fjoGQgfe_pJqVN47P8UfqXMP7TRgJC6OmF7bBfMzJFLi16af1dhPJaurzWgW9AA&refId=EFlA7FEE1gEPN2bRprigxQ%3D%3D&trackingId=B%2BQmP1b2MiqhRypV56hUag%3D%3D"

start = time.time()
response = client.models.generate_content(
    model=model_id,
    contents=f'''from the provided url {url},please provide me the  job_description ,about_company ,company_name in detail.
    if there is no job description available then please provide me the about_company and company_name in detail.and if company name , about company and job description are not available then return None for the missing fields''',
    config=GenerateContentConfig(
        tools=tools,
    )
)
end = time.time()
print(f"Time taken: {end - start}")
print("-----"*50)

for each in response.candidates[0].content.parts:
    print(each.text)
print("-----"*50)
# For verification, you can inspect the metadata to see which URLs the model retrieved
print(response.candidates[0].url_context_metadata)