import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { DOCS_CONFIG } from '../../config';

interface DocumentModalProps {
  documentType: 'terms' | 'privacy' | 'help';
  onClose: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ documentType, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const title = documentType === 'terms' ? 'Terms of Service' : documentType === 'privacy' ? 'Privacy Policy' : 'SATHI Help & Support';

  useEffect(() => {
    let active = true;
    const fetchDoc = async () => {
      setLoading(true);
      setError('');

      const cacheKey = `sathi_doc_${documentType}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        if (active) {
          setContent(cached);
          setLoading(false);
        }
        return;
      }

      const primaryUrl = documentType === 'terms' 
        ? DOCS_CONFIG.termsOfServiceUrl 
        : documentType === 'privacy' 
          ? DOCS_CONFIG.privacyPolicyUrl 
          : (DOCS_CONFIG as any).helpUrl;
      const fallbackUrl = documentType === 'terms' 
        ? DOCS_CONFIG.localTermsOfServiceUrl 
        : documentType === 'privacy' 
          ? DOCS_CONFIG.localPrivacyPolicyUrl 
          : (DOCS_CONFIG as any).localHelpUrl;

      try {
        console.log(`[SATHI Docs] Fetching ${documentType} from primary URL: ${primaryUrl}`);
        const response = await fetch(primaryUrl);
        if (!response.ok) {
          throw new Error(`Primary fetch failed with status ${response.status}`);
        }
        const text = await response.text();
        sessionStorage.setItem(cacheKey, text);
        if (active) {
          setContent(text);
        }
      } catch (err) {
        console.warn(`[SATHI Docs] Failed to load from GitHub URL, falling back to local file. Error:`, err);
        try {
          console.log(`[SATHI Docs] Fetching from fallback URL: ${fallbackUrl}`);
          const fallbackRes = await fetch(fallbackUrl);
          if (!fallbackRes.ok) {
            throw new Error(`Fallback fetch failed with status ${fallbackRes.status}`);
          }
          const text = await fallbackRes.text();
          sessionStorage.setItem(cacheKey, text);
          if (active) {
            setContent(text);
          }
        } catch (fallbackErr) {
          console.error(`[SATHI Docs] Fallback document load failed:`, fallbackErr);
          if (active) {
            setError('We are unable to load this document at the moment. Please try again later or contact our support team.');
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDoc();

    return () => {
      active = false;
    };
  }, [documentType]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="doc-modal-title">
      <div className="bg-[#17191C] border border-[#2A2D31] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-[#2A2D31] flex justify-between items-center bg-[#0F1113]">
          <h2 id="doc-modal-title" className="text-xl font-bold text-white">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="text-[#8E9299] hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 text-[#8E9299]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-t-[#C8A25E] border-white/10 rounded-full animate-spin" />
              <p className="text-sm font-medium">Fetching document...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="text-red-400 text-3xl font-bold">⚠️</div>
              <p className="text-sm text-red-300 max-w-md mx-auto">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-[#C8A25E]/20 hover:bg-[#C8A25E]/30 text-[#C8A25E] border border-[#C8A25E]/30 rounded-xl font-medium transition-colors text-sm"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="markdown-body prose prose-invert max-w-none text-left space-y-4 text-sm leading-relaxed text-white/90">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#2A2D31] flex justify-end bg-[#0F1113]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#C8A25E] hover:bg-[#B69150] text-[#0F1113] rounded-xl font-bold transition-colors text-sm uppercase tracking-wider"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
};
