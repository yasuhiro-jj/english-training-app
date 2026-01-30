from notion_client import Client
import os
from dotenv import load_dotenv

load_dotenv()

def get_unstarted_tasks():
    token = os.getenv("NOTION_TOKEN")
    client = Client(auth=token)
    
    task_db_id = os.getenv("NOTION_TASK_DATABASE_ID")
    if not task_db_id:
        print("NOTION_TASK_DATABASE_ID not found in .env")
        return
    print(f"Using Task DB ID: {task_db_id}")
    
    if not task_db_id:
        # Check .env specifically for common names
        task_db_id = os.getenv("NOTION_TASK_DB_ID") or os.getenv("NOTION_DEVELOPMENT_DB_ID")
    
    if not task_db_id:
        print("Could not identify a Task Database. Here are all available databases:")
        for db in search_res:
             title = db['title'][0]['text']['content'] if db['title'] else "Untitled"
             print(f"- {title} (ID: {db['id']})")
        return

    # 2. Query the database for "Unstarted" tasks
    # We assume there is a property named "Status" or similar.
    # We'll try to find a status propery and filter by it.
    
    try:
        db_info = client.databases.retrieve(database_id=task_db_id)
        status_prop_name = None
        for prop_name, prop_info in db_info['properties'].items():
            if prop_info['type'] == 'status' or prop_info['type'] == 'select':
                if prop_name in ["Status", "ステータス", "状態"]:
                    status_prop_name = prop_name
                    break
        
        if not status_prop_name:
             # Default to first select/status prop
             for prop_name, prop_info in db_info['properties'].items():
                 if prop_info['type'] in ['status', 'select']:
                     status_prop_name = prop_name
                     break

        print(f"Querying status property: {status_prop_name}")
        
        # Notion's status filter is a bit specific, we'll try to query all and filter locally for robustness
        # or try a filter if we're sure.
        # Let's query all "Not Started" patterns
        
        query_params = {
            "database_id": task_db_id
        }
        
        results = client.databases.query(**query_params).get("results", [])
        
        unstarted = []
        for page in results:
            props = page['properties']
            status = ""
            if status_prop_name in props:
                p = props[status_prop_name]
                if p['type'] == 'status' and p['status']:
                    status = p['status']['name']
                elif p['type'] == 'select' and p['select']:
                    status = p['select']['name']
            
            # Check for "Not started" or "未着手" or "Todo"
            if status in ["Not started", "未着手", "Todo", "TO DO", "Backlog"]:
                title = "Untitled"
                for p_name, p_val in props.items():
                    if p_val['type'] == 'title':
                        if p_val['title']:
                            title = p_val['title'][0]['text']['content']
                unstarted.append(title)
        
        if unstarted:
            print("\n未着手のタスク一覧:")
            for t in unstarted:
                print(f"- {t}")
        else:
            print("\n未着手のタスクは見つかりませんでした。")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_unstarted_tasks()
