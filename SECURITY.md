# Seguridad / Security

Rastreador de Quests para Vencord — política de seguridad y modelo de amenaza.

## Versiones soportadas

Solo la **última release** (`git tag` más reciente) recibe correcciones. Las releases incluyen un archivo
`SHA256SUMS.txt` para verificar el ZIP y las capturas.

```powershell
# Windows
Get-FileHash .\rastreador-de-quests-vX.Y.Z.zip -Algorithm SHA256
```

## Cómo reportar una vulnerabilidad

- Usa **GitHub → Security → Advisories → Report a vulnerability** (aviso privado) en
  https://github.com/pilahito/rastreador-de-quests/security/advisories/new
- Si no es sensible, abre un *issue* normal.
- No publiques exploits ni datos de cuentas de terceras personas.

## Qué hace el plugin (superficie real)

- Se ejecuta **dentro del renderer de Discord** como plugin de Vencord (mismo modelo de permisos que
  cualquier userplugin).
- Usa el **cliente autenticado de Discord** (`RestAPI`): las peticiones van a `discord.com` con tu sesión.
  No hay servidores intermedios ni tokens propios.
- El progreso de las Quests lo valida **el servidor de Discord**; el plugin no puede alterar esa validación.
- Guarda ajustes, posición del panel, selección e historial en el **`DataStore` local** de Vencord. No sale de
  tu equipo.
- No lee ni escribe credenciales, tokens, contraseñas ni mensajes.
- No incluye analítica, telemetría propia ni actualizaciones automáticas.

## Red y URLs

- Peticiones solo por **https** a dominios de Discord.
- Los enlaces externos (“Página del juego”) **solo se abren si tú los pulsas y confirmas**; se rechaza
  cualquier esquema que no sea `https:`.
- El vídeo de las Quests **solo se reproduce si la URL es https de un CDN de Discord**
  (`cdn.discordapp.com`, `media.discordapp.net`, `discord.com`, `discord.media`). Cualquier otra URL se
  ignora y se registra como aviso.
- El QR de móvil reutiliza la UI oficial de Discord; el plugin no genera ni transmite códigos.

## Lo que este plugin NO hace (fuera de alcance por diseño)

- No salta captchas ni verifica cuentas.
- No pide OAuth ni tokens de terceros.
- No automatiza logros de actividades, consola, móvil ni stream real (requieren validación de plataforma).
- **No evade detección**: no inventa fingerprints, no bloquea telemetría, no oculta peticiones, no modifica
  el cliente para parecer otra plataforma.
- No envía tu historial a ningún servicio.

## Riesgo de cuenta (no es un fallo de seguridad)

Automatizar Quests **va contra las normas de Discord** y puede provocar bloqueo del acceso a Quests o avisos
en la cuenta. Eso es riesgo de uso, no una vulnerabilidad del plugin, y ninguna “capa de camuflaje” lo elimina.
El modo automático viene apagado y exige aceptar el aviso de riesgo.

## Buenas prácticas

1. Descarga el ZIP solo desde las **Releases** oficiales y verifica `SHA256SUMS.txt`.
2. Compila desde el código si quieres auditar (instrucciones en el README).
3. No instales plugins de fuentes desconocidas en tu Vencord.
4. Deja el modo automático apagado si no quieres asumir el riesgo; el rastreador funciona igual.
