import requests
import json

url = "http://localhost:8000/api/chat"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer fake_token"
}
data = {
    "message": "Explain endowment policies to me",
    "conversation_id": "c7cb52ea-6f17-4860-93cb-339241b71e1f" # We can just omit conversation_id to let it create a new one, but let's test a fresh one first
}

# 1. We need a valid token to bypass auth.
# Let's see if auth is mocked or requires a real token.
