import os
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()

def list_users():
    client = Client(auth=os.getenv("NOTION_TOKEN"))
    db_id = os.getenv("NOTION_USER_DATABASE_ID")
    try:
        response = client.databases.query(database_id=db_id)
        results = response.get("results", [])
        print(f"Total users found: {len(results)}")
        for page in results:
            props = page["properties"]
            email = props["Email"]["rich_text"][0]["text"]["content"] if props["Email"]["rich_text"] else "No Email"
            print(f"- User: {email}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_users()
