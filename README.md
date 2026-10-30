# JARVIS — M-Sharbis

Asistente web móvil, pensado para Android y uso compartido mediante un código de acceso.

## Versión 1.0 — arquitectura multimodelo

- Interfaz web estática en GitHub Pages.
- Worker privado que mantiene las claves de proveedores fuera del navegador.
- Adaptadores de conversación para Gemini, OpenAI y Anthropic.
- Selección automática con fallback entre proveedores configurados.
- Búsqueda web real opcional mediante Tavily.
- Voz cinematográfica opcional mediante OpenAI text-to-speech (voz Onyx).
- Alternativa de voz local del navegador si el servicio de audio no está configurado.
- Código de acceso compartido, CORS por origen y límites básicos de solicitudes.
- Historial de conversación mantenido en memoria del navegador, no almacenado en el servidor.

## Importante: todavía hay que desplegar el servidor

Los archivos del Worker están en `worker/`. GitHub Pages no ejecuta ese servidor. El frontend no tendrá IA remota hasta desplegarlo y configurar sus secretos.

### 1. Crear el Worker en Cloudflare

1. Crear una cuenta gratuita en Cloudflare.
2. Entrar en Workers & Pages y crear un Worker.
3. Publicar el contenido de `worker/index.js` como código del Worker.
4. En Settings → Variables and Secrets, agregar los secretos:
   - `JARVIS_ACCESS_CODE`: código largo aleatorio de al menos 12 caracteres. Compartilo solo con las personas autorizadas.
   - `GEMINI_API_KEY`: opcional.
   - `OPENAI_API_KEY`: opcional; también habilita la voz cinematográfica si la cuenta tiene acceso y saldo/cuota.
   - `ANTHROPIC_API_KEY`: opcional.
   - `TAVILY_API_KEY`: opcional; habilita búsqueda web.
5. Guardar y volver a desplegar.

Variables no secretas opcionales: `GEMINI_MODEL`, `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `ALLOWED_ORIGIN`.
Los valores iniciales están documentados en `worker/wrangler.toml`.

### 2. Conectar la web

1. Copiar la URL pública del Worker, por ejemplo `https://nombre-del-worker.tu-subdominio.workers.dev`.
2. Abrir JARVIS desde GitHub Pages.
3. En «Conexión con el cerebro», pegar la URL del Worker y el mismo código de acceso.
4. Elegir Automático o un proveedor y tocar Conectar sistema.

La URL de Pages autorizada por defecto es `https://eliasmartinezcultural-glitch.github.io`. Si cambia, actualizar `ALLOWED_ORIGIN`.

### 3. Configuración multimodelo

Se puede configurar una o varias claves. Automático prueba Gemini, luego OpenAI y finalmente Anthropic, usando el primero disponible. Si se elige un proveedor concreto, solo se usa ese proveedor.

Modelos configurables en el entorno del Worker:
- `GEMINI_MODEL` (valor inicial: `gemini-2.5-flash`)
- `OPENAI_MODEL` (valor inicial: `gpt-4o-mini`)
- `ANTHROPIC_MODEL` (valor inicial: `claude-3-5-haiku-latest`)

Los nombres y disponibilidad de modelos cambian; actualizalos desde Cloudflare sin tocar el frontend.

### 4. Voz cinematográfica

Si se configura `OPENAI_API_KEY`, el Worker puede solicitar audio con `gpt-4o-mini-tts` y voz `onyx`. La disponibilidad, calidad y costo dependen de la cuenta y del proveedor. Sin TTS remoto, se utiliza la voz instalada en Android/Chrome; el selector y el tono son una alternativa, no una réplica de una voz de película.

### 5. Búsqueda web

Configurar `TAVILY_API_KEY` para obtener resultados web, mostrar enlaces a fuentes y pedir al modelo que sintetice la información. Sin esa clave, «investigá» usa Wikipedia en español como alternativa. Una búsqueda web no garantiza que las fuentes sean correctas: verificar siempre los enlaces originales.

## Seguridad y uso compartido

- Nunca colocar claves de Gemini, OpenAI, Anthropic o Tavily en archivos públicos.
- El código de acceso compartido se guarda solo en la sesión actual del navegador.
- El servidor no guarda conversaciones ni crea perfiles.
- La clave compartida no identifica a cada persona; cualquiera que la tenga puede consumir cuota de los proveedores.
- El control de frecuencia incluido en memoria del Worker es básico y puede reiniciarse o variar entre instancias. No sustituye un sistema de autenticación ni límites de facturación del proveedor.
- Para uso público abierto se recomienda añadir autenticación por usuario, cuotas persistentes y monitoreo de consumo antes de difundir el enlace ampliamente.

## Publicación del frontend

GitHub → Settings → Pages → Deploy from a branch → main → /(root) → Save.

URL prevista: https://eliasmartinezcultural-glitch.github.io/M-Sharbis/

## Pruebas

- Chat local: «¿Qué hora es?» y «Recordá revisar el proyecto».
- IA: «Explicame qué es una red neuronal».
- Búsqueda: «Investigá novedades de energía solar en Argentina».
- TTS: tocar «Probar voz» para voz local; la voz remota se usa en respuestas cuando el Worker está configurado.
