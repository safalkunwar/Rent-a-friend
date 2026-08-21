import React, { useState, useEffect, useMemo } from 'react';
import { Search, MessageSquare, AlertTriangle } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

export function AdminMessages() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [convos, msgs] = await Promise.all([
        adminRepository.listConversations(100),
        adminRepository.listMessages(200),
      ]);
      setConversations(convos);
      setMessages(msgs);
      setLoading(false);
    };
    load();
  }, []);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => 
      (c.id || '').toLowerCase().includes(q) || 
      (c.participantIds || []).some((p: string) => p.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const conversationMessages = useMemo(() => {
    if (!selectedConversation) return [];
    return messages
      .filter((m: any) => m.conversationId === selectedConversation.id)
      .sort((a: any, b: any) => new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime());
  }, [messages, selectedConversation]);

  const getParticipantName = (participantId: string) => {
    return participantId.replace('u-', '').replace('c', 'companion.');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[70vh]">
          <div className="px-5 py-4 border-b border-border-token bg-surface">
            <h3 className="font-semibold text-sm mb-3">Conversations</h3>
            <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-text-primary outline-none w-full"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
            {!loading && filteredConversations.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No conversations found.</p>}
            {filteredConversations.map((conv, idx) => (
              <div
                key={conv.id || `conv-${idx}`}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b border-border-token cursor-pointer transition-colors hover:bg-surface-elevated/50 ${selectedConversation?.id === conv.id ? 'bg-primary-action/10 border-l-2 border-l-primary-action' : ''}`}
              >
                <p className="text-sm font-medium text-text-primary truncate">
                  {conv.participantIds?.map((p: string) => getParticipantName(p)).join(' & ')}
                </p>
                <p className="text-xs text-gray-400 truncate mt-1">{conv.lastMessage?.text || 'No messages'}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-500">{conv.unreadCount > 0 ? `${conv.unreadCount} unread` : ''}</span>
                  <span className="text-[10px] text-gray-500">{conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages View */}
        <div className="lg:col-span-2 bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[70vh]">
          {selectedConversation ? (
            <>
              <div className="px-5 py-4 border-b border-border-token bg-surface">
                <h3 className="font-semibold text-sm">
                  Conversation: {selectedConversation.participantIds?.map((p: string) => getParticipantName(p)).join(' & ')}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {conversationMessages.length} messages • Last updated {selectedConversation.updatedAt ? new Date(selectedConversation.updatedAt).toLocaleString() : ''}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversationMessages.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-8">No messages in this conversation.</p>
                )}
                {conversationMessages.map((msg: any, idx) => (
                  <div key={msg.id || `msg-${idx}`} className={`p-3 rounded-xl max-w-[80%] ${msg.senderId === selectedConversation.participantIds?.[0] ? 'bg-surface-elevated ml-auto' : 'bg-surface border border-border-token'}`}>
                    <p className="text-xs text-gray-400 mb-1">{msg.senderId} • {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</p>
                    <p className="text-sm text-text-primary">{msg.text}</p>
                    {msg.imageUrl && <img src={msg.imageUrl} alt="Message image" className="mt-2 rounded-lg max-w-full h-auto" />}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500 text-sm">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
