from notion_client import Client
import os
from dotenv import load_dotenv
import json

load_dotenv()

def check_db_contents():
    token = os.getenv("NOTION_TOKEN")
    conv_id = os.getenv("NOTION_CONVERSATION_DB_ID")
    feed_id = os.getenv("NOTION_FEEDBACK_DB_ID")
    
    client = Client(auth=token)
    
    print("\n--- Checking Conversation Logs ---")
    convs = client.databases.query(database_id=conv_id, page_size=1).get("results", [])
    if convs:
        props = convs[0]["properties"]
        topic = props["Topic"]["title"][0]["plain_text"]
        transcript = props["FullTranscript"]["rich_text"][0]["plain_text"][:50]
        print(f"Latest Topic: {topic}")
        print(f"Latest Transcript snippet: {transcript}...")
    else:
        print("No conversations found.")

    print("\n--- Checking Feedback Logs ---")
    feeds = client.databases.query(database_id=feed_id, page_size=5).get("results", [])
    if feeds:
        for f in feeds:
            f_props = f["properties"]
            orig = f_props["OriginalSentence"]["title"][0]["plain_text"]
            corr = f_props["CorrectedSentence"]["rich_text"][0]["plain_text"]
            cat = f_props["Category"]["select"]["name"]
            print(f"- [{cat}] {orig} -> {corr}")
    else:
        print("No feedback found.")

if __name__ == "__main__":
    check_db_contents()
