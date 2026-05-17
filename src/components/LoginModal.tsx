'use client';
import { useState } from 'react';
import { useLocalPlayer } from './PlayerProvider';

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const { setPlayer } = useLocalPlayer();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notifyNewCW, setNotifyNewCW] = useState(true);
  const [notifyAlmostFull, setNotifyAlmostFull] = useState(true);
  const [notifyClosed, setNotifyClosed] = useState(true);
  const [error, setError] = useState('');

  const valid = name.trim().length >= 2 && email.includes('@');

  const handle = () => {
    if (!valid) { setError('Preencha nome e email válido.'); return; }
    setPlayer({ name: name.trim(), email: email.trim(), notifyNewCW, notifyAlmostFull, notifyClosed });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-black mb-1">Entrar no CW</h2>
        <p className="text-[#444] text-sm mb-6">Sem senha. Sem cadastro complicado.</p>

        <label className="block text-[#555] text-xs tracking-widest mb-2">NOME NO JOGO</label>
        <input className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-white text-sm mb-4 focus:border-brand/50 transition"
          placeholder="Ex: Rodrigo, Vinicius..." maxLength={20}
          value={name} onChange={e => setName(e.target.value)} autoFocus />

        <label className="block text-[#555] text-xs tracking-widest mb-2">SEU EMAIL</label>
        <input className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-white text-sm mb-6 focus:border-brand/50 transition"
          placeholder="seuemail@gmail.com" type="email"
          value={email} onChange={e => setEmail(e.target.value)} />

        <p className="text-[#555] text-xs tracking-widest mb-3">NOTIFICAÇÕES POR EMAIL</p>
        <div className="space-y-2 mb-6">
          {[
            { label: 'Nova CW aberta', value: notifyNewCW, set: setNotifyNewCW },
            { label: 'Falta 1 vaga', value: notifyAlmostFull, set: setNotifyAlmostFull },
            { label: 'CW fechada (resultado)', value: notifyClosed, set: setNotifyClosed },
          ].map(({ label, value, set }) => (
            <button key={label} onClick={() => set(!value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${value ? 'border-brand/40 bg-brand/5' : 'border-border bg-bg'}`}>
              <span className="text-sm text-white">{label}</span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${value ? 'border-brand bg-brand' : 'border-[#333]'}`}>
                {value && <span className="text-bg text-xs font-black">✓</span>}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button onClick={handle} disabled={!valid}
          className="w-full bg-brand text-bg font-black text-sm tracking-widest py-4 rounded-xl disabled:opacity-20 hover:brightness-110 transition">
          ENTRAR
        </button>
        <button onClick={onClose} className="w-full text-[#333] text-sm mt-3 hover:text-[#555] transition">Cancelar</button>
      </div>
    </div>
  );
}
