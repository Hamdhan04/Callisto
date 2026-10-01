import os
import json
import datetime
from typing import Optional
from huggingface_hub import InferenceClient
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Create a log file to store data for "Self-Learning"
LOG_FILE = "training_data.jsonl"

# Initialize SiliconFlow / OpenRouter client
api_key = os.getenv("SILICONFLOW_API_KEY") or "dummy_key"
base_url = os.getenv("SILICONFLOW_BASE_URL") or "https://openrouter.ai/api/v1"
client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

def log_interaction(prompt, response, model_name, image_path=None):
    """Saves the conversation for future fine-tuning/learning."""
    data = {
        "timestamp": str(datetime.datetime.now()),
        "model": model_name,
        "prompt": prompt,
        "response": response,
        "has_image": bool(image_path)
    }
    # with open(LOG_FILE, "a") as f:
    #     f.write(json.dumps(data) + "\n")
    pass

def generate_image(prompt: str) -> str:
    """
    Generates an image using Hugging Face InferenceClient (Tongyi-MAI/Z-Image-Turbo).
    Returns the path to the saved image.
    """
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        return "Error: HF_TOKEN not found in environment variables."

    try:
        client = InferenceClient(
            api_key=hf_token,
        )
        
        print(f"--- Generating Image for: '{prompt}' ---")
        
        # output is a PIL.Image object
        image = client.text_to_image(
            prompt,
            model="stabilityai/stable-diffusion-xl-base-1.0",
        )
        
        # Ensure static/generated_images exists
        # Assuming we are in backend/, let's put it in a known accessible place
        # Ideally, main.py should mount this directory. For now, we save it locally.
        output_dir = os.path.join(os.getcwd(), "generated_images")
        os.makedirs(output_dir, exist_ok=True)
        
        filename = f"gen_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        file_path = os.path.join(output_dir, filename)
        
        image.save(file_path)
        return file_path
    
    except Exception as e:
        return f"Error generating image: {str(e)}"

def generate_response(prompt: str, image_path: str = None, model_type: str = "general"):
    """
    Generates response using SiliconFlow API.
    """
    
    # 1. Image Generation Check (Vision)
    # SiliconFlow might support vision, but for now we stick to text as requested.
    if image_path:
        # TODO: Implement Vision with SiliconFlow (e.g. Qwen-VL)
        return "Image analysis is currently not supported with the remote API. Please use text only."

    # 2. Text Logic
    # We use Qwen/Qwen2.5-7B-Instruct for all text tasks for now
    selected_model = "qwen/qwen-2.5-7b-instruct"
    
    
    try:
        print(f"--- Thinking with {selected_model} ---")
        response = client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            stream=False 
        )
        
        reply = response.choices[0].message.content
        log_interaction(prompt, reply, selected_model)
        return reply
        
    except Exception as e:
        return f"Error generating response: {str(e)}"


def generate_data_insight(data_summary: str, user_question: str) -> str:
    """
    Generates AI-powered data insights using the data summary as context.
    Used for summarization, future predictions, and improvement suggestions.
    """
    selected_model = "qwen/qwen-2.5-7b-instruct"
    
    system_prompt = """You are Callisto, an expert data analyst AI assistant. You analyze datasets and provide actionable insights.

Your capabilities:
1. **Summarize**: Provide clear, concise summaries of data patterns and key findings.
2. **Predict**: Based on trends in the data, suggest future predictions with reasoning.
3. **Improve**: Suggest actionable improvements, strategies, and optimizations based on the data.
4. **Visualize**: If the user asks for a chart or visual, you can include a JSON block in your markdown response.

Guidelines:
- Use bullet points and headers for clarity.
- Include specific numbers and percentages from the data.
- If appropriate, provide a chart configuration by returning a JSON block wrapped in ```json ... ```.
- JSON Chart format MUST be:
{
  "chart": {
    "type": "bar" or "line" or "pie" or "scatter",
    "title": "Title of Chart",
    "x_axis": "column_name",
    "y_axis": "column_name"
  }
}
- Format your response in clean Markdown."""

    full_prompt = f"""Here is the dataset information:

{data_summary}

---

User Question: {user_question}"""

    try:
        print(f"--- Data Insight with {selected_model} ---")
        response = client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            stream=False
        )
        
        reply = response.choices[0].message.content
        log_interaction(full_prompt, reply, selected_model)
        return reply
        
    except Exception as e:
        return f"Error generating data insight: {str(e)}"


def generate_cleaning_suggestions(issues: dict) -> str:
    """
    Generates AI suggestions for how to clean the dataset based on detected issues.
    """
    selected_model = "qwen/qwen-2.5-7b-instruct"
    
    system_prompt = """You are an expert Data Scientist. Review the data quality issues provided and suggest how to clean the dataset.
Provide a clear, brief explanation of the issues and recommend specific actions.
Format your response in Markdown."""

    full_prompt = f"Data Quality Issues Detected:\n{json.dumps(issues, indent=2)}\n\nPlease explain what these mean for the data and suggest the best way to clean it."

    try:
        print(f"--- Data Cleaning Advice with {selected_model} ---")
        response = client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            stream=False
        )
        reply = response.choices[0].message.content
        log_interaction(full_prompt, reply, selected_model)
        return reply
    except Exception as e:
        return f"Error generating cleaning suggestions: {str(e)}"


def generate_auto_dashboard(data_summary: str) -> str:
    """
    Analyzes dataset summary and recommends chart configurations for an auto dashboard.
    Returns a JSON string.
    """
    selected_model = "qwen/qwen-2.5-7b-instruct"
    
    system_prompt = """You are an expert Data Visualization AI. Your task is to design an automated dashboard based on a dataset summary.
You MUST output ONLY valid JSON. Do not include any markdown formatting blocks like ```json or anything else. Just the raw JSON object.

Format:
{
  "charts": [
    {
      "title": "Clear title for the chart",
      "type": "bar|line|scatter|pie",
      "x_axis": "column_name",
      "y_axis": "column_name",
      "reason": "Brief explanation of why this chart is useful"
    }
  ],
  "kpis": [
    {
      "metric": "Name of important metric",
      "description": "Why it matters"
    }
  ]
}

Rules:
- Recommend 3 to 4 charts.
- Choose columns that actually exist in the data summary.
- Recommend 3 KPIs."""

    full_prompt = f"Dataset Summary:\n{data_summary}\n\nPlease generate the dashboard configuration JSON."

    try:
        print(f"--- Auto Dashboard generation with {selected_model} ---")
        response = client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            stream=False
        )
        reply = response.choices[0].message.content
        
        # Clean up possible markdown wrappers
        if reply.startswith("```json"):
            reply = reply[7:]
        if reply.startswith("```"):
            reply = reply[3:]
        if reply.endswith("```"):
            reply = reply[:-3]
            
        log_interaction(full_prompt, reply, selected_model)
        return reply.strip()
    except Exception as e:
        return json.dumps({"error": str(e)})


def generate_chart_explanation(chart_type: str, chart_data: dict, dataset_name: str) -> str:
    """
    Analyzes specific chart data and returns a natural language explanation of trends/anomalies.
    """
    selected_model = "qwen/qwen-2.5-7b-instruct"
    
    system_prompt = """You are an expert Data Analyst specializing in explaining charts and dashboards. 
Provide a clear, human-readable insight about the provided chart data.
Focus on:
1. What the chart shows.
2. Key trends.
3. Any visible anomalies.
4. Business meaning or actionable takeaway.
Format the response in clean Markdown with short, readable bullet points."""

    full_prompt = f"Dataset: {dataset_name}\nChart Type: {chart_type}\n\nChart Data:\n{json.dumps(chart_data, indent=2)}\n\nPlease explain this chart."

    try:
        print(f"--- Chart Explanation with {selected_model} ---")
        response = client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            stream=False
        )
        reply = response.choices[0].message.content
        log_interaction(full_prompt, reply, selected_model)
        return reply
    except Exception as e:
        return f"Error explaining chart: {str(e)}"

def generate_executive_insights(data_summary: str) -> str:
    """Generates top-level business recommendations from the dataset summary."""
    selected_model = "qwen/qwen-2.5-7b-instruct"
    system_prompt = """You are an Executive Business Consultant. Review the data summary and provide 3-5 top-level actionable business insights.
Focus on strategic recommendations, risk warnings, or growth opportunities based on the numbers.
Format as a clean Markdown list with bold headers."""
    full_prompt = f"Data Summary:\n{data_summary}\n\nPlease generate executive insights."

    try:
        response = client.chat.completions.create(
            model=selected_model,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": full_prompt}],
            stream=False
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating insights: {str(e)}"

def generate_anomaly_explanation(anomaly_data: dict, dataset_name: str) -> str:
    """Explains a detected anomaly in the data."""
    selected_model = "qwen/qwen-2.5-7b-instruct"
    system_prompt = "You are a Data Detective. Explain why the provided data point is an anomaly and suggest potential real-world reasons for it. Format in clean Markdown."
    full_prompt = f"Dataset: {dataset_name}\nAnomaly Details:\n{json.dumps(anomaly_data, indent=2)}\n\nPlease explain this anomaly."

    try:
        response = client.chat.completions.create(
            model=selected_model,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": full_prompt}],
            stream=False
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error explaining anomaly: {str(e)}"

def generate_simulated_scenario(data_summary: str, user_prompt: str) -> str:
    """Generates simulated data comparing original vs modeled scenario."""
    selected_model = "qwen/qwen-2.5-7b-instruct"
    system_prompt = """You are a Data Simulator. Based on the dataset summary and the user's 'What-If' scenario, output ONLY valid JSON describing the original and simulated trend.
Format:
{
  "scenario_name": "Brief name",
  "data": [
    {"label": "Period 1", "original": 100, "simulated": 80},
    {"label": "Period 2", "original": 110, "simulated": 88}
  ],
  "explanation": "Brief reasoning for the simulated numbers"
}
Output raw JSON only."""
    full_prompt = f"Data Summary:\n{data_summary}\n\nScenario Prompt: {user_prompt}\n\nPlease generate the simulation JSON."

    try:
        response = client.chat.completions.create(
            model=selected_model,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": full_prompt}],
            stream=False
        )
        reply = response.choices[0].message.content
        if reply.startswith("```json"): reply = reply[7:]
        if reply.startswith("```"): reply = reply[3:]
        if reply.endswith("```"): reply = reply[:-3]
        return reply.strip()
    except Exception as e:
        return json.dumps({"error": str(e)})

def generate_synthetic_dataset(user_prompt: str) -> str:
    """Generates synthetic data in CSV format based on a prompt."""
    selected_model = "qwen/qwen-2.5-7b-instruct"
    system_prompt = """You are a Synthetic Data Generator. Generate realistic mock data based on the user's prompt.
Output ONLY raw CSV text. Do not include markdown formatting or explanations. Ensure there is a header row."""
    full_prompt = f"Prompt: {user_prompt}\n\nPlease generate the CSV data."

    try:
        response = client.chat.completions.create(
            model=selected_model,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": full_prompt}],
            stream=False
        )
        reply = response.choices[0].message.content
        if reply.startswith("```csv"): reply = reply[6:]
        if reply.startswith("```"): reply = reply[3:]
        if reply.endswith("```"): reply = reply[:-3]
        return reply.strip()
    except Exception as e:
        return f"Error,{str(e)}"


if __name__ == "__main__":
    # Test
    print(generate_response("Hello, who are you?", model_type="general"))
