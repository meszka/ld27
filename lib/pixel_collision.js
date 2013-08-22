function getPixelData(sprite) {
    var canvas_context = sprite.asCanvasContext();
    data = canvas_context.getImageData(0, 0, sprite.width, sprite.height).data;
    sprite.pixel_data = data
    return data
}

function pixelAt(terrain, x, y) {
    x = parseInt(x);
    y = parseInt(y);
    try {
        return terrain.pixel_data[(y * terrain.width * 4) + (x * 4) + 3];
    } catch (e) {
        return false;
    }
}

function pixelCollide(terrain, rect) {
    for (var x = rect.x; x < rect.right; x++) {
        for (var y = rect.y; y < rect.bottom; y++) {
            if (pixelAt(terrain, x, y)) {
                return true;
            }
        }
    }
    return false;
}
