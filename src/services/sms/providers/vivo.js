export async function send({ to, message, from }) {
  return { ok: true, provider: 'vivo', to, message, from };
}
