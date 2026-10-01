import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Paperclip, Image as ImageIcon, Loader2, Sparkles, Download, Maximize2, X } from 'lucide-react';
import { sendMessage, getSessionMessages } from '../api';

const ChatInterface = ({ sessionId, refreshTrigger }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [isImageGenMode, setIsImageGenMode] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);

    const fetchHistory = async () => {
        if (!sessionId) return;
        try {
            const history = await getSessionMessages(sessionId);
            // Map DB format to UI format
            const formatted = history.map(msg => ({
                id: msg.id,
                role: msg.role === 'model' ? 'bot' : 'user',
                content: msg.content,
                timestamp: msg.timestamp
            }));
            setMessages(formatted);
        } catch (err) {
            console.error("Failed to load history", err);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [sessionId, refreshTrigger]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if ((!input.trim() && !selectedImage && selectedDocs.length === 0) || isLoading) return;

        let messageContent = input;
        if (isImageGenMode) {
            messageContent = `/image ${input}`;
        }

        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: messageContent,
            // Optimistic file display could be added here
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await sendMessage(userMsg.content, selectedImage, selectedDocs, sessionId);

            const botMsg = {
                id: Date.now() + 1,
                role: 'bot',
                content: response.response
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, { id: Date.now(), role: 'bot', content: "Error: Could not get response." }]);
        } finally {
            setIsLoading(false);
            setSelectedImage(null);
            setSelectedDocs([]);
            // Reset file inputs
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setSelectedDocs(Array.from(e.target.files));
        }
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-[#000B18] to-[#0d1b2a] relative">
            <div className="flex-1 overflow-y-auto p-4 chat-scroll">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-lg p-3 ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-slate-800/80 backdrop-blur-sm text-slate-100 rounded-bl-none border border-slate-700/50 px-4'
                            }`}>
                            {msg.role === 'bot' ? (
                                <div className="prose prose-sm max-w-none prose-invert">
                                    <ReactMarkdown
                                        components={{
                                            img: ({ node, ...props }) => (
                                                <div className="relative group inline-block max-w-full overflow-hidden rounded-lg">
                                                    <img {...props} className="max-w-full h-auto rounded-lg" />
                                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded-lg backdrop-blur-sm">
                                                        <button
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = props.src;
                                                                link.download = `generated-image-${Date.now()}.png`;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                            className="p-1.5 text-white hover:bg-white/20 rounded transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setViewingImage(props.src)}
                                                            className="p-1.5 text-white hover:bg-white/20 rounded transition-colors"
                                                            title="View Fullscreen"
                                                        >
                                                            <Maximize2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-slate-800/80 rounded-lg p-3 rounded-bl-none flex items-center gap-2 border border-slate-700/50">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            <span className="text-sm text-slate-300">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-slate-900/50 border-t border-slate-800 backdrop-blur-md">
                {/* File Previews */}
                {(selectedImage || selectedDocs.length > 0) && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                        {selectedImage && (
                            <div className="bg-blue-900/30 text-blue-200 text-xs px-2 py-1 rounded border border-blue-500/30 flex items-center">
                                Image: {selectedImage.name}
                            </div>
                        )}
                        {selectedDocs.map((file, idx) => (
                            <div key={idx} className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 flex items-center">
                                Doc: {file.name}
                            </div>
                        ))}
                    </div>
                )}

                <div className={`flex items-end gap-2 p-2 rounded-xl border transition-all ${isImageGenMode ? 'bg-purple-900/10 border-purple-500/30 ring-2 ring-purple-500/20' : 'bg-slate-800/50 border-slate-700/50 focus-within:ring-2 focus-within:ring-blue-500/20'}`}>
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Add Image"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Add PDF, DOCX, PPTX"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.pptx,.txt"
                        multiple
                        className="hidden"
                    />

                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>

                    <button
                        onClick={() => setIsImageGenMode(!isImageGenMode)}
                        className={`p-2 transition-all rounded-lg ${isImageGenMode
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-purple-400 hover:bg-purple-900/20'
                            }`}
                        title={isImageGenMode ? "Disable Image Generation" : "Enable Image Generation"}
                    >
                        <Sparkles className="w-5 h-5" />
                    </button>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={isImageGenMode ? "Describe the image you want to generate..." : "Type a message..."}
                        className="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-32 py-2 text-slate-200 placeholder-slate-500"
                        rows="1"
                    />

                    <button
                        onClick={handleSend}
                        disabled={isLoading || (!input.trim() && !selectedImage && selectedDocs.length === 0)}
                        className={`p-2 text-white rounded-lg transition-colors ${isImageGenMode
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>


            {/* Lightbox Modal */}
            {
                viewingImage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition-opacity">
                        <button
                            onClick={() => setViewingImage(null)}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={viewingImage}
                            alt="Full screen view"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                )
            }
        </div>
    );
};

export default ChatInterface;
