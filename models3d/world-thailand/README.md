# Thailand world map (atlas background)

`build_thailand.py` renders `assets/world112/thailand.jpg` straight down in Blender 5.2 from Natural Earth data
(public domain): `ne_50m_admin_0_countries` (Thailand and neighbours) and `ne_10m_rivers_lake_centerlines`.

1. Download both GeoJSON files from https://github.com/nvkelso/natural-earth-vector (`geojson/`).
2. Cut them to the frame lon 96.6–106.4, lat 5.2–21.0 into one file `{bounds, lands:[{name, ring}], rivers:[{name, scale, line}]}`.
3. `blender -b -P build_thailand.py -- thailand-geo.json thailand.png`, then convert to JPG (`ffmpeg -i thailand.png -q:v 3 thailand.jpg`).

Pins in `world-atlas-ui.js` use the same frame: x = (lon − 96.6) / 9.8, y = (21.0 − lat) / 15.8 of the image.
Relief is stylised (noise weighted over the real ranges), not real elevation data.
