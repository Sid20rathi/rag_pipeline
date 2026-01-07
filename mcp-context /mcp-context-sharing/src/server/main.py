from mcp.server.fastmcp import FastMCP

# Create FastMCP server
mcp = FastMCP(name="local-mcp-server")

# In-memory context store
context_store = {}


@mcp.tool()
async def share_context(agent: str, content: str):
    """
    Store context from a specified agent.
    """
    if agent not in context_store:
        context_store[agent] = []
    context_store[agent].append(content)

    return f"Context stored from {agent}: {content}"


@mcp.tool()
async def retrieve_context(query: str):
    """
    Retrieve stored context entries matching the query text.
    """
    results = []

    for agent, contents in context_store.items():
        for content in contents:
            if query.lower() in content.lower():
                results.append(
                    {"agent": agent, "content": content}
                )

    if not results:
        return f"No context found for query: {query}"

    return results


@mcp.tool()
async def list_all_context():
    """
    Return all stored context.
    """
    return context_store


if __name__ == "__main__":
    # This starts STDIO transport automatically
    print("MCP server started and waiting for clients...")
    mcp.run()
