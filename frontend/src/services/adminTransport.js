// Un único panel por pestaña. Credenciales exclusivamente en memoria.
let transport = null;
export function installAdminTransport(next) {
  transport = next;
  return () => { if (transport === next) transport = null; };
}
export const resolveAdminToken = (token) => token ? transport?.resolveToken(token) ?? token : token;
export const reportUnauthorized = (token) => { if (token) transport?.unauthorized(token); };
