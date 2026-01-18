import os
from notion_client import Client
from dotenv import load_dotenv
import json

load_dotenv()

def check_db_schema(db_id, name):
    client = Client(auth=os.getenv("NOTION_TOKEN"))
    try:
        db = client.databases.retrieve(database_id=db_id)
        print(f"\n--- Database: {name} ({db_id}) ---")
        for prop_name, prop_data in db['properties'].items():
            print(f"- {prop_name}: {prop_data['type']}")
    except Exception as e:
        print(f"Error checking {name}: {e}")

if __name__ == "__main__":
    check_db_schema(os.getenv("NOTION_TASK_DATABASE_ID"), "Task DB")
    check_db_schema(os.getenv("NOTION_LOG_DATABASE_ID"), "Log DB")
