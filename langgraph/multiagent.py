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


## i want to build a mutliagent , where one agent will get the latest news from net , second agents will summarize the new
# and third agent will produce , blog or twitter or linkedin post content on it


class State(TypedDict):
    messages: Annotated[list,add_messages]


search = DuckDuckGoSearchResults()

def onlinesearch(state:State):
    query = state["messages"][-1].content
    online_output = search.invoke(query)
    print(online_output)
    return {"messages":[online_output]}


client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)



def chatbot(state:State):
    SYSTEM_PROMPT = f"""
    you are a world best twitter content writer . you will get the leatest news from the internet snd your goal is to convert that info into a creative , interesting tweet .

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
    print(response.choices[0].message.content)

    return {"messages":[response.choices[0].message.content]}


graph_builder = StateGraph(State)
graph_builder.add_node("onlinesearch",onlinesearch)
graph_builder.add_node("chatbot",chatbot)


graph_builder.add_edge(START,"onlinesearch")
graph_builder.add_edge("onlinesearch","chatbot")
graph_builder.add_edge("chatbot",END)

graph = graph_builder.compile()




def stream_graph_updates(user_input: str):
    for event in graph.stream({"messages": [{"role": "user", "content": user_input}]}):
        for value in event.values():
            print("Assistant:", value["messages"][-1])


# Chat loop
while True:
    try:
        user_input = input("\n\n User: ")
        if user_input.lower() in ["quit", "exit", "q"]:
            print("Goodbye!")
            break
        stream_graph_updates(user_input)
        print("It is working....")
    except:
        user_input = "What do you know about LangGraph?"
        print("User: " + user_input)
        stream_graph_updates(user_input)
        break
















