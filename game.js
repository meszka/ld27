var Game = function () {

    var player, walk, map, viewport;

    function move(x, y) {
        this.x += x;
        this.y += y;
        this.walking = true;
        tiles_touched = map.atRect(this.rect());
        if (isWater(tiles_touched)) {
            this.x -= x;
            this.y -= y;
        }
    }

    function isWater(tiles) {
       return tiles.some(function (tile) {
           return tile.id == 7; 
       });
    }

    this.setup = function () {
        jaws.canvas.width = jaws.canvas.width * 4;
        jaws.canvas.height = jaws.canvas.height * 4;
        jaws.context.scale(4, 4);
        jaws.useCrispScaling();

        map = tiledInitMap(jaws.assets.get('map.json'));

        walk = new jaws.Animation({
            sprite_sheet: 'front_walk.png',
            frame_size: [8, 8],
            frame_duration: 60
        });
        player = new jaws.Sprite({ x: 100, y: 75, width: 8, height: 8 });
        player.anim = walk;
        player.speed = 1;
        player.move = move;

        viewport = new jaws.Viewport({ max_x: map.width, max_y: map.height });
    };

    this.update = function () {
        player.walking = false;
        if (jaws.pressed('left'))  { player.move(-1, 0); }
        if (jaws.pressed('right')) { player.move(1, 0); }
        if (jaws.pressed('up'))    { player.move(0, -1); }
        if (jaws.pressed('down'))  { player.move(0, 1); }
    };

    this.draw = function () {
        jaws.clear();
        player.setImage(player.anim.frames[0]);
        if (player.walking) {
            player.setImage(player.anim.next());
        }

        viewport.centerAround(player);
        viewport.apply(function () {
            map.tiles.draw();
            player.draw();
        });
    };

};

jaws.onload = function () {
    jaws.assets.add([
        'front_walk.png',
        'map.json',
        'tiles.png'
    ]);
    jaws.start(Game);
};
