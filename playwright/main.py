from langchain_community.agent_toolkits import PlayWrightBrowserToolkit
from langchain_community.tools.playwright.utils import create_sync_playwright_browser
from langchain.agents import AgentExecutor, create_react_agent
from langchain_openai import ChatOpenAI
from langchain.chat_models import init_chat_model
from langchain.tools import Tool
import os
from dotenv import load_dotenv
import time

load_dotenv()

# Create browser instance
sync_browser = create_sync_playwright_browser()
toolkit = PlayWrightBrowserToolkit.from_browser(sync_browser=sync_browser)

# Get tools and fix the extract_hyperlinks tool
original_tools = toolkit.get_tools()

def create_fixed_hyperlinks_tool(original_tool):
    """Create a fixed version of the extract_hyperlinks tool"""
    def extract_hyperlinks_func(absolute_urls: str = "false"):
        # Convert string to boolean
        absolute_urls_bool = absolute_urls.lower() == "true"
        return original_tool.run({"absolute_urls": absolute_urls_bool})
    
    return Tool(
        name="extract_hyperlinks",
        description="Extract hyperlinks from the current webpage. Input should be 'true' or 'false' for absolute_urls parameter.",
        func=extract_hyperlinks_func
    )

# Replace the problematic tool
tools = []
for tool in original_tools:
    if tool.name == "extract_hyperlinks":
        tools.append(create_fixed_hyperlinks_tool(tool))
    else:
        tools.append(tool)

llm = init_chat_model("google_genai:gemini-2.5-flash", api_key=os.getenv("GOOGLE_API_KEY"))

# Use standard prompt
from langchain import hub
prompt = hub.pull("hwchase17/react")

agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(
    agent=agent, 
    tools=tools, 
    handle_parsing_errors=True,
    max_iterations=5
)
url = "https://www.anthropic.com/engineering"
command = {
    "input": f"Go to {url} and give me the job description in detail and about the company  of the person posted the job"
}

try:
    start = time.time()
    result = agent_executor.invoke(command)
    end = time.time()
    print(f"Time taken: {end - start}")
    print("-----"*50)
    
    print(result)
except Exception as e:
    print(f"Error: {e}")