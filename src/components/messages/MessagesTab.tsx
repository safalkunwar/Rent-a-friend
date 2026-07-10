import React, { useState } from 'react';
import { Search, Send, Image as ImageIcon, Phone, Video, Info } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { COMPANIONS } from '../../data';
import * as motion from 'motion/react-client';

export const MessagesTab: React.FC = () => {
  const { conversations, messages, sendMessage, currentUser } = useAppContext();
  const { showToast } = useToast();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  // Mock initial conversations if empty
  const activeConvos = conversations.length > 0 ? conversations : [
    { id: 'c1', participantIds: ['u1', 'c1'], unreadCount: 0, lastMessage: { id: 'm1', conversationId: 'c1', senderId: 'c1', text: 'Hey! Looking forward to our coffee meetup.', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: true } },
    { id: 'c2', participantIds: ['u1', 'c2'], unreadCount: 2, lastMessage: { id: 'm2', conversationId: 'c2', senderId: 'c2', text: 'Are we still on for tomorrow?', timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: false } }
  ];

  const currentChat = activeConvos.find(c => c.id === selectedConvo);
  const chatMessages = messages.filter(m => m.conversationId === selectedConvo);
  
  // Mix in some mock initial messages if chatMessages is empty
  const displayMessages = chatMessages.length > 0 ? chatMessages : 
    (selectedConvo ? [{ id: 'm-init', conversationId: selectedConvo, senderId: currentChat?.participantIds[1] || '', text: currentChat?.lastMessage?.text || 'Hello!', timestamp: currentChat?.lastMessage?.timestamp || new Date().toISOString(), isRead: true }] : []);

  const handleSend = () => {
    if (!inputText.trim() || !selectedConvo) return;
    sendMessage(selectedConvo, inputText);
    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-160px)] md:h-[700px] flex rounded-3xl overflow-hidden border border-[#2A2D31] bg-[#0F1113]">
      {/* Sidebar */}
      <div className={`w-full md:w-80 flex-col border-r border-[#2A2D31] bg-[#17191C] ${selectedConvo ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#2A2D31]">
          <h2 className="text-xl font-bold text-white mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299]" />
            <input type="text" placeholder="Search conversations..." className="w-full bg-[#1E2124] text-white border border-[#2A2D31] rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#C8A25E]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeConvos.map(convo => {
            const companionId = convo.participantIds.find(id => id !== currentUser?.id);
            const companion = COMPANIONS.find(c => c.id === companionId);
            if (!companion) return null;

            return (
              <div 
                key={convo.id} 
                onClick={() => setSelectedConvo(convo.id)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-[#1E2124] transition-colors border-b border-[#2A2D31]/50 ${selectedConvo === convo.id ? 'bg-[#1E2124]' : ''}`}
              >
                <div className="relative">
                  <img src={companion.imageUrl} alt={companion.name} className="w-12 h-12 rounded-full object-cover" />
                  {convo.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C8A25E] text-[#0F1113] text-[10px] font-bold rounded-full flex items-center justify-center">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-semibold text-white truncate">{companion.name}</h4>
                    <span className="text-xs text-[#8E9299]">
                      {convo.lastMessage ? new Date(convo.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${convo.unreadCount > 0 ? 'text-white font-medium' : 'text-[#8E9299]'}`}>
                    {convo.lastMessage?.text || 'Tap to chat'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConvo ? (
        <div className="flex-1 flex flex-col bg-[#0F1113]">
          {/* Header */}
          <div className="h-16 border-b border-[#2A2D31] flex items-center justify-between px-6 bg-[#17191C]">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedConvo(null)} className="md:hidden text-[#8E9299] hover:text-white mr-2">
                ←
              </button>
              {(() => {
                const comp = COMPANIONS.find(c => c.id === currentChat?.participantIds.find(id => id !== currentUser?.id));
                return comp ? (
                  <>
                    <img src={comp.imageUrl} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <h3 className="font-bold text-white text-sm">{comp.name}</h3>
                      <span className="text-xs text-green-500">Online</span>
                    </div>
                  </>
                ) : null;
              })()}
            </div>
            <div className="flex items-center gap-4 text-[#8E9299]">
              <Phone onClick={() => showToast('Audio calls coming soon', 'info')} className="w-5 h-5 cursor-pointer hover:text-white transition" />
              <Video onClick={() => showToast('Video calls coming soon', 'info')} className="w-5 h-5 cursor-pointer hover:text-white transition" />
              <Info onClick={() => showToast('User info coming soon', 'info')} className="w-5 h-5 cursor-pointer hover:text-white transition" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {displayMessages.map(msg => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMe ? 'bg-[#C8A25E] text-[#0F1113] rounded-br-sm' : 'bg-[#1E2124] text-white rounded-bl-sm border border-[#2A2D31]'}`}>
                    <p className="text-sm md:text-base">{msg.text}</p>
                    <span className={`text-[10px] mt-1 block ${isMe ? 'text-[#0F1113]/70' : 'text-[#8E9299]'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-4 bg-[#17191C] border-t border-[#2A2D31]">
            <div className="flex items-center gap-3">
              <button onClick={() => showToast('Image attachments coming soon', 'info')} className="text-[#8E9299] hover:text-[#C8A25E] transition p-2 bg-[#1E2124] rounded-full">
                <ImageIcon className="w-5 h-5" />
              </button>
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-[#1E2124] text-white border border-[#2A2D31] rounded-full px-5 py-3 focus:outline-none focus:border-[#C8A25E]"
              />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="w-12 h-12 bg-[#C8A25E] text-[#0F1113] rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#B69150] transition-colors"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#0F1113] text-[#8E9299]">
          <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
          <p>Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );
};

// Helper for the empty state
import { MessageSquare } from 'lucide-react';
