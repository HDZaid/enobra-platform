export const IDLE_LIMIT_MS = 15 * 60 * 1000;
export const SESSION_WARNING_MS = 60 * 1000;

function lifetime(payload) {
  const seconds = payload?.expires_in ?? 900; // Compatibilidad con la respuesta anterior.
  if (!Number.isFinite(seconds) || seconds <= 0 || typeof payload?.access !== 'string' || !payload.access) {
    throw Object.assign(new TypeError('El servidor no devolvió una renovación válida.'), { code: 'invalid_refresh' });
  }
  return seconds * 1000;
}

// Lógica independiente de React para comprobar reloj, concurrencia y respuestas tardías.
export function createSessionLifecycle({ refresh, revoke, onChange, now = Date.now, visible = () => true }) {
  let state = null;
  let generation = 0;
  let refreshing = null;
  let retryAfter = 0;
  let previousView = '';
  function emit(view) {
    const serialized = JSON.stringify(view);
    if (serialized !== previousView) { previousView = serialized; onChange(view); }
  }
  const publish = () => {
    if (!state) return emit({ status: 'off', seconds: 0 });
    const seconds = Math.max(0, Math.ceil((Math.min(state.expiresAt, state.lastActivity + IDLE_LIMIT_MS) - now()) / 1000));
    emit({ status: state.expired ? 'expired' : seconds <= 60 ? 'warning' : 'active', seconds: seconds <= 60 ? seconds : 0,
      renewing: Boolean(refreshing), error: state.error || '', reason: state.reason });
  };
  function expire(reason = 'idle') {
    if (!state || state.expired) return;
    generation++;
    state.expired = true;
    state.reason = reason;
    const token = state.refresh;
    state.refresh = null;
    refreshing = null;
    publish();
    // Solicitar también revocación al servidor; sin red el bloqueo local sigue vigente.
    Promise.resolve().then(() => revoke(token)).catch(() => {});
  }
  async function renew() {
    if (!state || state.expired || refreshing) return refreshing;
    const current = state;
    const version = generation;
    const requestedAt = now();
    refreshing = Promise.resolve().then(() => refresh(current.refresh)).then((payload) => {
      if (version !== generation || state !== current || current.expired) return;
      if (now() >= Math.min(current.expiresAt, current.lastActivity + IDLE_LIMIT_MS)) { expire(); return; }
      const duration = lifetime(payload);
      current.tokens.add(payload.access);
      current.access = payload.access;
      current.expiresAt = requestedAt + duration;
      current.issuedAt = requestedAt;
      current.error = '';
    }).catch((error) => {
      if (version !== generation || state !== current) return;
      if (error?.status === 401 || error?.status === 403 || error?.code === 'invalid_refresh') expire('revoked');
      else { current.error = 'No pudimos renovar la sesión. Comprueba tu conexión.'; retryAfter = now() + 10000; }
    }).finally(() => {
      if (version === generation) { refreshing = null; publish(); }
    });
    publish();
    return refreshing;
  }
  function tick() {
    if (!state || state.expired) return publish();
    const deadline = Math.min(state.expiresAt, state.lastActivity + IDLE_LIMIT_MS);
    if (now() >= deadline) return expire();
    // Solo renovar si hubo interacción desde la última emisión, con pestaña visible.
    if (visible() && state.lastActivity > state.issuedAt && now() >= retryAfter
        && state.expiresAt - now() <= SESSION_WARNING_MS) void renew();
    publish();
  }
  return {
    start(payload, accessKey = payload.access) {
      const duration = lifetime(payload);
      generation++;
      refreshing = null;
      retryAfter = 0;
      state = { access: payload.access, refresh: payload.refresh, tokens: new Set([accessKey, payload.access]),
        issuedAt: now(), lastActivity: now(), expiresAt: now() + duration, expired: false };
      publish();
    },
    stop() { generation++; state = null; refreshing = null; publish(); },
    activity() {
      if (!state || state.expired || !visible()) return;
      // Primero comprobar vencimiento: una pestaña suspendida no puede revivir la sesión.
      if (now() >= Math.min(state.expiresAt, state.lastActivity + IDLE_LIMIT_MS)) return expire();
      state.lastActivity = now();
      tick();
    },
    tick, expire,
    resolveToken(token) {
      if (!state?.tokens.has(token)) return token;
      tick();
      if (state.expired) throw Object.assign(new Error('La sesión venció. Vuelve a iniciar sesión.'), { status: 401, code: 'session_expired' });
      return state.access;
    },
    unauthorized(token) { if (state?.tokens.has(token) && token === state.access) expire('revoked'); },
  };
}
