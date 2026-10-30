# JARVIS — M-Sharbis

Asistente personal web, pensado primero para Android.

## Versión 0.1
- Interfaz móvil inspirada en paneles de ciencia ficción.
- Reconocimiento de voz cuando el navegador lo soporta.
- Respuesta hablada en español mediante Speech Synthesis.
- Comandos locales: saludo, hora, fecha y notas.
- Memoria guardada en el almacenamiento local del dispositivo.
- Base PWA con caché de archivos principales.

## Límites conocidos
Esta versión todavía no tiene conexión con un modelo de inteligencia artificial. Las notas permanecen en el navegador/dispositivo y no se sincronizan. El reconocimiento de voz depende del navegador, sus permisos y, en algunos casos, de Internet. No hay escucha permanente: el micrófono se activa al tocar el botón.

## Publicación
En GitHub: Settings → Pages → Deploy from a branch → main → /(root) → Save.

La web se publicará en:
https://eliasmartinezcultural-glitch.github.io/M-Sharbis/

## Seguridad
No guardar claves privadas ni tokens en archivos JavaScript públicos. La futura conexión con IA deberá pasar por un backend o servicio seguro.
