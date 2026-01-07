from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for testing (reset on server restart)
tokens_store = {}

@app.get("/")
async def root():
    return {"message": "Email OAuth Testing API"}

@app.get("/auth/google")
async def google_auth():
    """Generate Google OAuth URL"""
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        
        # Scopes needed for sending emails and getting user info
        scopes = [
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email"
        ]
        
        # Build Google OAuth URL
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope={' '.join(scopes)}&"
            f"access_type=offline&"  # offline to get refresh token
            f"prompt=consent"  # Always prompt for consent
        )
        
        return {"auth_url": auth_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/callback")
async def auth_callback(code: str):
    """Exchange authorization code for tokens"""
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            
            if token_response.status_code != 200:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Failed to exchange code", "details": token_response.text}
                )
            
            token_data = token_response.json()
            
            # Get user email using the access token
            user_info_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            
            user_email = user_info_response.json()["email"]
            
            # Store tokens in memory (for testing only!)
            tokens_store[user_email] = {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in", 3600)
            }
            
            print(f"✅ Tokens stored for: {user_email}")
            print(f"Access Token (first 20 chars): {token_data['access_token'][:20]}...")
            
            # Redirect to frontend with tokens
            return RedirectResponse(
                url=f"http://localhost:3000/?auth=success&email={user_email}&access_token={token_data['access_token']}"
            )
            
    except Exception as e:
        print(f"❌ Error in callback: {e}")
        return RedirectResponse(url="http://localhost:3000/?auth=failed")

@app.post("/send-email")
async def send_email(request: Request):
    """Send email using Gmail API"""
    try:
        data = await request.json()
        
        # Get user email and access token from request
        user_email = data.get("user_email")
        access_token = data.get("access_token")
        to_email = data.get("to")
        subject = data.get("subject")
        body = data.get("body")
        
        if not all([user_email, access_token, to_email, subject, body]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
     
        import base64
        from email.mime.text import MIMEText
        
        message = MIMEText(body)
        message["to"] = to_email
        message["from"] = user_email
        message["subject"] = subject
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        # Send email using Gmail API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={"raw": raw_message}
            )
            
            if response.status_code == 401:
                # Token expired or invalid
                return JSONResponse(
                    status_code=401,
                    content={"error": "Token expired or invalid. Please re-authenticate."}
                )
            
            if response.status_code != 200:
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": "Failed to send email", "details": response.text}
                )
            
            return {"success": True, "message": "Email sent successfully!"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/check-token/{user_email}")
async def check_token(user_email: str):
    """Check if tokens exist for user (for testing)"""
    if user_email in tokens_store:
        return {
            "has_token": True,
            "email": user_email,
            "token_exists": True
        }
    return {"has_token": False, "email": user_email}

@app.get("/get-stored-tokens")
async def get_stored_tokens():
    """Get all stored tokens (for testing only!)"""
    return {
        "count": len(tokens_store),
        "tokens": {email: {"token": token["access_token"][:20] + "..."} 
                  for email, token in tokens_store.items()}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)