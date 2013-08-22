function wrap(text, width) {
    var words = text.split(' ');
    var lines = [];

    var line = words[0];
    for (var i = 1; i < words.length; i++) {
        var word = words[i];
        if (line.length + 1 + word.length > width) {
            lines.push(line);
            line = word;
        } else {
            line += ' ';
            line += word;
        }
    }
    lines.push(line);
    return lines.join('\n');
}

function bitmapFontDraw(sprite_sheet, x, y, text) {
    var width = sprite_sheet.frame_size[0];
    var height = sprite_sheet.frame_size[1];
    var x_offset = 0;
    var y_offset = 0;

    for (var i = 0; i < text.length; i++) {
        if (text.charAt(i) == "\n") {
            x_offset = 0;
            y_offset += height;
            continue;
        }
        var index = text.charCodeAt(i) - " ".charCodeAt(0);
        jaws.context.drawImage(sprite_sheet.frames[index],
                               x + x_offset,
                               y + y_offset);
                               x_offset += width;
    }
}
