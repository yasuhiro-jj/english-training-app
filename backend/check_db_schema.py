import os
from notion_client import Client
from dotenv import load_dotenv
import json

load_dotenv()

def check_db_schema(db_id):
    client = Client(auth=os.getenv("NOTION_TOKEN"))
    try:
        db = client.databases.retrieve(database_id=db_id)
        print(f"Database: {db['title'][0]['plain_text']}")
        print("Properties:")
        print(json.dumps(db['properties'], indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    db_id = os.getenv("NOTION_USER_DATABASE_ID")
    print(f"Checking DB: {db_id}")
    check_db_schema(db_id)
