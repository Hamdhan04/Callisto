import os
import shutil
import uuid
import json
import hashlib
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import (
    init_db,
    add_message,
    get_messages,
    create_session,
    get_sessions,
    delete_session,
    delete_message,
    get_last_message_id,
    create_user,
    get_user_by_username,
)
from document_processor import extract_text_from_file
from local_client import (
    generate_response,
    generate_image,
    generate_data_insight,
    generate_cleaning_suggestions,
    generate_auto_dashboard,
    generate_chart_explanation,
    generate_executive_insights,
    generate_anomaly_explanation,
    generate_simulated_scenario,
    generate_synthetic_dataset,
)
from excel_processor import (
    parse_file,
    get_dataset,
    get_data_rows,
    get_summary_stats,
    get_chart_data,
    get_data_summary_for_ai,
    get_data_cleaning_suggestions,
)

load_dotenv()

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

generated_images_dir = os.path.join(os.getcwd(), "generated_images")
os.makedirs(generated_images_dir, exist_ok=True)

app.mount("/images", StaticFiles(directory=generated_images_dir), name="images")


class ChatRequest(BaseModel):
    message: str
    session_id: str
    image: Optional[str] = None
    context_files: Optional[List[str]] = []


class SessionRequest(BaseModel):
    title: Optional[str] = "New Chat"


class DataChatRequest(BaseModel):
    message: str
    dataset_id: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ChartExplainRequest(BaseModel):
    dataset_id: str
    chart_type: str
    chart_data: dict


class AnomalyRequest(BaseModel):
    dataset_id: str
    anomaly_data: dict


class ScenarioRequest(BaseModel):
    dataset_id: str
    prompt: str


class DatasetGenRequest(BaseModel):
    prompt: str


init_db()


@app.post("/register")
async def register(request: LoginRequest):
    hashed_pw = hashlib.sha256(request.password.encode()).hexdigest()
    user_id = str(uuid.uuid4())
    success = create_user(user_id, request.username, hashed_pw)
    if not success:
        raise HTTPException(status_code=400, detail="Username already exists")
    return {"message": "User created successfully", "username": request.username}


@app.post("/login")
async def login(request: LoginRequest):
    user = get_user_by_username(request.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    hashed_pw = hashlib.sha256(request.password.encode()).hexdigest()
    if user["password_hash"] != hashed_pw:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "username": user["username"], "user_id": user["id"]}


@app.get("/")
def read_root():
    return {"message": "Chatbot Backend is running!"}


@app.post("/sessions")
async def create_new_session(request: SessionRequest):
    session_id = str(uuid.uuid4())
    create_session(session_id, request.title)
    return {"id": session_id, "title": request.title}


@app.get("/sessions")
async def get_all_sessions():
    return get_sessions()


@app.delete("/sessions/{session_id}")
async def remove_session(session_id: str):
    delete_session(session_id)
    return {"message": "Session deleted"}


@app.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    return get_messages(session_id)


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    session_id = request.session_id
    user_msg_content = request.message
    if request.image:
        user_msg_content += " [Image Attached]"
    if request.context_files:
        user_msg_content += f" [{len(request.context_files)} Files Attached]"
    
    add_message(session_id, "user", user_msg_content, "text")

    context_text = ""
    if request.context_files:
        for file_path in request.context_files:
            if os.path.exists(file_path):
                extracted = extract_text_from_file(file_path)
                context_text += f"\n--- Content of {os.path.basename(file_path)} ---\n{extracted}\n"

    full_prompt = request.message
    if context_text:
        full_prompt += f"\n\nContext from uploaded files:\n{context_text}"

    if "/image" in request.message.lower() or "generate image" in request.message.lower():
        image_path = generate_image(request.message)
        if "Error" in image_path:
            bot_response = image_path
        else:
            filename = os.path.basename(image_path)
            image_url = f"http://localhost:8000/images/{filename}"
            bot_response = f"![Generated Image]({image_url})"
    else:
        image_path = None
        if request.image and os.path.exists(request.image):
            image_path = request.image

        model_type = "general"
        if "code" in request.message.lower() or "script" in request.message.lower() or "function" in request.message.lower():
            model_type = "code"
        elif "think" in request.message.lower() or "logic" in request.message.lower() or "reason" in request.message.lower():
            model_type = "logic"

        bot_response = generate_response(full_prompt, image_path, model_type)

    add_message(session_id, "model", bot_response, "text")
    return {"response": bot_response}


@app.post("/undo")
async def undo_last_message(body: dict = Body(...)):
    session_id = body.get("session_id")
    last_user_msg_id = get_last_message_id(session_id, "user")
    if last_user_msg_id:
        delete_message(last_user_msg_id)

    all_msgs = get_messages(session_id)
    if not all_msgs:
        return {"message": "Nothing to undo"}

    to_delete = []
    if all_msgs[-1]["role"] == "model":
        to_delete.append(all_msgs[-1]["id"])
        if len(all_msgs) > 1 and all_msgs[-2]["role"] == "user":
            to_delete.append(all_msgs[-2]["id"])
    elif all_msgs[-1]["role"] == "user":
        to_delete.append(all_msgs[-1]["id"])

    for mid in to_delete:
        delete_message(mid)

    return {"message": "Undo successful", "deleted_count": len(to_delete)}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    uploads_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": file.filename, "path": file_path}


@app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    allowed_ext = [".csv", ".xlsx", ".xls"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Use .csv, .xlsx, or .xls")

    uploads_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        dataset = parse_file(file_path, file.filename)
        return {
            "dataset_id": dataset.id,
            "filename": dataset.filename,
            "row_count": dataset.row_count,
            "col_count": dataset.col_count,
            "columns": dataset.columns,
            "numeric_columns": dataset.numeric_columns,
            "categorical_columns": dataset.categorical_columns,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


@app.get("/excel-data/{dataset_id}")
async def get_excel_data(dataset_id: str, limit: int = 100):
    data = get_data_rows(dataset_id, limit)
    if data is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return data


@app.get("/excel-stats/{dataset_id}")
async def get_excel_stats(dataset_id: str):
    stats = get_summary_stats(dataset_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return stats


@app.get("/excel-charts/{dataset_id}")
async def get_excel_charts(dataset_id: str):
    charts = get_chart_data(dataset_id)
    if charts is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return charts


@app.post("/excel-chat")
async def excel_chat(request: DataChatRequest):
    data_summary = get_data_summary_for_ai(request.dataset_id)
    if data_summary == "No dataset loaded.":
        raise HTTPException(status_code=404, detail="Dataset not found. Please upload a file first.")
    response = generate_data_insight(data_summary, request.message)
    return {"response": response}


@app.get("/clean-data/{dataset_id}")
async def clean_data_endpoint(dataset_id: str):
    issues = get_data_cleaning_suggestions(dataset_id)
    if issues is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    explanation = generate_cleaning_suggestions(issues)
    return {"issues": issues, "explanation": explanation}


@app.get("/auto-dashboard/{dataset_id}")
async def auto_dashboard_endpoint(dataset_id: str):
    data_summary = get_data_summary_for_ai(dataset_id)
    if data_summary == "No dataset loaded.":
        raise HTTPException(status_code=404, detail="Dataset not found. Please upload a file first.")
    config = generate_auto_dashboard(data_summary)
    try:
        config_json = json.loads(config)
        return config_json
    except Exception as e:
        return {"error": "Failed to parse AI JSON configuration", "raw": config}


@app.post("/explain-chart")
async def explain_chart_endpoint(request: ChartExplainRequest):
    dataset = get_dataset(request.dataset_id)
    dataset_name = dataset.filename if dataset else "Unknown Dataset"
    explanation = generate_chart_explanation(request.chart_type, request.chart_data, dataset_name)
    return {"explanation": explanation}


@app.get("/generate-insights/{dataset_id}")
async def generate_insights_endpoint(dataset_id: str):
    data_summary = get_data_summary_for_ai(dataset_id)
    if data_summary == "No dataset loaded.":
        raise HTTPException(status_code=404, detail="Dataset not found")
    insights = generate_executive_insights(data_summary)
    return {"insights": insights}


@app.post("/explain-anomaly")
async def explain_anomaly_endpoint(request: AnomalyRequest):
    dataset = get_dataset(request.dataset_id)
    dataset_name = dataset.filename if dataset else "Unknown Dataset"
    explanation = generate_anomaly_explanation(request.anomaly_data, dataset_name)
    return {"explanation": explanation}


@app.post("/simulate-scenario")
async def simulate_scenario_endpoint(request: ScenarioRequest):
    data_summary = get_data_summary_for_ai(request.dataset_id)
    if data_summary == "No dataset loaded.":
        raise HTTPException(status_code=404, detail="Dataset not found")
    config = generate_simulated_scenario(data_summary, request.prompt)
    try:
        return json.loads(config)
    except Exception as e:
        return {"error": "Failed to parse simulation JSON", "raw": config}


@app.post("/generate-dataset")
async def generate_dataset_endpoint(request: DatasetGenRequest):
    csv_data = generate_synthetic_dataset(request.prompt)
    return {"csv_data": csv_data}
