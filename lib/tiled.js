function tiledGetTileSheet(data) {
    var tileset_data = data.tilesets[0];

    return new jaws.SpriteSheet({
        frame_size: [tileset_data.tilewidth, tileset_data.tileheight],
        image: tileset_data.image
    });
}

function tiledGetMap(data) {
    return new jaws.TileMap({
        cell_size: [data.tilewidth, data.tileheight],
        size: [data.width, data.height]
    });
}

function tiledSpawnTiles(map, tile_sheet, data) {
    var width = map.size[0];
    var height = map.size[1];
    var tile_width = map.cell_size[0];
    var tile_height = map.cell_size[1];

    var tiles = new jaws.SpriteList();
    data.layers[0].data.forEach(function (id, i) {
        var tile = new jaws.Sprite({
            image: tile_sheet.frames[id],
            x: Math.floor(i / width) * tile_width,
            y: i % width * tile_height
        });
        tile.id = id;
        tiles.push(tile);
    });
    return tiles;
}

function tiledInitMap(data) {
    var tile_sheet = tiledGetTileSheet(data);
    var map = tiledGetMap(data);
    var tiles = tiledSpawnTiles(map, tile_sheet, data);
    map.push(tiles);
    map.tile_sheet = tile_sheet;
    map.tiles = tiles;
    return map;
}
