// PAALHU — booking chat. Adds a floating button that opens the chat (needs server.js).
// Usage: <link rel="stylesheet" href="css/chat.css"> and <script src="js/chat.js" defer></script>
(() => {
  const EMAIL = 'owners@paalhu.es';
  const SALUDO = "Hi! I'm the PAALHU booking assistant. I can check availability, book, change or cancel a table, or answer questions about the menu and opening hours.\n¡Hola! También puedes escribirme en español.";
  let sesion = null;
  try { sesion = sessionStorage.getItem('paalhu-chat'); } catch {}

  // Creates an element: "aria-*" and "role" keys are set as attributes, the rest as properties.
  const el = (tag, props = {}, ...hijos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) k.startsWith('aria-') || k === 'role' ? n.setAttribute(k, v) : (n[k] = v);
    n.append(...hijos);
    return n;
  };

  const abrir = el('button', { className: 'chat-abrir', type: 'button', textContent: '💬 Book by chat' });
  const lista = el('div', { className: 'chat-mensajes', role: 'log', 'aria-live': 'polite' });
  const entrada = el('input', { type: 'text', maxLength: 1000, placeholder: 'Type your message…', autocomplete: 'off', 'aria-label': 'Message' });
  const enviar = el('button', { type: 'submit', textContent: 'Send' });
  const form = el('form', { className: 'chat-formulario' }, entrada, enviar);
  const cerrar = el('button', { className: 'chat-cerrar', type: 'button', textContent: '×', 'aria-label': 'Close chat' });
  const panel = el('section', { className: 'chat-panel', hidden: true, 'aria-label': 'PAALHU booking chat' },
    el('div', { className: 'chat-cabecera' }, el('strong', { textContent: 'PAALHU · Bookings' }), cerrar), lista, form);

  // textContent (not innerHTML): what comes from the server is never interpreted as HTML.
  const mensaje = (texto, tipo) => {
    const n = el('div', { className: `chat-msg ${tipo}`, textContent: texto });
    lista.append(n);
    lista.scrollTop = lista.scrollHeight;
    return n;
  };

  let iniciado = false;
  async function iniciar() {
    if (iniciado) return;
    iniciado = true;
    try {
      const r = await fetch('/api/chat/status');
      const { enabled } = await r.json();
      if (!enabled) throw new Error();
      mensaje(SALUDO, 'casa');
    } catch {
      mensaje(`The chat isn't available right now, so we can't take bookings at the moment. Please try again a little later, or email us at ${EMAIL}.`, 'aviso');
      entrada.disabled = enviar.disabled = true;
    }
  }

  const mostrar = () => { panel.hidden = false; abrir.hidden = true; iniciar(); entrada.focus(); };
  abrir.addEventListener('click', mostrar);
  cerrar.addEventListener('click', () => { panel.hidden = true; abrir.hidden = false; abrir.focus(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = entrada.value.trim();
    if (!texto || enviar.disabled) return;
    mensaje(texto, 'cliente');
    entrada.value = '';
    enviar.disabled = true;
    const escribiendo = mensaje('…', 'casa');
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: sesion, message: texto }) });
      const datos = await r.json();
      if (datos.session) { sesion = datos.session; try { sessionStorage.setItem('paalhu-chat', sesion); } catch {} }
      escribiendo.remove();
      if (datos.reply) mensaje(datos.reply, 'casa');
      else mensaje(datos.error ?? 'Something went wrong. Please try again in a moment.', 'aviso');
    } catch {
      escribiendo.remove();
      mensaje("We couldn't reach the restaurant. Please try again in a moment.", 'aviso');
    } finally {
      enviar.disabled = false;
      entrada.focus();
    }
  });

  document.body.append(abrir, panel);
  // A link to "#chat" opens the chat directly.
  if (location.hash === '#chat') mostrar();
  addEventListener('hashchange', () => { if (location.hash === '#chat') mostrar(); });
})();
