import requests
import json

url = "http://localhost:8000/api/session/start"
payload = {
    "article_url": "https://www.rarejob.com/dna/2026/01/10/shohei-ohtani-is-the-aps-male-athlete-of-the-year-for-re/"
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
