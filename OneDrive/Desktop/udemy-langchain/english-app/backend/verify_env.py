from dotenv import load_dotenv
import os

print("Loading .env...")
loaded = load_dotenv()
print(f"Loaded: {loaded}")

key = os.getenv("OPENAI_API_KEY")
if key:
    print(f"OPENAI_API_KEY found: {key[:5]}...{key[-5:]}")
else:
    print("OPENAI_API_KEY NOT found")
