import React, { useState } from 'react';
import { MessageSquare, Plus, Search, Trash2, LogOut, LayoutDashboard, MessageCircle } from 'lucide-react';
import logo from '../assets/logo.jpg';

const Sidebar = ({ sessions, currentSessionId, onSelectSession, onNewChat, onDeleteSession, user, onLogout, activeView, onViewChange }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSessions = sessions.filter(session =>
        session.title && session.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-64 bg-slate-900 h-full flex flex-col border-r border-slate-800 text-slate-300">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
                <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-blue-900/40 border-2 border-blue-500/30">
                    <img src={logo} alt="Callisto AI" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">Callisto AI</h1>
                    <p className="text-xs text-blue-400 font-medium">Data Analytics & Chat</p>
                </div>
            </div>

            {/* View Toggle */}
            <div className="p-3 border-b border-slate-800/50">
                <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
                    <button
                        onClick={() => onViewChange('dashboard')}
                        className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all
                            ${activeView === 'dashboard'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => onViewChange('chat')}
                        className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all
                            ${activeView === 'chat'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat
                    </button>
                </div>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
                <button
                    onClick={onNewChat}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">New Chat</span>
                </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800/50 text-slate-200 pl-9 pr-3 py-2 rounded-lg text-sm border border-slate-700/50 focus:border-slate-600 focus:outline-none placeholder-slate-500 transition-colors"
                    />
                </div>
            </div>

            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Recent Chats
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {filteredSessions.map(session => (
                    <div
                        key={session.id}
                        className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all mb-1 ${session.id === currentSessionId && activeView === 'chat'
                            ? 'bg-slate-800 text-white shadow-md'
                            : 'hover:bg-slate-800/50 hover:text-white'
                            }`}
                        onClick={() => onSelectSession(session.id)}
                    >
                        <MessageSquare className={`w-4 h-4 shrink-0 ${session.id === currentSessionId && activeView === 'chat' ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                        <div className="truncate text-sm flex-1 pr-6 font-medium">
                            {session.title || "New Chat"}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                            }}
                            className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                            title="Delete Chat"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* User Profile / Logout */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{user?.username || 'User'}</p>
                        <p className="text-xs text-slate-500 truncate">Online</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
