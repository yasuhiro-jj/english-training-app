from notion_client import Client
import os
from dotenv import load_dotenv

load_dotenv()

def get_specification(spec_name):
    token = os.getenv("NOTION_TOKEN")
    spec_db_id = os.getenv("NOTION_SPEC_DATABASE_ID")
    client = Client(auth=token)
    
    print(f"Searching for spec: {spec_name} in DB: {spec_db_id}")
    
    try:
        # Detect title property name
        db_info = client.databases.retrieve(database_id=spec_db_id)
        title_prop = next(p for p, v in db_info['properties'].items() if v['type'] == 'title')
        
        # Search by title
        query = client.databases.query(
            database_id=spec_db_id,
            filter={
                "property": title_prop,
                "title": {
                    "contains": spec_name
                }
            }
        ).get("results", [])

        if not query:
            print(f"No specification found matching '{spec_name}'")
            return

        for page in query:
            print(f"\n--- Specification: {spec_name} ---")
            for prop_name, prop_val in page['properties'].items():
                if prop_val['type'] == 'title':
                    print(f"Title: {prop_val['title'][0]['text']['content'] if prop_val['title'] else 'N/A'}")
                elif prop_val['type'] == 'rich_text':
                    text = "".join([t['text']['content'] for t in prop_val['rich_text']])
                    print(f"{prop_name}: {text}")
                elif prop_val['type'] == 'select':
                    print(f"{prop_name}: {prop_val['select']['name'] if prop_val['select'] else 'N/A'}")
            
            # Fetch page content (blocks) for full details
            blocks = client.blocks.children.list(block_id=page['id']).get("results", [])
            print("\nDetails (Page Content):")
            for block in blocks:
                if block['type'] == 'paragraph':
                    text = "".join([t['text']['content'] for t in block['paragraph']['rich_text']])
                    print(text)
                elif block['type'] == 'heading_1':
                    text = "".join([t['text']['content'] for t in block['heading_1']['rich_text']])
                    print(f"# {text}")
                elif block['type'] == 'heading_2':
                    text = "".join([t['text']['content'] for t in block['heading_2']['rich_text']])
                    print(f"## {text}")
                elif block['type'] == 'bulleted_list_item':
                    text = "".join([t['text']['content'] for t in block['bulleted_list_item']['rich_text']])
                    print(f"- {text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_specification("ユーザー認証機能")
