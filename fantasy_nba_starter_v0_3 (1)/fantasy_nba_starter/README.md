# Fantasy NBA — starter

## Qué incluye
- `demo/index.html`: prototipo local interactivo en español. Permite navegar, buscar jugadores de muestra, añadir/quitar jugadores del roster, cambiar opciones de liga, simular propuestas de traspaso y usar un chat local.
- `supabase/schema.sql`: esquema inicial PostgreSQL para usuarios, ligas, draft, plantillas, estadísticas, traspasos, chat y reglas.
- `server/espn-adapter.ts`: contrato de normalización y cálculo de puntos, preparado para integrar una fuente real cuando se confirme su acceso y condiciones.

## Probar la demo
Abre `demo/index.html` en un navegador moderno. No necesita instalación.

## Qué no es todavía
No es una aplicación multiusuario desplegada. La demo guarda el estado solo en memoria y utiliza jugadores/puntuaciones ficticios. El chat, los traspasos y el draft no se sincronizan entre personas. No hay conexión activa con ESPN.

## Arquitectura propuesta para producción
- Frontend: Next.js + TypeScript + Tailwind CSS.
- Identidad y base de datos: Supabase Auth + PostgreSQL.
- Actualizaciones en tiempo real: Supabase Realtime para mensajes, picks y eventos de liga.
- Sincronización: tarea programada en servidor, con adaptador aislado por proveedor, validación de datos, upserts idempotentes y registro de la última sincronización.
- Seguridad: Row Level Security (RLS), roles de comisionado/manager, operaciones críticas de draft y traspasos mediante funciones transaccionales del servidor, nunca desde el cliente con privilegios.
- Hosting: Vercel u otro hosting compatible con Next.js.

## Antes de conectar ESPN
No asumir que endpoints no documentados son una API oficial o que permiten redistribuir datos en una web pública. Confirmar:
1. Condiciones de ESPN y permisos de reutilización/redistribución.
2. Endpoint/fuente disponible y estable, cobertura de estadísticas y límites de uso.
3. Reglas de atribución, caché y retención.
4. Comportamiento ante correcciones de box scores y partidos pospuestos.

Si no existe acceso apropiado, usar un proveedor de estadísticas con licencia compatible.

## Fases sugeridas
1. Confirmar reglas de roster: titulares, banca, IL y posiciones elegibles.
2. Configurar Supabase y políticas RLS completas.
3. Implementar registro/login, creación/unión a liga y perfiles.
4. Implementar draft serpiente en una transacción con bloqueo de picks duplicados.
5. Conectar fuente de estadísticas autorizada y pruebas con box scores históricos.
6. Implementar cálculo por puntos y categorías, matchup semanal, trades y playoffs.
7. Añadir realtime, moderación de chat, panel de comisionado, pruebas y monitorización.

## Reglas de puntuación
La función de ejemplo está en `server/espn-adapter.ts`. Es una plantilla configurable, no una recomendación definitiva. En modo categorías se comparan categorías acordadas por matchup; no se suman simplemente los valores como puntos Fantasy.


## Cambios v0.2 según reglas de liga
- La demo solicita usuario y contraseña de prueba. `admin` / `fantasy123` muestra el panel de comisionado; otros usuarios entran como manager. Esto NO es autenticación segura real.
- El panel de administración se oculta a managers en la interfaz, pero en producción la autorización debe imponerse en backend/RLS.
- Máximo 13 jugadores por equipo en el prototipo; quinteto titular dibujado en una pista y resto en banquillo.
- La puntuación de la demo suma solo los cinco titulares.
- Crédito inicial igual para todos (demo: 100); mercado de ejemplo cerrado hasta que el comisionado lo abra. La fecha de apertura de producción debe calcularse como inicio de liga + 14 días.
- Botones de comisionado para abrir mercado y bloquear/desbloquear jornada. El bloqueo impide cambios de alineación, compras y propuestas de traspaso en el prototipo.
- Los valores de jugadores, precios, puntos, partidos y clasificación siguen siendo ficticios.

## Reglas de producción importantes
- La contraseña se gestiona con Supabase Auth (hashing/gestión segura del proveedor); nunca guardarla en una tabla propia ni validar contraseñas en JavaScript.
- Cada liga tiene sus propios administradores/comisionados. No debe existir un único administrador global con permiso automático sobre todas las ligas.
- La apertura de mercado se calcula en servidor a partir de `starts_at + interval '14 days'`.
- El cierre de alineaciones/traspasos debe basarse en el inicio real de la jornada/primer partido de cada matchup, en zona horaria definida y usando una transacción de base de datos.
- Cada equipo puede tener hasta 13 jugadores, exactamente 5 titulares cuando se cierra la alineación; solo esos cinco generan puntuación de partido. Definir tratamiento de jugadores lesionados, partidos aplazados y posiciones elegibles.
- Draft, compras, robos/waivers y traspasos deben ser funciones transaccionales en servidor para evitar duplicados, saldo negativo y carreras entre usuarios.
- El "robo" de jugadores debe especificarse: puja FAAB, prioridad de waivers, precio fijo o compra directa. La demo lo representa como acción de mercado simplificada.
- ESPN: integración real pendiente de confirmar disponibilidad técnica, términos de uso, permisos de redistribución y límites de peticiones. No hay puntos reales en directo en esta demo.


## Reglas definitivas v0.3
- Presupuesto FAAB inicial: 500 créditos por equipo.
- Waivers con pujas secretas: el manager oferta créditos por un jugador libre; la puja se resuelve al cierre del periodo. El ganador paga su oferta y los créditos se descuentan del saldo.
- La demo contiene un flujo local de puja y botón de resolución para el comisionado, pero no garantiza privacidad real entre sesiones ni liquidación concurrente segura.
- Compra directa opcional a precio dinámico de demo. La fórmula de demostración combina precio base, índice de rendimiento simulado y demanda simulada; no está calibrada ni usa estadísticas ESPN.
- Precio dinámico de producción recomendado: precio_base × factor de rendimiento reciente × factor de demanda, con límites mínimos/máximos y frecuencia de actualización definida. El administrador debe poder fijar suelo/techo y activar/desactivar compras directas.
- Mercado: se abre automáticamente en servidor a `starts_at + interval '14 days'`; el botón de apertura manual de la demo es solo para pruebas.
- Bloqueo Fantasy: antes del primer partido NBA que forme parte de cada jornada Fantasy, según calendario oficial. En producción el servidor debe comprobar el comienzo real de ese partido en cada cambio de alineación, oferta, compra o trade.
- 13 jugadores máximo por plantilla y 5 titulares máximo; solo los titulares puntúan.
- Las pujas FAAB son secretas: RLS y backend deben impedir que otro manager lea importes ajenos antes de la resolución.
- El administrador del grupo gestiona reglas de su liga; no debe tener permisos globales automáticos en todas las ligas.
