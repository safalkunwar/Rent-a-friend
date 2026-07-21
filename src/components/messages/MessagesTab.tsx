import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Send, Image as ImageIcon, Phone, Video, Info, MessageSquare, LogIn, Wifi, Users, Compass, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { firestore } from '../../services/firestore';
import { useCompanions } from '../../hooks/useFirestoreData';
import { SafeImage } from '../ui/SafeImage';

interface MessagesTabProps {
  onOpenAuth?: (mode: 'login' | 'signup' | 'guide') => void;
  initialCompanionId?: string | null;
  onBrowseCompanions?: () => void;
  onBrowseActivities?: () => void;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({ 
  onOpenAuth, 
  initialCompanionId,
  onBrowseCompanions,
  onBrowseActivities
}) => {
  const { currentUser, getConversationId, bookings } = useAppContext();
  const { showToast } = useToast();
  const { companions: fetchedCompanions } = useCompanions();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [localConversations, setLocalConversations] = useState<Record<string, any>>({});
  const [localMessages, setLocalMessages] = useState<Record<string, any[]>>({});
  const [travelerProfiles, setTravelerProfiles] = useState<Record<string, { name: string; avatar: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when messages load or change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConvo, localMessages]);

  // Subscribe to ALL conversations involving current user (real-time stream)
  useEffect(() => {
    if (!currentUser) return;

    const convoUnsub = firestore.subscribe<any>(
      'conversations',
      { where: [{ field: 'participantIds', operator: 'array-contains', value: currentUser.id }] },
      (items) => {
        const convoMap: Record<string, any> = {};
        items.forEach(convo => {
          convoMap[convo.id] = convo;
        });
        setLocalConversations(convoMap);
      }
    );

    return () => {
      convoUnsub();
    };
  }, [currentUser]);

  // Subscribe to messages of the SELECTED conversation only (Minimal Reads Optimization)
  useEffect(() => {
    if (!currentUser || !selectedConvo) return;

    const msgUnsub = firestore.subscribe<any>(
      'messages',
      { where: [{ field: 'conversationId', operator: '==', value: selectedConvo }], orderByField: 'timestamp', orderDirection: 'asc' },
      (items) => {
        setLocalMessages(prev => ({
          ...prev,
          [selectedConvo]: items,
        }));
      }
    );

    return () => {
      msgUnsub();
    };
  }, [currentUser, selectedConvo]);

  // Fetch traveler/customer profiles that are not in fetchedCompanions
  useEffect(() => {
    if (!currentUser) return;
    const fetchMissingProfiles = async () => {
      const convoList = Object.values(localConversations);
      const missingIds = convoList
        .map(convo => convo.participantIds?.find((id: string) => id !== currentUser.id))
        .filter((id): id is string => !!id && !fetchedCompanions.some(c => c.id === id) && !travelerProfiles[id]);

      if (missingIds.length === 0) return;

      for (const id of missingIds) {
        try {
          const userDoc = await firestore.getDocument<any>(`users/${id}`);
          if (userDoc) {
            setTravelerProfiles(prev => ({
              ...prev,
              [id]: {
                name: userDoc.name || "SATHI Traveler",
                avatar: userDoc.avatar || ""
              }
            }));
          } else {
            const isCustomer = id.includes('customer');
            setTravelerProfiles(prev => ({
              ...prev,
              [id]: {
                name: isCustomer ? `Traveler (${id.split('-').pop()})` : "SATHI User",
                avatar: ""
              }
            }));
          }
        } catch (err) {
          console.error("[SATHI Messages] Error fetching traveler profile:", err);
        }
      }
    };
    fetchMissingProfiles();
  }, [localConversations, fetchedCompanions, currentUser, travelerProfiles]);

  // Reset unread count when selecting a conversation
  useEffect(() => {
    if (!currentUser || !selectedConvo) return;
    
    const markAsRead = async () => {
      try {
        await firestore.setDocument(`conversations/${selectedConvo}`, {
          unreadCount: 0
        }, true);
      } catch (err) {
        console.error("[SATHI Messages] Error marking conversation as read:", err);
      }
    };
    markAsRead();
  }, [currentUser, selectedConvo]);

  // Automatically select conversation if initialCompanionId is provided
  useEffect(() => {
    if (initialCompanionId && currentUser) {
      const convoId = getConversationId(initialCompanionId);
      if (convoId) {
        setSelectedConvo(convoId);
      }
    }
  }, [initialCompanionId, currentUser, getConversationId]);

  const conversations = useMemo(() => {
    const list = Object.entries(localConversations).map(([id, convo]) => ({
      id,
      ...convo
    }));

    // If initial companion deep link is present, but no conversation exists yet, prepend a virtual one
    if (initialCompanionId && currentUser) {
      const convoId = getConversationId(initialCompanionId);
      const exists = list.some(c => c.id === convoId);
      if (!exists) {
        list.push({
          id: convoId,
          participantIds: [currentUser.id, initialCompanionId],
          unreadCount: 0,
          lastMessage: {
            text: 'Start your conversation',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    return list.sort((a: any, b: any) => {
      const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [localConversations, initialCompanionId, currentUser, getConversationId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(convo => {
      if (!searchQuery.trim()) return true;
      const cId = convo.participantIds.find((id: string) => id !== currentUser?.id) || '';
      const profile = fetchedCompanions.find(c => c.id === cId) || travelerProfiles[cId];
      const partnerName = profile?.name || (cId.includes('customer') ? `Traveler (${cId.split('-').pop()})` : "SATHI User");
      return partnerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
             convo.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery, currentUser, fetchedCompanions, travelerProfiles]);

  const messages = useMemo(() => {
    if (!selectedConvo) return [];
    return localMessages[selectedConvo] || [];
  }, [selectedConvo, localMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || !currentUser || !selectedConvo) return;
    const text = inputText.trim();

    const otherId = selectedConvo.split('_').find(id => id !== currentUser.id) || '';

    // Business Rule: Restrict pre-booking inquiries to max 2 messages before booking confirmation/request
    const hasConfirmedBooking = bookings?.some(b => 
      ((b.userId === currentUser.id && b.companionId === otherId) || 
       (b.userId === otherId && b.companionId === currentUser.id)) && 
      (b.status === 'pending' || b.status === 'confirmed' || b.status === 'active' || b.status === 'completed')
    );

    if (!hasConfirmedBooking) {
      const sentCount = messages.filter(m => m.senderId === currentUser.id).length;
      if (sentCount >= 2) {
        showToast('Pre-booking messages are limited to 2 inquiries. Please request a booking to unlock full chat.', 'info');
        return;
      }
    }

    setInputText('');

    const msgId = `msg-${Date.now()}`;
    await firestore.setDocument(`messages/${msgId}`, {
      id: msgId,
      conversationId: selectedConvo,
      senderId: currentUser.id,
      text,
      timestamp: new Date().toISOString(),
      isRead: false,
    });

    await firestore.setDocument(`conversations/${selectedConvo}`, {
      id: selectedConvo,
      participantIds: [currentUser.id, otherId],
      lastMessage: {
        id: msgId,
        conversationId: selectedConvo,
        senderId: currentUser.id,
        text,
        timestamp: new Date().toISOString(),
        isRead: false,
      },
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    }, true);
  };

  const currentChat = conversations.find(c => c.id === selectedConvo);
  const companionId = currentChat?.participantIds.find((id: string) => id !== currentUser?.id) || 
    (selectedConvo ? selectedConvo.split('_').find(id => id !== currentUser?.id) : undefined);
  const companion = useMemo(() => {
    const rawComp = fetchedCompanions.find(c => c.id === companionId);
    if (rawComp) return rawComp;
    if (companionId && travelerProfiles[companionId]) {
      return {
        id: companionId,
        name: travelerProfiles[companionId].name,
        imageUrl: travelerProfiles[companionId].avatar,
        isVerified: false,
        interests: []
      };
    }
    if (companionId) {
      return {
        id: companionId,
        name: companionId.includes('customer') ? `Traveler (${companionId.split('-').pop()})` : "SATHI User",
        imageUrl: "",
        isVerified: false,
        interests: []
      };
    }
    return undefined;
  }, [fetchedCompanions, companionId, travelerProfiles]);

  return (
    <div className="h-[calc(100vh-180px)] md:h-[650px] flex rounded-3xl overflow-hidden border border-[#2A2D31] bg-[#0F1113] transition-all duration-300">
      {/* Sidebar */}
      <div className={`w-full md:w-80 flex-col border-r border-[#2A2D31] bg-[#17191C] ${selectedConvo ? 'hidden md:flex' : 'flex'}`} role="region" aria-label="Conversations">
        <div className="p-4 border-b border-[#2A2D31]">
          <h2 className="text-xl font-bold text-white mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299]" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              aria-label="Search conversations" 
              className="w-full bg-[#1E2124] text-white border border-[#2A2D31] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#C8A25E]" 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white text-xs">Clear</button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!currentUser ? (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#C8A25E]/10 flex items-center justify-center text-[#C8A25E]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#8E9299]">Log in to view messages.</p>
              {onOpenAuth && (
                <button 
                  onClick={() => onOpenAuth('login')} 
                  className="px-4 py-2 bg-[#C8A25E] text-[#0F1113] rounded-xl text-xs font-bold hover:bg-[#B69150] transition-all flex items-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" /> Log In
                </button>
              )}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[#8E9299]">
                <MessageSquare className="w-6 h-6 opacity-40" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">No conversations yet</p>
                <p className="text-xs text-[#8E9299] mt-1 max-w-[200px] mx-auto">Start exploring companions and send your first message.</p>
              </div>
              <div className="flex flex-col gap-2 w-full px-4">
                <button 
                  onClick={onBrowseCompanions} 
                  className="w-full py-2 bg-[#C8A25E] text-black rounded-xl text-xs font-bold hover:bg-[#B69150] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" /> Browse Companions
                </button>
                <button 
                  onClick={onBrowseActivities} 
                  className="w-full py-2 bg-[#1E2124] text-white border border-[#2A2D31] rounded-xl text-xs font-bold hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-[#C8A25E]" /> Browse Activities
                </button>
              </div>
            </div>
          ) : (
            filteredConversations.map((convo) => {
              const cId = convo.participantIds.find((id: string) => id !== currentUser?.id) || '';
              const profile = fetchedCompanions.find(c => c.id === cId) || travelerProfiles[cId];
              const comp = {
                name: profile?.name || (cId.includes('customer') ? `Traveler (${cId.split('-').pop()})` : "SATHI User"),
                imageUrl: (profile as any)?.imageUrl || (profile as any)?.avatar || "",
                isVerified: (profile as any)?.isVerified || false
              };

              return (
                <div
                  key={convo.id}
                  onClick={() => setSelectedConvo(convo.id)}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-[#1E2124] transition-colors border-b border-[#2A2D31]/30 ${selectedConvo === convo.id ? 'bg-[#1E2124]' : ''}`}
                >
                  <div className="relative shrink-0">
                    <SafeImage src={comp.imageUrl} alt={comp.name} className="w-11 h-11 rounded-full object-cover border border-white/5 shadow-inner" fallbackType="avatar" textForInitials={comp.name} />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#17191C] bg-green-500"></span>
                    {(convo.unreadCount || 0) > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C8A25E] text-[#0F1113] text-[9px] font-black rounded-full flex items-center justify-center">
                        {convo.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-xs text-white truncate flex items-center gap-1">
                        {comp.name}
                        {comp.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#C8A25E]" />}
                      </h4>
                      <span className="text-[10px] text-[#8E9299]">
                        {convo.lastMessage?.timestamp ? new Date(convo.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${(convo.unreadCount || 0) > 0 ? 'text-white font-semibold' : 'text-[#8E9299]'}`}>
                      {convo.lastMessage?.text || 'Tap to chat'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConvo ? (
        <div className="flex-1 flex flex-col bg-[#0F1113]">
          {/* Header */}
          <div className="h-16 border-b border-[#2A2D31] flex items-center justify-between px-6 bg-[#17191C]">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedConvo(null)} className="md:hidden text-[#8E9299] hover:text-white mr-2 text-xl font-bold">
                ←
              </button>
              {companion ? (
                <>
                  <SafeImage src={companion.imageUrl} className="w-9 h-9 rounded-full object-cover border border-white/5" alt={companion.name} fallbackType="avatar" textForInitials={companion.name} />
                  <div className="text-left">
                    <h3 className="font-bold text-white text-xs flex items-center gap-1">
                      {companion.name}
                      {companion.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#C8A25E]" />}
                    </h3>
                    <span className="text-[10px] text-green-500 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                </>
              ) : (
                <h3 className="font-bold text-white text-xs">Conversation</h3>
              )}
            </div>
            <div className="flex items-center gap-4 text-[#8E9299]">
              <Phone onClick={() => showToast('Audio calls coming soon', 'info')} className="w-4 h-4 cursor-pointer hover:text-white transition" />
              <Video onClick={() => showToast('Video calls coming soon', 'info')} className="w-4 h-4 cursor-pointer hover:text-white transition" />
              <Info onClick={() => showToast(`SATHI companion verification status: Active`, 'info')} className="w-4 h-4 cursor-pointer hover:text-white transition" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-[#0F1113]">
            {messages.length === 0 ? (
              <div className="text-center text-[#8E9299] py-16 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#C8A25E]/5 flex items-center justify-center mx-auto text-[#C8A25E] opacity-40">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">No messages yet</p>
                  <p className="text-[11px] text-[#8E9299] mt-0.5">Send a message to start the conversation.</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex flex-col max-w-[75%]">
                      <div className={`rounded-2xl px-4 py-2.5 shadow-md ${isMe ? 'bg-[#C8A25E] text-[#0F1113] rounded-br-sm font-medium text-xs' : 'bg-[#1E2124] text-white rounded-bl-sm border border-[#2A2D31] text-xs'}`}>
                        <p className="leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span className={`text-[9px] mt-1 px-1 ${isMe ? 'text-right text-[#8E9299]' : 'text-left text-[#8E9299]'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && !msg.isRead && ' • Sent'}
                        {isMe && msg.isRead && ' • Read'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-[#17191C] border-t border-[#2A2D31]">
            <div className="flex items-center gap-2">
              <button onClick={() => showToast('Image attachments coming soon', 'info')} className="text-[#8E9299] hover:text-[#C8A25E] transition p-2.5 bg-[#1E2124] rounded-full shrink-0">
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-[#1E2124] text-white border border-[#2A2D31] rounded-full px-4 py-2.5 text-xs focus:outline-none focus:border-[#C8A25E]"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="w-10 h-10 bg-[#C8A25E] text-[#0F1113] rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#B69150] transition-colors shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#0F1113] text-[#8E9299] p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#17191C] border border-[#2A2D31] flex items-center justify-center text-[#C8A25E] shadow-xl">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Select a conversation</h3>
            <p className="text-xs text-[#8E9299] mt-1 max-w-[240px]">Choose a chat from the sidebar or visit any companion profile to message them instantly.</p>
          </div>
        </div>
      )}
    </div>
  );
};
