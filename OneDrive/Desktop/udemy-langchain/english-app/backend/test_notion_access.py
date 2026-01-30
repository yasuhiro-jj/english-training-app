from notion_client import Client
import os
from dotenv import load_dotenv

load_dotenv()

def test_all_dbs():
    token = os.getenv("NOTION_TOKEN")
    client = Client(auth=token)
    
    env_vars = [
        "NOTION_CONVERSATION_DB_ID",
        "NOTION_FEEDBACK_DB_ID",
        "NOTION_TASK_DATABASE_ID",
        "NOTION_SPEC_DATABASE_ID",
        "NOTION_LOG_DATABASE_ID",
        "NOTION_PROMPT_DATABASE_ID"
    ]
    
    print("Testing Notion Database Access:")
    for var in env_vars:
        db_id = os.getenv(var)
        if not db_id:
            print(f"- {var}: Not defined in .env")
            continue
        try:
            db = client.databases.retrieve(database_id=db_id)
            title = db['title'][0]['text']['content'] if db['title'] else "Untitled"
            print(f"- {var}: ✅ OK ({title})")
        except Exception as e:
            print(f"- {var}: ❌ Failed ({e})")

if __name__ == "__main__":
    test_all_dbs()
