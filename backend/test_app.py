import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_chat():
    print("Testing Chat Endpoint...")
    try:
        response = requests.post(f"{BASE_URL}/chat", json={"message": "Hello, are you working?"})
        if response.status_code == 200:
            print(f"Chat Response: {response.json()}")
        else:
            print(f"Chat Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Chat Exception: {e}")

def test_image_gen_command():
    print("\nTesting Image Generation Command...")
    # NOTE: This might fail if HF_TOKEN is not set or valid, but we want to see the application logic flow.
    try:
        response = requests.post(f"{BASE_URL}/chat", json={"message": "Generate image of a red cube"})
        if response.status_code == 200:
            print(f"Image Gen Response: {response.json()}")
        else:
            print(f"Image Gen Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Image Gen Exception: {e}")

if __name__ == "__main__":
    # Give server a moment to start
    time.sleep(2) 
    test_chat()
    test_image_gen_command()
