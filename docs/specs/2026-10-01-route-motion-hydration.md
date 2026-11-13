# Entrada de rutas y streaming

El harness detectó un aviso de hidratación en el resumen: `RouteMotion` escribía `opacity` y `transform` inline en descendientes cuya hidratación todavía estaba pendiente. El efecto del contenedor no garantiza que todos los límites cliente de una página transmitida por streaming estén listos.

La entrada conserva sus distancias, duraciones (360/300 ms), curva `out(3)` y escalonado (80 ms iniciales + 42 ms por elemento). Anime.js conserva el scope, las media queries y la conversión de easing; los efectos se ejecutan con `Element.animate`, sin escribir ni confirmar estilos inline. Cada efecto se cancela al terminar y el cleanup del scope cancela todos al desmontar o cambiar la preferencia.

Con movimiento reducido no se crean animaciones. El mapa sigue utilizando su coordinador existente. No se agrega `suppressHydrationWarning` ni se retrasa la navegación.

La prueba del resumen registra errores de página y avisos de hidratación, abre/cierra una tarjeta si hay cursadas, comprueba que los atributos no fueron modificados y guarda una captura. Otro caso comprueba movimiento reducido.

El disparador del diálogo de cursada permanece deshabilitado hasta que su componente se monta, para evitar que un clic sobre HTML todavía sin manejadores se pierda.
