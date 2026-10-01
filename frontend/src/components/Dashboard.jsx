import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
    Upload, FileSpreadsheet, BarChart3, TrendingUp, Sparkles, AlertTriangle,
    Table, Bot, Play, CheckCircle, RefreshCw, Info, Search, X, Download,
    Layers, Activity, ChevronRight, HelpCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    uploadExcel,
    getExcelData,
    getExcelStats,
    getExcelCharts,
    sendDataChat,
    cleanData,
    autoDashboard,
    explainChart,
    generateInsights,
    explainAnomaly,
    simulateScenario,
    generateDataset
} from '../api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const Dashboard = () => {
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview, table, ai-chat, quality, simulation
    
    // Data states
    const [tableData, setTableData] = useState(null);
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // AI feature states
    const [aiInsights, setAiInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [cleaningData, setCleaningData] = useState(null);
    const [loadingCleaning, setLoadingCleaning] = useState(false);
    const [chartExplanations, setChartExplanations] = useState({});
    const [loadingExplanation, setLoadingExplanation] = useState(null);
    
    // Data Chat states
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    // Simulation states
    const [scenarioPrompt, setScenarioPrompt] = useState('');
    const [simulationResult, setSimulationResult] = useState(null);
    const [loadingSimulation, setLoadingSimulation] = useState(false);

    // Synthetic Data Gen states
    const [showGenModal, setShowGenModal] = useState(false);
    const [genPrompt, setGenPrompt] = useState('Generate monthly sales data for an electronics company with Product, Region, UnitsSold, Revenue, and Profit for 2025');
    const [generatingData, setGeneratingData] = useState(false);

    // File Upload Handler
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const uploaded = await uploadExcel(file);
            setDataset(uploaded);
            await loadDatasetDetails(uploaded.dataset_id);
        } catch (err) {
            console.error("Failed to upload dataset:", err);
            alert(err.response?.data?.detail || "Failed to parse file.");
        } finally {
            setLoading(false);
        }
    };

    const loadDatasetDetails = async (datasetId) => {
        try {
            const [rows, summaryStats, charts] = await Promise.all([
                getExcelData(datasetId, 100),
                getExcelStats(datasetId),
                getExcelCharts(datasetId)
            ]);
            setTableData(rows);
            setStats(summaryStats);
            setChartData(charts);
            setChatMessages([
                {
                    role: 'bot',
                    content: `Dataset **${rows.filename}** loaded with **${rows.row_count} rows** and **${rows.col_count} columns**. Ask me anything about this data!`
                }
            ]);
        } catch (err) {
            console.error("Error fetching dataset details:", err);
        }
    };

    // Executive Insights
    const handleGenerateInsights = async () => {
        if (!dataset) return;
        setLoadingInsights(true);
        try {
            const res = await generateInsights(dataset.dataset_id);
            setAiInsights(res.insights);
        } catch (err) {
            console.error(err);
            setAiInsights("Failed to generate executive insights.");
        } finally {
            setLoadingInsights(false);
        }
    };

    // Clean Data
    const handleCleanData = async () => {
        if (!dataset) return;
        setLoadingCleaning(true);
        try {
            const res = await cleanData(dataset.dataset_id);
            setCleaningData(res);
            setActiveTab('quality');
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCleaning(false);
        }
    };

    // Explain Chart
    const handleExplainChart = async (chartType, dataKey, dataPayload) => {
        if (!dataset) return;
        setLoadingExplanation(dataKey);
        try {
            const res = await explainChart(dataset.dataset_id, chartType, dataPayload);
            setChartExplanations(prev => ({ ...prev, [dataKey]: res.explanation }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingExplanation(null);
        }
    };

    // Data Chat Send
    const handleSendChat = async () => {
        if (!chatInput.trim() || !dataset || chatLoading) return;
        const userMsg = { role: 'user', content: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await sendDataChat(dataset.dataset_id, userMsg.content);
            setChatMessages(prev => [...prev, { role: 'bot', content: res.response }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'bot', content: "Sorry, I couldn't process your question." }]);
        } finally {
            setChatLoading(false);
        }
    };

    // Scenario Simulation
    const handleSimulate = async () => {
        if (!scenarioPrompt.trim() || !dataset || loadingSimulation) return;
        setLoadingSimulation(true);
        try {
            const res = await simulateScenario(dataset.dataset_id, scenarioPrompt);
            setSimulationResult(res);
        } catch (err) {
            console.error(err);
            setSimulationResult({ error: "Failed to run simulation." });
        } finally {
            setLoadingSimulation(false);
        }
    };

    // Generate Synthetic Dataset
    const handleGenerateDataset = async () => {
        if (!genPrompt.trim() || generatingData) return;
        setGeneratingData(true);
        try {
            const res = await generateDataset(genPrompt);
            const blob = new Blob([res.csv_data], { type: 'text/csv' });
            const file = new File([blob], "synthetic_dataset.csv", { type: 'text/csv' });
            
            // Auto upload generated file
            const uploaded = await uploadExcel(file);
            setDataset(uploaded);
            await loadDatasetDetails(uploaded.dataset_id);
            setShowGenModal(false);
        } catch (err) {
            console.error("Synthetic generation failed:", err);
            alert("Failed to generate synthetic data.");
        } finally {
            setGeneratingData(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a1128] text-slate-100 overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-wide">Callisto Analytics & Insights</h2>
                        <p className="text-xs text-slate-400">
                            {dataset ? `Active: ${dataset.filename} (${dataset.row_count} rows)` : "Upload or generate data to begin"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowGenModal(true)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition shadow-sm"
                    >
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        Generate Data with AI
                    </button>

                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition shadow-lg shadow-blue-600/20">
                        <Upload className="w-4 h-4" />
                        {loading ? "Processing..." : "Upload Excel / CSV"}
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={loading}
                        />
                    </label>
                </div>
            </header>

            {/* Empty State when no dataset is loaded */}
            {!dataset ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#0a1128] to-[#040817]">
                    <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/10 text-blue-400">
                        <FileSpreadsheet className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">No Dataset Loaded</h3>
                    <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
                        Upload your CSV or Excel workbook to instantly generate interactive charts, run AI-driven predictive insights, clean anomalies, and simulate what-if scenarios.
                    </p>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium cursor-pointer transition shadow-lg shadow-blue-600/30">
                            <Upload className="w-5 h-5" />
                            Upload Dataset (.csv, .xlsx)
                            <input
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </label>
                        <button
                            onClick={() => setShowGenModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium transition"
                        >
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            Create Demo Dataset
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Secondary Navigation Tabs & Quick Actions */}
                    <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0">
                        <div className="flex gap-1">
                            {[
                                { id: 'overview', label: 'Overview & Charts', icon: BarChart3 },
                                { id: 'table', label: 'Data Table', icon: Table },
                                { id: 'ai-chat', label: 'AI Data Chat', icon: Bot },
                                { id: 'quality', label: 'Data Quality & Cleaning', icon: AlertTriangle },
                                { id: 'simulation', label: 'What-If Simulation', icon: Play },
                            ].map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGenerateInsights}
                                disabled={loadingInsights}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                {loadingInsights ? "Analyzing..." : "Executive Insights"}
                            </button>
                            <button
                                onClick={handleCleanData}
                                disabled={loadingCleaning}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 transition"
                            >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                {loadingCleaning ? "Detecting..." : "Scan Quality"}
                            </button>
                        </div>
                    </div>

                    {/* Executive Insights Banner */}
                    {aiInsights && (
                        <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-950/50 to-indigo-950/50 border border-blue-500/30 relative flex-shrink-0">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-2">
                                    <Sparkles className="w-4 h-4" />
                                    <span>AI Executive Insights</span>
                                </div>
                                <button
                                    onClick={() => setAiInsights(null)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-xs text-slate-300 prose prose-invert max-w-none max-h-40 overflow-y-auto pr-2">
                                <ReactMarkdown>{aiInsights}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Summary Metrics Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                <p className="text-xs text-slate-400 font-medium">Total Rows</p>
                                <p className="text-2xl font-bold text-white mt-1">{stats?.row_count?.toLocaleString() || dataset.row_count}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                <p className="text-xs text-slate-400 font-medium">Total Columns</p>
                                <p className="text-2xl font-bold text-white mt-1">{stats?.col_count || dataset.col_count}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                <p className="text-xs text-slate-400 font-medium">Numeric Metrics</p>
                                <p className="text-2xl font-bold text-blue-400 mt-1">{dataset.numeric_columns?.length || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                <p className="text-xs text-slate-400 font-medium">Categorical Features</p>
                                <p className="text-2xl font-bold text-indigo-400 mt-1">{dataset.categorical_columns?.length || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                <p className="text-xs text-slate-400 font-medium">Missing Values</p>
                                <p className="text-2xl font-bold text-amber-400 mt-1">
                                    {stats?.missing_values ? Object.values(stats.missing_values).reduce((a, b) => a + b, 0) : 0}
                                </p>
                            </div>
                        </div>

                        {/* TAB 1: OVERVIEW & CHARTS */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Categorical Distribution Bar Charts */}
                                    {chartData?.bar_charts && Object.entries(chartData.bar_charts).map(([colName, data], index) => {
                                        const formattedData = data.labels.map((l, i) => ({ name: l, count: data.values[i] }));
                                        return (
                                            <div key={colName} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white capitalize">{colName} Distribution</h4>
                                                        <p className="text-xs text-slate-400">Top 10 categories by occurrence</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleExplainChart('bar', `bar_${colName}`, formattedData)}
                                                        disabled={loadingExplanation === `bar_${colName}`}
                                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
                                                    >
                                                        <Sparkles className="w-3 h-3" />
                                                        {loadingExplanation === `bar_${colName}` ? "Explaining..." : "AI Explain"}
                                                    </button>
                                                </div>

                                                <div className="h-64 w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={formattedData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
                                                            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                                            <Bar dataKey="count" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {chartExplanations[`bar_${colName}`] && (
                                                    <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-slate-300">
                                                        <ReactMarkdown>{chartExplanations[`bar_${colName}`]}</ReactMarkdown>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Numeric Metric Trends / Line Chart */}
                                    {chartData?.line && (
                                        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-white capitalize">{chartData.line.column} Sequence Trend</h4>
                                                    <p className="text-xs text-slate-400">Sequential pattern of first 50 entries</p>
                                                </div>
                                                <button
                                                    onClick={() => handleExplainChart('line', 'line_chart', chartData.line.data)}
                                                    disabled={loadingExplanation === 'line_chart'}
                                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    {loadingExplanation === 'line_chart' ? "Explaining..." : "AI Explain"}
                                                </button>
                                            </div>

                                            <div className="h-64 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData.line.data}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                        <XAxis dataKey="index" stroke="#64748b" tick={{ fontSize: 11 }} />
                                                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                                        <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {chartExplanations['line_chart'] && (
                                                <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-slate-300">
                                                    <ReactMarkdown>{chartExplanations['line_chart']}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Pie Chart of first categorical */}
                                    {chartData?.pie && (
                                        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-white capitalize">{chartData.pie.column} Share</h4>
                                                    <p className="text-xs text-slate-400">Proportional share breakdown</p>
                                                </div>
                                                <button
                                                    onClick={() => handleExplainChart('pie', 'pie_chart', chartData.pie.data)}
                                                    disabled={loadingExplanation === 'pie_chart'}
                                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    {loadingExplanation === 'pie_chart' ? "Explaining..." : "AI Explain"}
                                                </button>
                                            </div>

                                            <div className="h-64 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={chartData.pie.data}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={80}
                                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                        >
                                                            {chartData.pie.data.map((_, i) => (
                                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {chartExplanations['pie_chart'] && (
                                                <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-slate-300">
                                                    <ReactMarkdown>{chartExplanations['pie_chart']}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: DATA TABLE */}
                        {activeTab === 'table' && tableData && (
                            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="relative w-72">
                                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search table rows..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400">Showing {tableData.rows?.length || 0} rows</span>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[600px]">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-800/80 sticky top-0 text-slate-300 border-b border-slate-700">
                                            <tr>
                                                <th className="p-3">#</th>
                                                {tableData.columns.map((col) => (
                                                    <th key={col} className="p-3 font-semibold whitespace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                            {tableData.rows
                                                .filter(row => !searchTerm || JSON.stringify(row).toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                                                        <td className="p-3 text-slate-500">{idx + 1}</td>
                                                        {tableData.columns.map((col) => (
                                                            <td key={col} className="p-3 whitespace-nowrap">
                                                                {String(row[col] ?? '')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: AI DATA CHAT */}
                        {activeTab === 'ai-chat' && (
                            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl flex flex-col h-[650px]">
                                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bot className="w-5 h-5 text-blue-400" />
                                        <h4 className="text-sm font-bold text-white">Callisto Dataset Intelligence</h4>
                                    </div>
                                    <span className="text-xs text-slate-400">Context: {dataset.filename}</span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
                                                    msg.role === 'user'
                                                        ? 'bg-blue-600 text-white rounded-br-none'
                                                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                                                }`}
                                            >
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="p-3 rounded-2xl bg-slate-800/70 text-slate-400 text-xs flex items-center gap-2">
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                                Analyzing data patterns...
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Suggested Prompts */}
                                <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex gap-2 overflow-x-auto">
                                    {[
                                        "Summarize the key trends",
                                        "What are the top 3 anomalies?",
                                        "Suggest 3 business improvements",
                                        "Predict future performance"
                                    ].map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setChatInput(prompt)}
                                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap transition border border-slate-700/60"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-3 border-t border-slate-800 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ask any question about your data..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                        className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        disabled={chatLoading}
                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                                    >
                                        Ask
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: DATA QUALITY & CLEANING */}
                        {activeTab === 'quality' && (
                            <div className="space-y-6">
                                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
                                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        Data Quality & Anomaly Report
                                    </h4>
                                    <p className="text-xs text-slate-400 mb-4">
                                        Identifies missing values, outliers, and schema irregularities with actionable recommendations.
                                    </p>

                                    {cleaningData ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                                                    <h5 className="text-xs font-bold text-slate-300 mb-2">Detected Issues Summary</h5>
                                                    <div className="text-xs text-slate-400 space-y-1">
                                                        <p>Missing Cells: <span className="text-white font-medium">{cleaningData.issues?.total_missing || 0}</span></p>
                                                        <p>Columns with Missing Values: <span className="text-white font-medium">{cleaningData.issues?.columns_with_missing?.length || 0}</span></p>
                                                        <p>Duplicate Rows: <span className="text-white font-medium">{cleaningData.issues?.duplicate_rows || 0}</span></p>
                                                    </div>
                                                </div>
                                            </div>

                                            {cleaningData.explanation && (
                                                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-slate-300 prose prose-invert max-w-none">
                                                    <ReactMarkdown>{cleaningData.explanation}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <button
                                                onClick={handleCleanData}
                                                disabled={loadingCleaning}
                                                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition"
                                            >
                                                {loadingCleaning ? "Running Quality Audit..." : "Run Quality & Anomaly Audit"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 5: WHAT-IF SIMULATION */}
                        {activeTab === 'simulation' && (
                            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                        <Play className="w-4 h-4 text-indigo-400" />
                                        What-If Scenario Simulation
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        Simulate changes to business variables and analyze estimated impact on key targets.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="e.g. What happens if marketing budget increases by 25% and unit price drops by 5%?"
                                        value={scenarioPrompt}
                                        onChange={(e) => setScenarioPrompt(e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        onClick={handleSimulate}
                                        disabled={loadingSimulation}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2"
                                    >
                                        {loadingSimulation ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                        Run Simulation
                                    </button>
                                </div>

                                {simulationResult && (
                                    <div className="p-4 rounded-xl bg-slate-800/80 border border-indigo-500/30 text-xs text-slate-300">
                                        <h5 className="font-bold text-white mb-2">Simulation Outcome:</h5>
                                        <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-[11px] text-indigo-300">
                                            {JSON.stringify(simulationResult, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal for Synthetic Data Generation */}
            {showGenModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                Generate Synthetic Dataset
                            </h3>
                            <button onClick={() => setShowGenModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">
                            Describe the domain, columns, and sample size. Callisto's AI will generate real CSV data and load it automatically into your dashboard.
                        </p>
                        <textarea
                            rows={4}
                            value={genPrompt}
                            onChange={(e) => setGenPrompt(e.target.value)}
                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowGenModal(false)}
                                className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerateDataset}
                                disabled={generatingData}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                            >
                                {generatingData ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {generatingData ? "Generating Data..." : "Generate & Load"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
