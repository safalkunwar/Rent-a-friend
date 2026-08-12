import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, PhoneCall, ShieldAlert, Navigation, UserPlus, Users } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

interface SOSAlert {
  id: string;
  user: string;
  guide: string;
  location: string;
  status: 'active' | 'acknowledged' | 'in_progress' | 'escalated' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  assigneeId?: string;
}

interface SuspiciousActivity {
  id: string;
  flag: string;
  target: string;
  date: string;
  status: 'new' | 'investigating' | 'resolved';
}

export function AdminSecurity() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [assigneeInput, setAssigneeInput] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [sos, suspicious] = await Promise.all([
        adminRepository.listSOSAlerts(100),
        adminRepository.listSuspiciousActivity(100),
      ]);
      setSosAlerts(sos as SOSAlert[]);
      setSuspiciousActivities(suspicious as SuspiciousActivity[]);
      setLoading(false);
    };
    load();
  }, []);

  const executeSOSAction = async (alertId: string, action: string, data?: Record<string, unknown>) => {
    if (!adminUser || !hasPerm('sos.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction(action, adminUser.uid, 5)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(action, alertId, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      if (action === 'dispatch') {
        await adminRepository.updateSOSStatus(alertId, 'resolved');
      } else if (action === 'assign') {
        await adminRepository.assignSOSAlert(alertId, data?.assigneeId as string || '');
      } else if (action === 'priority') {
        await adminRepository.updateSOSPriority(alertId, data?.priority as string || 'medium');
      }

      await idempotencyService.set(idempotencyKey, action, alertId, { success: true, ...data });

      await auditService.log({
        action: `sos_${action}`,
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'sos',
        targetId: alertId,
        details: data,
      });

      if (action === 'dispatch') {
        setSosAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a));
      } else if (action === 'assign') {
        setSosAlerts(prev => prev.map(a => a.id === alertId ? { ...a, assigneeId: data?.assigneeId as string } : a));
      } else if (action === 'priority') {
        setSosAlerts(prev => prev.map(a => a.id === alertId ? { ...a, priority: data?.priority as SOSAlert['severity'] } : a));
      }
      setSelectedAlert(null);
    } catch (err: any) {
      console.error(`Failed to ${action} SOS alert:`, err);
      alert(`Failed to ${action} SOS alert: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleInvestigate = async (id: string) => {
    if (!adminUser || !hasPerm('safety.read')) return;
    await adminRepository.updateSuspiciousActivityStatus(id, 'investigating');
    setSuspiciousActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'investigating' } : a));
    await auditService.log({
      action: 'suspicious_activity_investigate',
      actorId: adminUser.uid,
      actorName: adminUser.displayName || 'Admin',
      targetType: 'security',
      targetId: id,
      details: {},
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'acknowledged': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'escalated': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-500 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* SOS Alerts */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-red-500/20 flex justify-between items-center bg-red-500/5">
          <h3 className="font-semibold text-sm text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Active SOS Alerts
          </h3>
          <span className="text-xs text-red-400">{sosAlerts.filter(a => a.status !== 'resolved').length} active</span>
        </div>
        <div className="p-4 space-y-4">
          {loading && <p className="text-gray-500 text-sm text-center py-4">Loading...</p>}
          {!loading && sosAlerts.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No SOS alerts.</p>}
          {sosAlerts.map((alert, idx) => (
            <div key={`${alert.id || 'sos'}-${idx}`} className={`p-4 rounded-xl border ${alert.status !== 'resolved' ? 'bg-red-500/10 border-red-500/30' : 'bg-surface border-border-token'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500">{alert.id}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(alert.status)}`}>
                    {alert.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{new Date(alert.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-text-primary mb-1">User: {alert.user}</p>
                  <p className="text-xs text-gray-400">Accompanying: {alert.guide}</p>
                  {alert.assigneeId && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-primary-action">
                      <Users className="w-3 h-3" /> Assigned to: {alert.assigneeId}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> {alert.location}</p>
                  <p className="text-xs text-primary-action flex items-center gap-1 cursor-pointer hover:underline"><Navigation className="w-3 h-3" /> View Live Location</p>
                </div>
              </div>

              {alert.status !== 'resolved' && hasPerm('sos.write') && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={() => setSelectedAlert(alert)} className="flex items-center gap-2 px-4 py-2 bg-surface-elevated text-text-secondary border border-border-token text-xs font-bold rounded-lg hover:bg-border-token transition-colors">
                    <UserPlus className="w-4 h-4" /> Assign
                  </button>
                  <select
                    value={alert.severity}
                    onChange={(e) => handlePriorityChange(alert.id, e.target.value)}
                    className="px-3 py-2 bg-surface-elevated text-text-secondary border border-border-token text-xs rounded-lg outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button onClick={() => executeSOSAction(alert.id, 'dispatch')} disabled={processing} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-text-primary text-xs font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                    <PhoneCall className="w-4 h-4" /> Dispatch
                  </button>
                  <button onClick={() => executeSOSAction(alert.id, 'false_alarm')} disabled={processing} className="px-4 py-2 bg-surface-elevated text-text-secondary border border-border-token text-xs font-bold rounded-lg hover:bg-border-token transition-colors disabled:opacity-50">
                    False Alarm
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Suspicious Activity */}
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
          <h3 className="font-semibold text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-yellow-500" /> Suspicious Activity</h3>
        </div>
        <div className="divide-y divide-border-token">
          {loading && <p className="text-gray-500 text-sm text-center py-4">Loading...</p>}
          {!loading && suspiciousActivities.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No suspicious activity.</p>}
          {suspiciousActivities.map((item, idx) => (
            <div key={`${item.id || 'sec'}-${idx}`} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-surface transition-colors">
              <div>
                <p className="text-sm font-medium text-text-primary mb-1">{item.flag}</p>
                <p className="text-xs text-gray-400">{item.target} • {item.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  item.status === 'new' ? 'bg-red-500/10 text-red-500' :
                  item.status === 'investigating' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {item.status}
                </span>
                {item.status !== 'resolved' && hasPerm('safety.read') && (
                  <button onClick={() => handleInvestigate(item.id)} className="px-3 py-1.5 bg-surface-elevated text-text-secondary border border-border-token rounded-lg text-xs font-medium hover:text-text-primary transition-colors">
                    Investigate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assign Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => { setSelectedAlert(null); setAssigneeInput(''); }}>
          <div className="bg-background border border-border-token rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-token flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary">Assign SOS Alert</h2>
              <button onClick={() => { setSelectedAlert(null); setAssigneeInput(''); }} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Alert ID</p>
                <p className="text-sm font-mono">{selectedAlert.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">User</p>
                <p className="text-sm">{selectedAlert.user}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Assignee ID</p>
                <input
                  type="text"
                  value={assigneeInput}
                  onChange={(e) => setAssigneeInput(e.target.value)}
                  placeholder="Enter admin/agent ID..."
                  className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => { setSelectedAlert(null); setAssigneeInput(''); }} className="flex-1 py-3 bg-surface-elevated text-text-secondary rounded-xl font-bold hover:bg-border-token transition-colors uppercase tracking-wider text-sm border border-border-token">
                  Cancel
                </button>
                <button
                  onClick={() => executeSOSAction(selectedAlert.id, 'assign', { assigneeId: assigneeInput })}
                  disabled={!assigneeInput.trim() || processing}
                  className="flex-1 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors uppercase tracking-wider text-sm disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
