'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export default function Home() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  //  Load current user's messages only
  const fetchMessages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('Message')
      .select('content, user_id, created_at')
      .eq('user_id', user.email)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const filtered = data.map((msg: any, idx: number) => ({
        role: idx % 2 === 0 ? 'user' : 'ai',
        content: msg.content,
      }));
      setMessages(filtered);
    } else {
      console.error('Error loading messages:', error?.message);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const newUserMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setLoading(true);

    //  Save user message
    await supabase.from('Message').insert({
      user_id: user.email,
      content: input,
    });

    // Get Gemini reply
    const res = await fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ message: input }),
    });
    const { reply } = await res.json();

    const aiMsg: Message = { role: 'ai', content: reply };

    //  Save Gemini reply under same user
    await supabase.from('Message').insert({
      user_id: user.email,
      content: reply,
    });

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  //  Clear user's own chat
  const handleClearChat = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('Message')
      .delete()
      .eq('user_id', user.email);

    if (error) {
      console.error(' Failed to clear messages:', error.message);
    } else {
      setMessages([]);
    }
  };

  if (!user) {
    return (
      <div className="container text-center mt-5">
        <h4>Please log in to use the chat</h4>
        <a href="/api/auth/login" className="btn btn-primary">Login</a>
      </div>
    );
  }

  return (
    <div className="container-fluid p-3" style={{ maxWidth: '500px', margin: 'auto' }}>
      <h4 className="text-center mb-3">Hi, {user.name || user.email}</h4>

      <div className="border rounded p-3 mb-3" style={{ height: '60vh', overflowY: 'auto', background: '#f4f4f4' }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`d-flex mb-2 ${msg.role === 'user' ? 'justify-content-start' : 'justify-content-end'}`}
          >
            <div
              className={`px-3 py-2 rounded-pill ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-light border'}`}
              style={{ maxWidth: '75%' }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="d-flex justify-content-end">
            <div className="px-3 py-2 rounded-pill bg-light border text-muted">
              Gemini is typing...
            </div>
          </div>
        )}
      </div>

      <div className="d-flex">
        <input
          type="text"
          className="form-control me-2"
          placeholder="Ask Gemini anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>

      <div className="text-center mt-3 d-flex justify-content-center gap-2">
        <button className="btn btn-outline-danger btn-sm" onClick={handleClearChat}>
          Clear My Chat
        </button>
        <a href="/api/auth/logout" className="btn btn-outline-secondary btn-sm">
          Logout
        </a>
      </div>
    </div>
  );
}
