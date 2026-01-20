from notion_client import Client
import os
from dotenv import load_dotenv

load_dotenv()

def verify():
    token = os.getenv("NOTION_TOKEN")
    conv_id = os.getenv("NOTION_CONVERSATION_DB_ID")
    feed_id = os.getenv("NOTION_FEEDBACK_DB_ID")
    
    client = Client(auth=token)
    
    print(f"Testing with Token: {token[:10]}...")
    
    try:
        # Check accessible databases
        search_res = client.search(filter={"value": "database", "property": "object"}).get("results", [])
        print(f"\nFound {len(search_res)} accessible databases:")
        for db in search_res:
            title = db['title'][0]['text']['content'] if db['title'] else "Untitled"
            print(f"- {title} (ID: {db['id']})")
        
        # Verify specific DBs
        print("\nVerifying specific IDs from .env:")
        try:
            client.databases.retrieve(database_id=conv_id)
            print(f"✅ Conversation DB: OK")
        except Exception as e:
            print(f"❌ Conversation DB: Failed ({e})")
            
        try:
            client.databases.retrieve(database_id=feed_id)
            print(f"✅ Feedback DB: OK")
        except Exception as e:
            print(f"❌ Feedback DB: Failed ({e})")
            
    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    verify()
