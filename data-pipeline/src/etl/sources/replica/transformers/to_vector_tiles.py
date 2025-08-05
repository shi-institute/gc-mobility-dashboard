import json
import os
import shutil
import subprocess
from typing import Any, Generator

import geopandas


def to_vector_tiles(gdf: geopandas.GeoDataFrame, name: str, layer_name: str, output_folder: str, zoomLevel: int = -1) -> Generator[float, None, None]:
    """Converts a GeoDataFrame of lines to vector tiles using tippecanoe.

    This function saves the GeoDataFrame to a GeoJSON file, then uses tippecanoe
    to generate vector tiles from the GeoJSON.

    Additional directories are created that allows the tiles to be consumed by ArcGIS SDK for JavaScript clients.

    See https://support.woolpert.io/hc/en-us/articles/360047005294-Vector-Tiles-on-Google-Cloud-Storage-Web-Clients
    and https://community.esri.com/t5/arcgis-javascript-maps-sdk-questions/is-it-possible-to-render-mapbox-vector-tiles-pbf/m-p/291894/highlight/true#M26794
    for information about using tiles from tippecanoe in ArcGIS SDK for JavaScript clients.

    Args:
        gdf (geopandas.GeoDataFrame): _description_
        name (str): The name of the vector tile layer.
        layer_name (str): The name of the layer in the vector tiles. This name will be used to identify the layer during styling.
        output_folder (Path): The output location for the vector tiles.
        zoomLevel (int): A number from 0 to 22 indicating the zoom level for the vector tiles. Indicate -1 for auto detection. See https://github.com/felt/tippecanoe?tab=readme-ov-file#zoom-levels
    """

    # require line geometry
    # if not gdf.geometry.isin(['LineString', 'MultiLineString']).all():
    #     print(
    #         f'Warning: GeoDataFrame must contain only LineString or MultiLineString geometries. Found: {gdf.geometry.unique()}')

    # reproject to Web Mercator
    temp_geojson_path = os.path.join(output_folder, f'{layer_name}.geojson')

    # ensure the output folder exists and is empty
    if os.path.exists(output_folder):
        shutil.rmtree(output_folder)
    os.makedirs(output_folder, exist_ok=True)

    # save to file so we can use it with tippecanoe
    gdf.to_crs('EPSG:3857').to_file(temp_geojson_path, driver='GeoJSON')

    # generate vector tiles using tippecanoe - see https://github.com/felt/tippecanoe
    command = [
        'tippecanoe',
        f'-z{zoomLevel}' if zoomLevel >= 0 and zoomLevel <= 22 else 'g',
        '--output-to-directory', output_folder,
        '--force',
        '--name', name,
        '--projection', 'EPSG:3857',
        '--no-tile-compression',
        # dynamically drop features at a zoom level if a tile at that zoom level is too large (> 500 KB)
        '--drop-fraction-as-needed',
        '--json-progress',
        temp_geojson_path
    ]

    process = subprocess.Popen(command, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, text=True)

    if process.stdout is None:
        raise RuntimeError(
            "Failed to start tippecanoe process. Check if tippecanoe is installed and available in PATH.")

    # intercept the progress and share it with the parent
    for line in iter(process.stdout.readline, ""):
        try:
            data = json.loads(line)
            if "progress" in data:
                progress_percent = data["progress"]
                yield progress_percent

        except json.JSONDecodeError:
            # ignore lines that are not valid JSON
            pass

        except Exception as e:
            print(f"\nError processing line: {e}")

    process.stdout.close()

    return_code = process.wait()
    if return_code != 0:
        raise subprocess.CalledProcessError(return_code, command)

    # generate vector tile server and style json files
    vt_index = create_vector_tile_server_index(name)
    style = create_vector_tile_default_style(layer_name)

    # read the generated metadata.json file
    # for additional information about the layers
    # to include in the style and vector tile server index
    metadata_path = os.path.join(output_folder, 'metadata.json')
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as metafile:
            metadata = json.load(metafile)

        additional_metadata = json.loads(metadata['json'])
        vector_layers_metadata: list[Any] = additional_metadata['vector_layers']

        # update metadata for each layer in style['layers]
        # with the matching vector layer metadata
        for layer in style['layers']:
            for vector_layer in vector_layers_metadata:
                if layer['id'] == vector_layer['id']:
                    layer.update({
                        'minzoom': vector_layer.get('minzoom', 0),
                        'maxzoom': vector_layer.get('maxzoom', 23),
                    })
                    break

        # update the style's source with the metadata
        style['sources']['esri']['bounds'] = metadata.get('bounds', '').split(',')
        style['sources']['esri']['minzoom'] = int(metadata.get('minzoom', '0'))
        style['sources']['esri']['maxzoom'] = int(metadata.get('maxzoom', '22'))

        # remove levels of detail from the vector tile server index's tileInfo
        current_lods = vt_index['tileInfo']['lods']
        lod_range = range(int(metadata.get('minzoom', '0')),
                          int(metadata.get('maxzoom', '22')) + 1)
        vt_index['tileInfo']['lods'] = [lod for lod in current_lods if lod['level'] in lod_range]

    # write a VectorTileServer index.json file so that the tiles can be consumed by ArcGIS clients
    server_json_folder = os.path.join(output_folder, 'VectorTileServer')
    os.makedirs(server_json_folder, exist_ok=True)
    with open(os.path.join(server_json_folder, 'index.json'), 'w') as file:
        json.dump(vt_index, file, indent=2)

    # write a default style for the vector tiles
    style_json_folder = os.path.join(output_folder, 'VectorTileServer', 'resources', 'styles')
    os.makedirs(style_json_folder, exist_ok=True)
    with open(os.path.join(style_json_folder, 'root.json'), 'w') as file:
        json.dump(style, file, indent=2)

    # delete the generated GeoJSON file
    if os.path.exists(temp_geojson_path):
        os.remove(temp_geojson_path)


def create_vector_tile_server_index(name: str) -> dict[str, Any]:
    return {
        "currentVersion": 10.7,
        "name": name,
        "capabilities": "TilesOnly",
        "type": "indexedFlat",
        "defaultStyles": "../resources/styles",
        "tiles": [
            "../../{z}/{x}/{y}.pbf"
        ],
        "exportTilesAllowed": False,
        "initialExtent": {
            "xmin": -20037508.342787,
            "ymin": -20037508.342787,
            "xmax": 20037508.342787,
            "ymax": 20037508.342787,
            "spatialReference": {
                "cs": "pcs",
                "wkid": 102100
            }
        },
        "fullExtent": {
            "xmin": -20037508.342787,
            "ymin": -20037508.342787,
            "xmax": 20037508.342787,
            "ymax": 20037508.342787,
            "spatialReference": {
                "cs": "pcs",
                "wkid": 102100
            }
        },
        "minScale": 0,
        "maxScale": 0,
        "tileInfo": {
            "rows": 512,
            "cols": 512,
            "dpi": 96,
            "format": "pbf",
            "origin": {
                "x": -20037508.342787,
                "y": 20037508.342787
            },
            "spatialReference": {
                "wkid": 102100,
                "latestWkid": 3857
            },
            "lods": [
                {
                    "level": 0,
                    "resolution": 78271.51696399994,
                    "scale": 295828763.795777
                },
                {
                    "level": 1,
                    "resolution": 39135.75848200009,
                    "scale": 147914381.897889
                },
                {
                    "level": 2,
                    "resolution": 19567.87924099992,
                    "scale": 73957190.948944
                },
                {
                    "level": 3,
                    "resolution": 9783.93962049996,
                    "scale": 36978595.474472
                },
                {
                    "level": 4,
                    "resolution": 4891.96981024998,
                    "scale": 18489297.737236
                },
                {
                    "level": 5,
                    "resolution": 2445.98490512499,
                    "scale": 9244648.868618
                },
                {
                    "level": 6,
                    "resolution": 1222.992452562495,
                    "scale": 4622324.434309
                },
                {
                    "level": 7,
                    "resolution": 611.4962262813797,
                    "scale": 2311162.217155
                },
                {
                    "level": 8,
                    "resolution": 305.74811314055756,
                    "scale": 1155581.108577
                },
                {
                    "level": 9,
                    "resolution": 152.87405657041106,
                    "scale": 577790.554289
                },
                {
                    "level": 10,
                    "resolution": 76.43702828507324,
                    "scale": 288895.277144
                },
                {
                    "level": 11,
                    "resolution": 38.21851414253662,
                    "scale": 144447.638572
                },
                {
                    "level": 12,
                    "resolution": 19.10925707126831,
                    "scale": 72223.819286
                },
                {
                    "level": 13,
                    "resolution": 9.554628535634155,
                    "scale": 36111.909643
                },
                {
                    "level": 14,
                    "resolution": 4.77731426794937,
                    "scale": 18055.954822
                },
                {
                    "level": 15,
                    "resolution": 2.388657133974685,
                    "scale": 9027.977411
                },
                {
                    "level": 16,
                    "resolution": 1.1943285668550503,
                    "scale": 4513.988705
                },
                {
                    "level": 17,
                    "resolution": 0.5971642835598172,
                    "scale": 2256.994353
                },
                {
                    "level": 18,
                    "resolution": 0.29858214164761665,
                    "scale": 1128.497176
                },
                {
                    "level": 19,
                    "resolution": 0.149291070823808325,
                    "scale": 564.248588
                },
                {
                    "level": 20,
                    "resolution": 0.0746455354119041625,
                    "scale": 282.124294
                },
                {
                    "level": 21,
                    "resolution": 0.03732276770595208125,
                    "scale": 141.062147
                },
                {
                    "level": 22,
                    "resolution": 0.018661383852976040625,
                    "scale": 70.5310735
                }]
        }
    }


def create_vector_tile_default_style(layer_name: str) -> dict[str, Any]:
    return {
        "version": 8,
        "sources": {
            "esri": {
                "type": "vector",
                "url": "../../index.json",
                "scheme": "xyz",
            }
        },
        "layers": [{
            "source": "esri",
            "source-layer": layer_name,
            "minzoom": 0,
            "layout": {},
            "id": layer_name,
            "type": "line",
            "paint": {
                "line-width": 1,
                "line-color": "#000000"
            }
        }]
    }
