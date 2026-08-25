import React, { useRef, useState } from 'react';
import { Send } from 'lucide-react';

interface CommentComposerProps {
  placeholder?: string;
  maxLength?: number;
  autoFocusKey?: string;
  onSubmit: (text: string) => Promise<void>;
}

const MAX_LENGTH = 500;

export const CommentComposer: React.FC<CommentComposerProps> = ({
  placeholder = 'Write a comment...',
  maxLength = MAX_LENGTH,
  onSubmit,
}) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  };

  const handleSubmit = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setText('');
      requestAnimationFrame(() => {
        autoGrow();
        textareaRef.current?.focus();
      });
    } catch {
      // parent reports the error; text is preserved for retry
      textareaRef.current?.focus();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        rows={1}
        aria-label="Write a comment"
        placeholder={placeholder}
        value={text}
        maxLength={maxLength}
        onChange={(e) => {
          setText(e.target.value);
          autoGrow();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        className="flex-1 resize-none bg-surface-elevated text-text-primary border border-border-token/40 rounded-xl px-3 py-2 text-xs leading-relaxed focus:outline-none focus:border-primary-action focus:ring-1 focus:ring-primary-action/40 min-h-[38px] max-h-24 placeholder:text-text-muted"
      />
      <button
        type="button"
        aria-label="Send comment"
        disabled={!canSubmit}
        onClick={() => void handleSubmit()}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
          canSubmit
            ? 'bg-primary-action text-background hover:brightness-110 active:scale-95'
            : 'bg-surface-elevated text-text-muted cursor-not-allowed'
        }`}
      >
        {submitting ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
