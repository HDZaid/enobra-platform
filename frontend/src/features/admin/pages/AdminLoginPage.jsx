import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import '../styles/admin-fonts.css';

export function AdminLoginPage() {
  const { login, openPreview } = useOutletContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setMessage('');
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
    } catch (error) {
      setMessage(error?.status === 501
        ? 'El backend aún no tiene habilitada la autenticación real.'
        : error?.status === 401
          ? 'Correo o contraseña incorrectos.'
          : error?.status === 429
            ? 'Demasiados intentos de inicio de sesión. Espera un minuto e inténtalo de nuevo.'
            : error?.message || 'No se pudo iniciar sesión. Comprueba la conexión con Django.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#304e7d] to-[#12233f] px-5 py-10 font-['Inter',Arial,sans-serif]">
      <div className="w-full max-w-[440px] rounded-2xl bg-white px-6 py-9 text-[#12233f] shadow-[0_30px_80px_#0005] sm:px-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-[#626b79] hover:text-[#b94308]"><ArrowLeft size={15}/> Volver al sitio</Link>
        <div className="mt-6 text-center">
          <p className="font-['Montserrat',Arial,sans-serif] text-[38px] font-bold">En<span className="text-[#ff6a1f]">Obra</span></p>
          <p className="mt-3 text-[11px] font-bold tracking-[.16em] text-[#b94308] uppercase">Administración</p>
          <h1 className="mt-3 font-['Montserrat',Arial,sans-serif] text-[28px] font-semibold">Acceso al panel</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#626b79]">Ingresa con las credenciales que te proporcione la empresa.</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div><label htmlFor="admin-email" className="mb-2 block text-xs font-semibold tracking-wider text-[#626b79] uppercase">Correo electrónico</label><input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className="w-full rounded-lg border border-[#dfe5ec] bg-[#f3f6fa] px-4 py-3 outline-none focus:border-[#ff6a1f] focus:bg-white" placeholder="correo@empresa.com" /></div>
          <div><label htmlFor="admin-password" className="mb-2 block text-xs font-semibold tracking-wider text-[#626b79] uppercase">Contraseña</label><div className="relative"><input id="admin-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-[#dfe5ec] bg-[#f3f6fa] px-4 py-3 pr-12 outline-none focus:border-[#ff6a1f] focus:bg-white"/><button type="button" className="absolute inset-y-0 right-3 flex items-center text-[#626b79]" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></div>
          {message && <p role="alert" className="rounded-lg bg-[#fdeaea] p-3 text-sm text-[#9c2929]">{message}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff6a1f] py-3.5 font-semibold text-white hover:bg-[#b94308] disabled:opacity-60"><LockKeyhole size={17}/>{busy ? 'Verificando…' : 'Ingresar al panel'}</button>
        </form>
        {import.meta.env.DEV && <div className="mt-6 border-t border-[#dfe5ec] pt-5 text-center"><p className="mb-3 text-xs leading-relaxed text-[#626b79]">Mientras se conecta la autenticación de Django, puedes revisar la interfaz sin guardar datos.</p><button type="button" onClick={openPreview} className="w-full rounded-lg border border-[#dfe5ec] px-4 py-3 text-sm font-semibold hover:border-[#ff6a1f]">Ver diseño de demostración</button></div>}
      </div>
    </main>
  );
}
