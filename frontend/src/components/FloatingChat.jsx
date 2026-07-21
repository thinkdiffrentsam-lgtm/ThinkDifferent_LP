import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'react-hot-toast';
import { 
  MessageSquare, 
  X, 
  Send, 
  Search, 
  Paperclip, 
  FileText, 
  Loader2, 
  Download, 
  Trash2, 
  ChevronLeft,
  Minimize2,
  Sparkles
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FloatingChat = () => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize socket and fetch contacts
  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', user._id);
    });

    fetchContacts();

    return () => {
      newSocket.close();
    };
  }, [user]);

  // Compute total unread count
  useEffect(() => {
    const count = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    setTotalUnread(count);
  }, [contacts]);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (activeContact && (message.sender === activeContact._id || message.receiver === activeContact._id)) {
        setMessages((prev) => [...prev, message]);
        if (message.sender === activeContact._id) {
          api.put(`/api/messages/${activeContact._id}/read`).catch(console.error);
        }
      }

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
      setContacts((prevContacts) =>
        prevContacts.map(c => {
          if (c.latestMessage && c.latestMessage._id === deletedMessageId) {
            return { ...c, latestMessage: { ...c.latestMessage, content: 'Message deleted', fileUrl: null } };
          }
          return c;
        })
      );
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
        if (isOnline) updated.add(userId);
        else updated.delete(userId);
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

  // Search contacts filter
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
    if (isOpen && activeContact) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeContact]);

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
    if (!newMessage.trim() || !activeContact || !socket) return;

    socket.emit('sendMessage', {
      sender: user._id,
      receiver: activeContact._id,
      content: newMessage.trim()
    });

    setNewMessage('');
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
    return format(new Date(dateString), 'h:mm a');
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Panel Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-96 h-[520px] max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center space-x-2 min-w-0">
              {activeContact ? (
                <button 
                  onClick={() => setActiveContact(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors mr-1"
                  title="Back to contacts"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : null}

              {activeContact ? (
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                      {activeContact.profilePicture ? (
                        <img src={activeContact.profilePicture} alt={activeContact.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        activeContact.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${onlineUsers.has(activeContact._id) ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold truncate text-slate-100">{activeContact.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${onlineUsers.has(activeContact._id) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {onlineUsers.has(activeContact._id) ? 'Available' : 'Not Available'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Quick Messages</h4>
                    <p className="text-[10px] text-slate-400">
                      {user.role === 'employee' ? 'Admin Support' : 'All Contacts'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1">
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Minimize panel"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {!activeContact ? (
              /* Contacts View */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 bg-white border-b border-slate-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input 
                      type="text" 
                      placeholder={user.role === 'employee' ? "Search admins..." : "Search contacts..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {filteredContacts.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      {user.role === 'employee' ? 'No administrators found' : 'No contacts found'}
                    </div>
                  ) : (
                    filteredContacts.map(contact => {
                      const isContactOnline = onlineUsers.has(contact._id);
                      return (
                        <div 
                          key={contact._id}
                          onClick={() => loadChat(contact)}
                          className="p-3 hover:bg-slate-100/70 cursor-pointer transition-colors flex items-center space-x-3 bg-white"
                        >
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                              {contact.profilePicture ? (
                                <img src={contact.profilePicture} alt={contact.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                contact.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span 
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isContactOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <h5 className="text-xs font-semibold text-slate-800 truncate">{contact.name}</h5>
                              {contact.latestMessage && (
                                <span className="text-[9px] text-slate-400 ml-1">
                                  {formatMessageDate(contact.latestMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className={`text-[11px] truncate ${contact.unreadCount > 0 ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>
                                {contact.latestMessage 
                                  ? (contact.latestMessage.fileUrl ? `📎 ${contact.latestMessage.fileName || 'Attachment'}` : contact.latestMessage.content) 
                                  : 'Start a conversation'}
                              </p>
                              {contact.unreadCount > 0 && (
                                <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full ml-1 shrink-0">
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
            ) : (
              /* Chat Messages View */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                      <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                      <p>Send a message to start chatting!</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.sender === user._id;
                      return (
                        <div key={msg._id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-center`}>
                          {isMe && (
                            <button 
                              onClick={() => deleteMessage(msg._id)}
                              className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-rose-500 hover:bg-rose-50 rounded transition-all shrink-0"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <div className={`max-w-[82%] rounded-xl px-3 py-2 ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                            {msg.fileUrl && (
                              <div className="mb-1.5">
                                {msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                  <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                                    <img src={msg.fileUrl} alt="attachment" className="rounded max-h-32 object-contain bg-black/5" />
                                  </a>
                                ) : (
                                  <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center space-x-1.5 p-1.5 rounded ${isMe ? 'bg-indigo-700/50 hover:bg-indigo-700' : 'bg-slate-50 hover:bg-slate-100'} transition-colors`}>
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <span className="text-xs truncate">{msg.fileName || 'File'}</span>
                                    <Download className="w-3 h-3 shrink-0 opacity-70" />
                                  </a>
                                )}
                              </div>
                            )}
                            {msg.content && <p className="text-xs break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                            <div className={`text-[9px] mt-0.5 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {formatMessageTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-2.5 bg-white border-t border-slate-200">
                  <form onSubmit={sendMessage} className="flex space-x-2 items-center">
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
                      className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      title="Attach file"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !uploading) || uploading}
                      className="bg-indigo-600 text-white rounded-lg p-1.5 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group"
        aria-label="Open Floating Messages"
        title="Open Chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </div>
        )}
      </button>
    </>
  );
};

export default FloatingChat;
