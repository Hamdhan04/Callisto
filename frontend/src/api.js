import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const createSession = async (title = "New Chat") => {
    const response = await axios.post(`${API_URL}/sessions`, { title });
    return response.data;
};

export const getSessions = async () => {
    const response = await axios.get(`${API_URL}/sessions`);
    return response.data;
};

export const deleteSession = async (sessionId) => {
    await axios.delete(`${API_URL}/sessions/${sessionId}`);
};

export const getSessionMessages = async (sessionId) => {
    const response = await axios.get(`${API_URL}/sessions/${sessionId}/messages`);
    return response.data;
};

export const undoLastMessage = async (sessionId) => {
    const response = await axios.post(`${API_URL}/undo`, { session_id: sessionId });
    return response.data;
};

export const login = async (username, password) => {
    const response = await axios.post(`${API_URL}/login`, { username, password });
    return response.data;
};

export const register = async (username, password) => {
    const response = await axios.post(`${API_URL}/register`, { username, password });
    return response.data;
};

export const sendMessage = async (message, image, contextFiles, sessionId) => {
    // 1. Upload files first if any
    const uploadedFiles = [];
    if (contextFiles && contextFiles.length > 0) {
        for (const file of contextFiles) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await axios.post(`${API_URL}/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedFiles.push(res.data.path);
            } catch (error) {
                console.error("Error uploading file:", error);
            }
        }
    }

    // 2. Upload image if any (as a file, then get path) or handle base64. 
    // For simplicity, let's treat image as a file upload too if it's a file object
    let imagePath = null;
    if (image) {
        const formData = new FormData();
        formData.append('file', image);
        try {
            const res = await axios.post(`${API_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            imagePath = res.data.path;
        } catch (error) {
            console.error("Error uploading image:", error);
        }
    }

    // 3. Send simplified JSON to chat endpoint
    const payload = {
        message: message,
        image: imagePath,
        context_files: uploadedFiles,
        session_id: sessionId // Add session ID to payload
    };

    const response = await axios.post(`${API_URL}/chat`, payload);
    return response.data;
};

// ===== EXCEL DATA ANALYTICS API =====

export const uploadExcel = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/upload-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const getExcelData = async (datasetId, limit = 100) => {
    const response = await axios.get(`${API_URL}/excel-data/${datasetId}?limit=${limit}`);
    return response.data;
};

export const getExcelStats = async (datasetId) => {
    const response = await axios.get(`${API_URL}/excel-stats/${datasetId}`);
    return response.data;
};

export const getExcelCharts = async (datasetId) => {
    const response = await axios.get(`${API_URL}/excel-charts/${datasetId}`);
    return response.data;
};

export const sendDataChat = async (datasetId, message) => {
    const response = await axios.post(`${API_URL}/excel-chat`, {
        dataset_id: datasetId,
        message: message
    });
    return response.data;
};

export const cleanData = async (datasetId) => {
    const response = await axios.get(`${API_URL}/clean-data/${datasetId}`);
    return response.data;
};

export const autoDashboard = async (datasetId) => {
    const response = await axios.get(`${API_URL}/auto-dashboard/${datasetId}`);
    return response.data;
};

export const explainChart = async (datasetId, chartType, chartData) => {
    const response = await axios.post(`${API_URL}/explain-chart`, {
        dataset_id: datasetId,
        chart_type: chartType,
        chart_data: chartData
    });
    return response.data;
};

export const generateInsights = async (datasetId) => {
    const response = await axios.get(`${API_URL}/generate-insights/${datasetId}`);
    return response.data;
};

export const explainAnomaly = async (datasetId, anomalyData) => {
    const response = await axios.post(`${API_URL}/explain-anomaly`, {
        dataset_id: datasetId,
        anomaly_data: anomalyData
    });
    return response.data;
};

export const simulateScenario = async (datasetId, prompt) => {
    const response = await axios.post(`${API_URL}/simulate-scenario`, {
        dataset_id: datasetId,
        prompt: prompt
    });
    return response.data;
};

export const generateDataset = async (prompt) => {
    const response = await axios.post(`${API_URL}/generate-dataset`, {
        prompt: prompt
    });
    return response.data;
};
