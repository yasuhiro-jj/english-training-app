from notion_client import Client
import os
from dotenv import load_dotenv

load_dotenv()

def list_all_dbs():
    token = os.getenv("NOTION_TOKEN")
    client = Client(auth=token)
    
    print("Searching for all accessible databases...")
    try:
        search_res = client.search(filter={"value": "database", "property": "object"}).get("results", [])
        print(f"Found {len(search_res)} databases:")
        for db in search_res:
            title = db['title'][0]['text']['content'] if db['title'] else "Untitled"
            print(f"- {title} (ID: {db['id']})")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_all_dbs()
