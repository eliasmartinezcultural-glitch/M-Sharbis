# Despliegue de JARVIS API

El Worker expone /api/health, /api/chat, /api/search y /api/speech. Configurá secretos desde el panel de Cloudflare, nunca en este repositorio.

Secretos: JARVIS_ACCESS_CODE (obligatorio, mínimo 12 caracteres), GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY y TAVILY_API_KEY (opcionales).

El frontend usa la URL del Worker y el código compartido introducidos por cada usuario. Restringí ALLOWED_ORIGIN al dominio de GitHub Pages.

Este prototipo no tiene cuentas individuales ni cuotas persistentes. El rate limit en memoria es básico. Para abrirlo al público general, agregá autenticación y límites persistentes antes de compartirlo masivamente.
