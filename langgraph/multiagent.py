from typing import Annotated
import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.tools import tool
from typing_extensions import TypedDict
from langchain_community.tools import DuckDuckGoSearchResults
from groq import Groq
load_dotenv()



class State(TypedDict):
    messages: Annotated[list,add_messages]


search = DuckDuckGoSearchResults()

def onlinesearch(state:State):
    query = state["messages"][-1].content
    online_output = search.invoke(query)
    return {"messages":[online_output]}


client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)



def chatbot(state:State):
    SYSTEM_PROMPT = f"""
    
    you are a ai engineer and a world best twitter content writer . you will get the leatest news from the internet snd your goal is to convert that info into a creative , interesting tweet .
    you have to create a tweet of around 100 words and it should be around your filed only.

"""
    response = client.chat.completions.create(
    messages=[
        {
            "role":"system",
            "content": SYSTEM_PROMPT,

        },      
        {
            "role": "assistant",
            "content": state["messages"][-1].content,
        },
    ],
    model="llama-3.3-70b-versatile",
)
    return {"messages":[response.choices[0].message.content]}


graph_builder = StateGraph(State)
graph_builder.add_node("onlinesearch",onlinesearch)
graph_builder.add_node("chatbot",chatbot)


graph_builder.add_edge(START,"onlinesearch")
graph_builder.add_edge("onlinesearch","chatbot")
graph_builder.add_edge("chatbot",END)

graph = graph_builder.compile()




def stream_graph_updates(user_input: str):
    result = graph.invoke({"messages": [{"role": "user", "content": user_input}]})
    
   
    final_message = result["messages"][-1]
    print("Assistant:", final_message.content)


# Chat loop
while True:
    try:
        user_input = input("\n\n User: ")
        if user_input.lower() in ["quit", "exit", "q"]:
            print("Goodbye!")
            break
        stream_graph_updates(user_input)
       
    except Exception as e:
        print(f"Error:{e}")
















