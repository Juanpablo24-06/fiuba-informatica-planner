# Plan Ing Informática · Demo pública

Copia aislada de la interfaz FIUBA para publicar en Sites. Elegir y confirmar Administrador o Visualizador; cambiar desde Perfil. Admin permite probar materias, cuatrimestres, cursadas, eventos y planes. Los cambios pertenecen al navegador de cada visitante; Restablecer recupera los ejemplos.

Se reutilizaron las páginas y componentes del proyecto mediante adaptadores de navegación y datos locales. La aplicación privada original conserva su configuración. Esta copia es una SPA estática: no contiene las APIs originales, adaptadores Supabase, contraseñas, variables de entorno ni datos personales. No requiere computadora encendida, túneles, base de datos ni IA. Google Calendar y las importaciones externas están deshabilitados. Synapse conserva su interfaz y permite escribir: al enviar informa que no hay proveedor conectado, sin simular respuestas. La CSP bloquea conexiones de red desde la aplicación; las fuentes se sirven junto con el sitio.

Node 22+. `npm ci`, `npm run dev`. Validación: `npm run typecheck`, `npm test`, `npm run build`, `npm run harness:smoke`, `node tests/browser-ux.mjs`. El harness inicia una vista previa del build en 4174; requiere Chromium de Playwright instalado y guarda evidencia en `test-results/` (ignorado). `DEMO_TEST_URL` permite apuntar el mismo recorrido al sitio publicado con un contexto de navegador aislado.

Publicar únicamente `dist/` en hosting estático; no copiar archivos de entorno de la aplicación normal. La identidad de alojamiento y sus credenciales no forman parte de este paquete.

Proyecto original e instalación: https://github.com/Juanpablo24-06/fiuba-informatica-planner

La primera visita usa modo claro. Tema y paleta se guardan en localStorage; el rol cambia permisos sobre los mismos datos ficticios, no crea cuentas distintas. El calendario muestra cursadas confirmadas; los escenarios se guardan aparte hasta confirmarlos.

El cambio de tema pinta solamente el fondo decorativo durante 480 ms. Las tarjetas acompañan con 1.5 px de movimiento y la barra permanece estable; el texto conserva su comportamiento habitual. Un segundo clic retoma los píxeles visibles. `prefers-reduced-motion` evita la onda. `npm run harness:theme` verifica ambos sentidos, interrupciones, teclado, persistencia y móvil sobre el build en 4176.

El acceso permite elegir tema y paleta antes de entrar y usa la misma onda de tema. Su ilustración fija reproduce el trazado del loader de mapa existente. La navegación conserva 720 ms mínimos para mostrar las cargas; movimiento reducido omite esa espera. Los íconos mantienen sus gestos por partes, con duraciones de 620–860 ms y sin reinicios consecutivos. Las rutas se normalizan para tolerar la barra final que agrega el alojamiento estático al recargar.
