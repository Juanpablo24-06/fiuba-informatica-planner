# Entornos de pruebas

La suite actual prueba lógica y contratos de código; únicamente `tests/layout/theme-preferences.test.ts` necesita DOM. Vitest usa Node por defecto y esa prueba declara JSDOM explícitamente. Las pruebas DOM nuevas deben declarar también su entorno y, si renderizan componentes, registrar los matchers y la limpieza necesarios.

Se usan dos workers en threads: el arranque anterior en forks y con JSDOM global agotaba el tiempo de inicio sin ejecutar las pruebas. La ejecución con Node y dos threads completó 77 archivos; sus fallos restantes eran un contrato Node desactualizado y cinco timeouts de importación de rutas, que pasaron en una repetición dirigida con 30 segundos.

Solo las suites que importan rutas dinámicamente tienen 30 segundos por prueba. Las comprobaciones de lógica conservan su límite habitual. No se reducen assertions ni se omiten casos para lograr que la suite pase.
