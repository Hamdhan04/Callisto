import sqlite3
import json
from datetime import datetime

DB_NAME = "chat_history.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Create sessions table
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create messages table with session_id
    # Note: SQLite ALTER TABLE is limited, so for existing DBs without session_id, 
    # we might need to handle migration manually or just let it fail/recreate if expected.
    # For now, we'll create if not exists. If it exists but lacks session_id, it might error on insert.
    # A robust solution would check columns.
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'text',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    ''')
    
    # Check if session_id column exists in messages, if not add it (Migration for existing DB)
    try:
        c.execute("SELECT session_id FROM messages LIMIT 1")
    except sqlite3.OperationalError:
        print("Migrating messages table: adding session_id column")
        c.execute("ALTER TABLE messages ADD COLUMN session_id TEXT")

    # Create users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

def create_user(user_id, username, password_hash):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", 
                  (user_id, username, password_hash))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_user_by_username(username):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = c.fetchone()
    conn.close()
    return dict(user) if user else None

def create_session(session_id, title="New Chat"):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO sessions (id, title) VALUES (?, ?)", (session_id, title))
    conn.commit()
    conn.close()

def get_sessions():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM sessions ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_session(session_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    c.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()

def add_message(session_id, role, content, msg_type="text"):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO messages (session_id, role, content, type) VALUES (?, ?, ?, ?)", 
              (session_id, role, content, msg_type))
    msg_id = c.lastrowid
    
    # Update session title if it's the first user message
    if role == "user":
        # Check if it's the first message or query simply
        c.execute("UPDATE sessions SET title = ? WHERE id = ? AND title = 'New Chat'", 
                  (content[:30] + "..." if len(content) > 30 else content, session_id))
                  
    conn.commit()
    conn.close()
    return msg_id

def get_messages(session_id):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_message(msg_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM messages WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()

def get_last_message_id(session_id, role="user"):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT id FROM messages WHERE session_id = ? AND role = ? ORDER BY id DESC LIMIT 1", (session_id, role))
    result = c.fetchone()
    conn.close()
    return result[0] if result else None

