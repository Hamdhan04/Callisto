from local_client import generate_response
import os
from dotenv import load_dotenv

load_dotenv()

print("Using Model: qwen/qwen-2.5-7b-instruct")
try:
    response = generate_response("Write a haiku about a robot.", model_type="general")
    print("\n--- Response from SiliconFlow/OpenRouter ---")
    print(response)
    print("------------------------------------------")
except Exception as e:
    print(f"\nError: {e}")
