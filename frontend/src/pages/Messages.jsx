import React from 'react';
import { toast } from 'react-hot-toast';
import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import { format, isToday, isYesterday } from 'date-fns';
import { Send, User as UserIcon, Search, MessageSquare, Paperclip, FileText, Image as ImageIcon, Loader2, Download, Trash2 } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Messages = () => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Socket and Fetch Contacts
  useEffect(() => {
    if (!user) return;

    // Connect to socket
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', user._id);
    });

    fetchContacts();

    return () => newSocket.close();
  }, [user]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      // If message is for the currently open chat, append it
      if (activeContact && (message.sender === activeContact._id || message.receiver === activeContact._id)) {
        setMessages((prev) => [...prev, message]);
        // Optionally mark as read immediately
        if (message.sender === activeContact._id) {
          api.put(`/api/messages/${activeContact._id}/read`).catch(console.error);
        }
      }

      // Update contacts list with latest message
      setContacts((prevContacts) => {
        const updated = prevContacts.map(c => {
          if (c._id === message.sender || c._id === message.receiver) {
            const isUnread = message.sender === c._id && (!activeContact || activeContact._id !== c._id);
            return {
              ...c,
              latestMessage: message,
              unreadCount: isUnread ? (c.unreadCount || 0) + 1 : c.unreadCount
            };
          }
          return c;
        });
        
        // Move updated contact to top
        return updated.sort((a, b) => {
          if (a.latestMessage && b.latestMessage) {
            return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
          }
          return a.latestMessage ? -1 : 1;
        });
      });
    };

    const handleDeleteMessage = (deletedMessageId) => {
      setMessages((prev) => prev.filter(msg => msg._id !== deletedMessageId));
      
      setContacts((prevContacts) => {
        return prevContacts.map(c => {
          if (c.latestMessage && c.latestMessage._id === deletedMessageId) {
            return { ...c, latestMessage: { ...c.latestMessage, content: 'Message deleted', fileUrl: null } };
          }
          return c;
        });
      });
    };

    const handleMessagingError = (err) => {
      toast.error(err.message || 'Messaging error');
    };

    const handleGetOnlineUsers = (userIds) => {
      setOnlineUsers(new Set(userIds));
    };

    const handleUserStatus = ({ userId, isOnline }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (isOnline) {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageSent', handleReceiveMessage);
    socket.on('messageDeleted', handleDeleteMessage);
    socket.on('messagingError', handleMessagingError);
    socket.on('getOnlineUsers', handleGetOnlineUsers);
    socket.on('userStatus', handleUserStatus);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageSent', handleReceiveMessage);
      socket.off('messageDeleted', handleDeleteMessage);
      socket.off('messagingError', handleMessagingError);
      socket.off('getOnlineUsers', handleGetOnlineUsers);
      socket.off('userStatus', handleUserStatus);
    };
  }, [socket, activeContact]);

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      setFilteredContacts(
        contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  }, [searchQuery, contacts]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/api/messages/contacts');
      setContacts(res.data);
      setFilteredContacts(res.data);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    }
  };

  const loadChat = async (contact) => {
    setActiveContact(contact);
    try {
      const res = await api.get(`/api/messages/${contact._id}`);
      setMessages(res.data);
      
      // Mark as read
      if (contact.unreadCount > 0) {
        await api.put(`/api/messages/${contact._id}/read`);
        setContacts(prev => prev.map(c => c._id === contact._id ? { ...c, unreadCount: 0 } : c));
      }
    } catch (err) {
      console.error('Failed to load messages', err);
      toast.error(err.response?.data?.message || 'Failed to load messages');
      setActiveContact(null);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const contentToSend = newMessage.trim();
    if (!contentToSend || !activeContact) return;

    setNewMessage('');

    try {
      const res = await api.post('/api/messages', {
        receiver: activeContact._id,
        content: contentToSend
      });

      const sentMsg = res.data;

      // Emit via socket if connected for real-time receiver notification
      if (socket && socket.connected) {
        socket.emit('sendMessage', {
          sender: user._id,
          receiver: activeContact._id,
          content: contentToSend
        });
      } else {
        setMessages((prev) => [...prev, sentMsg]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
  };

  const deleteMessage = (msgId) => {
    if (!socket || !activeContact) return;
    socket.emit('deleteMessage', {
      messageId: msgId,
      receiver: activeContact._id
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeContact || !socket) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/upload/chat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      socket.emit('sendMessage', {
        sender: user._id,
        receiver: activeContact._id,
        content: '',
        fileUrl: res.data.url,
        fileName: res.data.filename || file.name
      });
    } catch (error) {
      console.error('File upload failed', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="h-[calc(100vh-105px)] md:h-[calc(100vh-120px)] flex flex-col md:flex-row bg-white rounded-none md:rounded-2xl shadow-none md:shadow-sm border-0 md:border border-slate-200 overflow-hidden m-0 md:m-6">
      
      {/* Sidebar - Contacts List */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 flex flex-col ${activeContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Messages</h2>
            {user?.role === 'employee' && (
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                Admin Support
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder={user?.role === 'employee' ? "Search admins..." : "Search contacts..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              {user?.role === 'employee' ? 'No administrators found' : 'No contacts found'}
            </div>
          ) : (
            filteredContacts.map(contact => {
              const isContactOnline = onlineUsers.has(contact._id);
              return (
                <div 
                  key={contact._id}
                  onClick={() => loadChat(contact)}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors flex items-center space-x-3 ${activeContact?._id === contact._id ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                      {contact.profilePicture ? (
                        <img src={contact.profilePicture} alt={contact.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        contact.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span 
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isContactOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      title={isContactOnline ? 'Available' : 'Not Available'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{contact.name}</h3>
                      </div>
                      {contact.latestMessage && (
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                          {formatMessageDate(contact.latestMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.2 rounded ${isContactOnline ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/50' : 'text-slate-400 bg-slate-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isContactOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        {isContactOnline ? 'Available' : 'Not Available'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-xs truncate ${contact.unreadCount > 0 ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>
                        {contact.latestMessage 
                          ? (contact.latestMessage.fileUrl ? `📎 ${contact.latestMessage.fileName || 'Attachment'}` : contact.latestMessage.content) 
                          : 'Start a conversation'}
                      </p>
                      {contact.unreadCount > 0 && (
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-50 ${!activeContact ? 'hidden md:flex' : 'flex'}`}>
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center space-x-3">
              <button 
                onClick={() => setActiveContact(null)}
                className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg mr-2"
              >
                &larr; Back
              </button>
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  {activeContact.profilePicture ? (
                    <img src={activeContact.profilePicture} alt={activeContact.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    activeContact.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span 
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${onlineUsers.has(activeContact._id) ? 'bg-emerald-500' : 'bg-slate-300'}`}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">{activeContact.name}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 capitalize">{activeContact.role}</span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className={`text-xs font-medium flex items-center ${onlineUsers.has(activeContact._id) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${onlineUsers.has(activeContact._id) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    {onlineUsers.has(activeContact._id) ? 'Available' : 'Not Available'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="text-sm">No messages yet. Send a message to start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender === user._id;
                  const showDate = index === 0 || formatMessageDate(messages[index-1].createdAt) !== formatMessageDate(msg.createdAt);
                  
                  return (
                    <React.Fragment key={msg._id || index}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="bg-slate-200/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                            {formatMessageDate(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-center`}>
                        {isMe && (
                          <button 
                            onClick={() => deleteMessage(msg._id)}
                            className="opacity-0 group-hover:opacity-100 p-2 mr-2 text-rose-500 hover:bg-rose-50 rounded-full transition-all self-center shrink-0"
                            title="Delete message"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className={`max-w-[75%] md:max-w-[65%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                          {msg.fileUrl && (
                            <div className="mb-2">
                              {msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                                  <img src={msg.fileUrl} alt="attachment" className="rounded-lg max-h-48 object-contain bg-black/5" />
                                </a>
                              ) : (
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center space-x-2 p-2 rounded-lg ${isMe ? 'bg-indigo-700/50 hover:bg-indigo-700' : 'bg-slate-50 hover:bg-slate-100'} transition-colors`}>
                                  <FileText className="w-5 h-5 shrink-0" />
                                  <span className="text-sm truncate">{msg.fileName || 'Download File'}</span>
                                  <Download className="w-4 h-4 shrink-0 opacity-70" />
                                </a>
                              )}
                            </div>
                          )}
                          {msg.content && <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>}
                          <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {formatMessageTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={sendMessage} className="flex space-x-3 items-center">
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  title="Attach file"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !uploading) || uploading}
                  className="bg-indigo-600 text-white rounded-xl px-5 py-2.5 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="w-16 h-16 mb-4 text-slate-200" />
            <h3 className="text-lg font-bold text-slate-600 mb-1">Your Messages</h3>
            <p className="text-sm">Select a contact from the sidebar to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
