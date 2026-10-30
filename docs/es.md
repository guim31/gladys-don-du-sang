# Don du sang (donación de sangre)

Las próximas **colectas de sangre del Établissement français du sang (EFS)** alrededor de su casa,
en Gladys: cuántas en los próximos días, dónde y cuándo es la próxima, si puede pedir cita en
línea, y avisos en sus escenas. Los datos vienen del mapa público del EFS, el de
[dondesang.efs.sante.fr](https://dondesang.efs.sante.fr/trouver-une-collecte): **sin cuenta, sin
clave**.

Francia metropolitana y los departamentos de ultramar atendidos por el EFS.

## Lo que obtiene

- Un dispositivo, **la zona**: alrededor de la casa ubicada en Gladys, o alrededor de un punto que
  usted introduce, en un radio de 5 a 50 km.
- Sus sensores: el número de días de colecta en los **próximos 7 días** y en los **próximos 30
  días**, y la **próxima colecta**: lugar y municipio, día y horario, distancia, cita en línea y
  plazas libres.
- Un **widget de panel** «Colectas de sangre»: las próximas colectas de la zona (8 como máximo), con
  día, horario, distancia y enlace de cita.
- **Disparadores de escena**: «Nueva colecta de sangre anunciada», «Colecta de sangre hoy» (cada
  mañana hacia las 8) y «Colecta de sangre mañana» (cada tarde hacia las 18).
- Una **acción de escena** «Colectas de sangre cercanas»: las colectas de un periodo en una frase,
  lista para enviar o decir.
- Textos en inglés, francés, alemán y español.

Compruebe siempre la colecta y los criterios de donación en el sitio del EFS antes de ir: los
horarios pueden cambiar, y no todo el mundo puede donar sangre un día determinado.

## Requisitos

- Gladys Assistant **5.3.0** o posterior.
- Acceso a Internet desde Gladys (`oudonner.api.efs.sante.fr`).
- La casa ubicada en Gladys (Ajustes → Casas), o un punto introducido en la configuración.

## Instalación

En Gladys, abra **Integraciones → Instalar desde GitHub** e introduzca la dirección de este
repositorio: `https://github.com/guim31/gladys-don-du-sang`. Gladys descarga la imagen e inicia la
integración.

## Configuración

### Ajustes

- **Radio**: 5, 10, 20 (por defecto), 30 o 50 km alrededor del centro de la zona, en línea recta.
- **Latitud / Longitud de otro punto**: déjelas vacías para usar la casa ubicada en Gladys.
  Introduzca las dos (grados decimales, punto o coma: `43.6045` y `1.4440`) para seguir otro lugar:
  su oficina, el pueblo de sus padres.
- **Idioma de nombres y mensajes**: el idioma de los nombres de funciones, de los textos de escena y
  del informe «Comprobar» (francés por defecto). Los lugares y municipios quedan como los escribe el
  EFS.

### Añadir el dispositivo

Guarde la configuración, abra la pestaña **Descubrir** de la integración y añada el dispositivo
«Don du sang» («Donación de sangre» en español). Sus nombres se fijan al añadirlo: elija antes
el idioma.

### Comprobar

El botón **Comprobar** muestra la zona usada (casa o punto, radio), la última lectura del EFS y su
resultado, y si el dispositivo está añadido.

## Dispositivo

| Función                    | Tipo           | Contenido                                    |
| -------------------------- | -------------- | -------------------------------------------- |
| Colectas en 7 días         | contador       | días de colecta de hoy al 6.º día siguiente  |
| Colectas en 30 días        | contador       | días de colecta de hoy al 29.º día siguiente |
| Próxima colecta: lugar     | texto          | `SALLE DES FÊTES, MURET`                     |
| Próxima colecta: fecha     | texto          | `mañana, 10:00–13:30, 14:30–19:00`           |
| Próxima colecta: distancia | distancia (km) | desde el centro de la zona, en línea recta   |
| Próxima colecta: cita      | texto          | `Cita en línea · 19 plazas libres de 44`     |

Una colecta de dos días cuenta como dos días de colecta. Una colecta deja de ser «próxima» al
terminar su última franja.

## Widget del panel

Añada el widget **Colectas de sangre** a un panel. Ajustes: el periodo (hoy, mañana, próximos 7
días, próximos 30 días), la leyenda con el número y la insignia «Cita en línea». Cada fila muestra
el lugar, el día y el horario, la distancia; un toque abre la dirección, las plazas libres y el
enlace de cita en el sitio del EFS.

## Disparadores de escena

- **Nueva colecta de sangre anunciada**: el EFS publica un nuevo día de colecta en la zona (leído
  dos veces al día). La primera lectura de una zona es la referencia: no se anuncia nada al
  instalar, ni cuando cambia de zona.
- **Colecta de sangre hoy**: cada mañana hacia las 8, por cada colecta de la zona ese día.
- **Colecta de sangre mañana**: cada tarde hacia las 18, por cada colecta de la zona al día
  siguiente.

Variables: lugar, municipio, dirección, fecha y horario, día (`AAAA-MM-DD`), horario, distancia
(km), cita, enlace de cita, fin (ISO 8601).

## Acción de escena

**Colectas de sangre cercanas**: elija un periodo y el número de colectas citadas; la acción
devuelve una frase («Próximos 7 días: 6 colectas de sangre cerca de usted, …»), el número de días de
colecta (para continuar solo si hay alguno), el lugar, la fecha y el enlace de cita de la próxima.

## Ejemplos de escenas

- «Colecta de sangre mañana» → enviar un mensaje: `Colecta de sangre mañana en {{place}},
{{city}}: {{hours}}. ¡Coma bien y beba mucha agua! {{url}}`.
- Cada lunes a las 8 → «Colectas de sangre cercanas» (próximos 7 días) → continuar solo si el
  número es mayor que 0 → decir la frase en el altavoz.
- «Nueva colecta de sangre anunciada» → una notificación con el lugar y la fecha.

## Datos y actualización

- Fuente: la API del mapa del EFS (`oudonner.api.efs.sante.fr/carto-api`, v3), publicada en
  data.gouv.fr («Lieux et horaires des collectes de sang») bajo la Licence Ouverte 2.0.
- Una petición **cada 12 horas** (dos veces al día como máximo), para las colectas desde hoy. Una
  lectura fallida se reintenta al cabo de una hora (10 minutos si aún no se ha leído nada); las colectas conocidas siguen mostrándose.
- Alrededor de París, el EFS tarda hasta un minuto en responder: la primera lectura tras un inicio
  puede tardar ese tiempo.
- Cada 10 minutos, sin red, los contadores y la próxima colecta siguen el reloj.
- La petición lleva el centro de la zona **redondeado a un kilómetro aproximadamente**: la posición
  exacta de su casa no se envía. Las distancias las calcula la integración.
- Las colectas reservadas al personal de una empresa, de un centro escolar o de una unidad militar se
  descartan.
- Lo ya anunciado se guarda en `/data/state.json`: un reinicio no anuncia nada dos veces.

## Solución de problemas

- **Ningún dispositivo en la pestaña Descubrir**: la casa no está ubicada en Gladys y no hay ningún
  punto introducido. El botón «Comprobar» lo indica.
- **Contadores a 0**: ninguna colecta pública en el radio; pruebe un radio mayor. El EFS publica
  unas diez semanas de antelación.
- **«Última lectura fallida»**: el sitio del EFS no responde; la integración lo reintenta cada hora.
- **Falta una colecta o es distinta**: el EFS es la referencia; compruébelo en su sitio.
- Registros: ponga `LOG_LEVEL=debug` para el detalle de cada lectura.

## Limitaciones

- Solo las colectas móviles (salas municipales, empresas abiertas al público, universidades); los
  centros fijos («Maisons du don») tienen su propio horario y no se listan.
- La información de cita es la del mapa del EFS: cita en línea ofrecida, plazas libres para la
  donación de sangre. Las donaciones de plasma y plaquetas se hacen con cita en los centros fijos.
- Distancias en línea recta. Sin ninguna colecta próxima, la distancia conserva su último valor (el
  lugar indica «Ninguna»).
- Los horarios se leen en la zona horaria de Gladys: un punto de ultramar con Gladys en hora de
  París los desplaza.
- Sin relación con el Établissement français du sang.

## Créditos

- Datos: [Établissement français du sang](https://efs.sante.fr), Licence Ouverte 2.0
  ([data.gouv.fr](https://www.data.gouv.fr/datasets/lieux-et-horaires-des-collectes-de-sang)).
- Construido con el [SDK de integración de Gladys Assistant](https://github.com/GladysAssistant/integration-sdk-js).
