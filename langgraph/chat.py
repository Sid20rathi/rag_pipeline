from typing import Annotated
from typing_extensions import TypedDict
import os
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from dotenv import load_dotenv

load_dotenv()

llm = init_chat_model("google_genai:gemini-2.0-flash", api_key=os.getenv("GOOGLE_API_KEY"))


class State(TypedDict):
    messages: Annotated[list, add_messages]

def chatbot(state: State):
    
    response = llm.invoke(state["messages"])
    print("*"*30)
    print(response)
    print("*"*30)
    
    return {"messages": [response]}

# Build the graph
graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)
graph = graph_builder.compile()

# Streaming function
def stream_graph_updates(user_input: str):
    for event in graph.stream({"messages": [{"role": "user", "content": user_input}]}):
        for value in event.values():
            print("Assistant:", value["messages"][-1].content)

# Chat loop
while True:
    try:
        user_input = input("\n\n User: ")
        if user_input.lower() in ["quit", "exit", "q"]:
            print("Goodbye!")
            break
        stream_graph_updates(user_input)
    except:
        user_input = "What do you know about LangGraph?"
        print("User: " + user_input)
        stream_graph_updates(user_input)
        break
