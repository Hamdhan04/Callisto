from backend.local_client import generate_response
import sys

try:
    print("Testing generate_response with 'llama3:latest'...")
    response = generate_response("Hello", model_type="general")
    print(f"Response: {response}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
