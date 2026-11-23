import React, { useEffect, useState } from 'react';
import { MessageCircle, LoaderCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normaliseMalawiPhone } from '../lib/phone';
import './whatsapp-prompt.css';

// Shown only to signed-in sellers who have no WhatsApp number saved,
// because buyers contact sellers through that number.
export default function WhatsAppPrompt({ session, onSaved }) {
  const userId = session?.user?.id;
  const [missing, setMissing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!userId) return undefined;
    supabase
      .from('seller_contacts')
      .select('whatsapp_number')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (alive && !err) setMissing(!data?.whatsapp_number);
      });
    return () => { alive = false; };
  }, [userId]);

  if (!userId || !missing) return null;

  async function save(event) {
    event.preventDefault();
    const number = normaliseMalawiPhone(value);
    if (!number) {
      setError('Enter a valid Malawi mobile number, for example 0991234567.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: saveError } = await supabase
      .from('seller_contacts')
      .upsert({ user_id: userId, whatsapp_number: number }, { onConflict: 'user_id' });
    setBusy(false);
    if (saveError) {
      setError('Could not save your number. Please try again.');
      return;
    }
    setMissing(false);
    onSaved?.();
  }

  return (
    <form className="cf-wa-prompt" onSubmit={save}>
      <div className="cf-wa-prompt-head">
        <MessageCircle size={18} />
        <div>
          <strong>Add your WhatsApp number</strong>
          <small>Buyers contact you on WhatsApp. Without a number they can&apos;t reach you.</small>
        </div>
      </div>
      <div className="cf-wa-prompt-row">
        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="e.g. 0991234567"
          aria-label="WhatsApp number"
        />
        <button type="submit" disabled={busy || !value.trim()}>
          {busy ? <LoaderCircle size={15} className="cf-spin" /> : 'Save'}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
