import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, PhoneCall, ShieldAlert, Navigation } from 'lucide-react';
import { adminRepository } from './AdminRepository';

interface SOSAlert {
  id: string;
  user: string;
  guide: string;
  location: string;
  status: 'active' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface SuspiciousActivity {
  id: string;
  flag: string;
  target: string;
  date: string;
  status: 'new' | 'investigating' | 'resolved';
}

export function AdminSecurity() {
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDispatch = async (id: string) => {
    await adminRepository.updateSOSStatus(id, 'resolved');
    setSosAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
  };

  const handleFalseAlarm = async (id: string) => {
    await adminRepository.updateSOSStatus(id, 'resolved');
    setSosAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved', priority: 'low' } : a));
  };

  const handleInvestigate = async (id: string) => {
    await adminRepository.updateSuspiciousActivityStatus(id, 'investigating');
    setSuspiciousActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'investigating' } : a));
  };

  return (
    <div className="space-y-6">
      
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-red-500/20 flex justify-between items-center bg-red-500/5">
          <h3 className="font-semibold text-sm text-red-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Active SOS Alerts</h3>
        </div>
        <div className="p-4 space-y-4">
          {loading && <p className="text-gray-500 text-sm text-center py-4">Loading...</p>}
          {!loading && sosAlerts.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No SOS alerts.</p>}
          {sosAlerts.map((alert, idx) => (
            <div key={`${alert.id || 'sos'}-${idx}`} className={`p-4 rounded-xl border ${alert.status === 'active' ? 'bg-red-500/10 border-red-500/30' : 'bg-surface border-border-token'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500">{alert.id}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${alert.status === 'active' ? 'bg-red-500 text-text-primary' : 'bg-gray-800 text-gray-400'}`}>
                    {alert.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{new Date(alert.timestamp).toLocaleString()}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <p className="text-sm font-medium text-text-primary mb-1">{alert.user}</p>
                    <p className="text-xs text-gray-400">Accompanying: {alert.guide}</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> {alert.location}</p>
                    <p className="text-xs text-primary-action flex items-center gap-1 cursor-pointer hover:underline"><Navigation className="w-3 h-3" /> View Live Location</p>
                 </div>
              </div>

              {alert.status === 'active' && (
                <div className="mt-4 flex gap-3">
                  <button onClick={() => handleDispatch(alert.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-text-primary text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
                    <PhoneCall className="w-4 h-4" /> Dispatch Authorities
                  </button>
                  <button onClick={() => handleFalseAlarm(alert.id)} className="px-4 py-2 bg-surface-elevated text-text-secondary border border-border-token text-xs font-bold rounded-lg hover:bg-border-token transition-colors">
                    Mark as False Alarm
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-background border border-border-token rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
          <h3 className="font-semibold text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-yellow-500" /> Suspicious Activity Logs</h3>
        </div>
        <div className="divide-y divide-border-token">
          {loading && <p className="text-gray-500 text-sm text-center py-4">Loading...</p>}
          {!loading && suspiciousActivities.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No suspicious activity logs.</p>}
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
                  {item.status !== 'resolved' && (
                    <button onClick={() => handleInvestigate(item.id)} className="px-3 py-1.5 bg-surface-elevated text-text-secondary border border-border-token rounded-lg text-xs font-medium hover:text-text-primary transition-colors">
                      Investigate
                    </button>
                  )}
               </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
