import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { getSessions, createSession, deleteSession } from './api';

function App() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'chat'

  useEffect(() => {
    // Check for persisted login
    const savedUser = localStorage.getItem('chat_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('chat_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setSessions([]);
    setCurrentSessionId(null);
    localStorage.removeItem('chat_user');
  };

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions", error);
    }
  };

  const handleNewChat = async () => {
    try {
      const newSession = await createSession("New Chat");
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setRefreshTrigger(prev => prev + 1);
      setActiveView('chat');
    } catch (error) {
      console.error("Failed to create new session", error);
    }
  };

  const handleSelectSession = (id) => {
    setCurrentSessionId(id);
    setRefreshTrigger(prev => prev + 1);
    setActiveView('chat');
  };

  const handleDeleteSession = async (id) => {
    if (confirm("Are you sure you want to delete this chat?")) {
      try {
        await deleteSession(id);
        setSessions(sessions.filter(s => s.id !== id));
        if (currentSessionId === id) {
          setCurrentSessionId(null);
        }
      } catch (error) {
        console.error("Failed to delete session", error);
      }
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        user={user}
        onLogout={handleLogout}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      {activeView === 'dashboard' ? (
        <Dashboard />
      ) : currentSessionId ? (
        <ChatInterface
          key={currentSessionId}
          sessionId={currentSessionId}
          refreshTrigger={refreshTrigger}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#000B18] to-[#0d1b2a] text-slate-300">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-3 text-white">Welcome, {user.username}</h1>
            <p className="text-lg">Select a chat from the sidebar or start a new one.</p>
            <button
              onClick={handleNewChat}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-medium"
            >
              Start New Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
