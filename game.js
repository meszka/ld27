var player, walk, map, viewport, bushes;

var Game = function () {

    function move(x, y) {
        this.x += x;
        this.y += y;
        this.walking = true;
        tiles_touched = map.atRect(this.rect());
        if (isWater(tiles_touched)) {
            this.x -= x;
            this.y -= y;
        }
        if (jaws.collideOneWithMany(this, bushes).length) {
            this.x -= x;
            this.y -= y;
        }
    }

    function nextTo(obj1, obj2, distance) {
        var larger_rect = obj1.rect();
        larger_rect.move(-distance, -distance);
        larger_rect.resize(distance * 2, distance * 2);
        return jaws.collideRects(larger_rect, obj2.rect());
    }

    function interact() {
        bushes.forEach(function (bush) {
            if (nextTo(player, bush, 1)) {
                if (bush.berries) { bush.takeBerry(); }
            }
        });
    }

    function takeBerry() {
        if (this.berries) {
            this.berries -= 1;
        }
        this.setImage(bush_sheet.frames[5 - this.berries]);
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
        bush_sheet = new jaws.SpriteSheet({
            image: 'berry_bush.png',
            frame_size: [8, 8]
        });

        player = new jaws.Sprite({ x: 100, y: 75, width: 4, height: 4 });
        player.anim = walk;
        player.speed = 1;
        player.move = move;
        player.interact = interact;

        bushes = new jaws.SpriteList();
        var bush = new jaws.Sprite({ width: 8, height: 8, x: 150, y: 90 });
        bush.setImage(bush_sheet.frames[0]);
        bush.berries = 5;
        bush.takeBerry = takeBerry;
        bushes.push(bush);

        viewport = new jaws.Viewport({ max_x: map.width, max_y: map.height });
    };

    this.update = function () {
        player.walking = false;
        if (jaws.pressed('left'))  { player.move(-1, 0); }
        if (jaws.pressed('right')) { player.move(1, 0); }
        if (jaws.pressed('up'))    { player.move(0, -1); }
        if (jaws.pressed('down'))  { player.move(0, 1); }
        if (jaws.pressedWithoutRepeat('z'))  { player.interact(); }
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
            bushes.draw();
            player.draw();
        });
    };

};

jaws.onload = function () {
    jaws.assets.add([
        'front_walk.png',
        'berry_bush.png',
        'map.json',
        'tiles.png'
    ]);
    jaws.start(Game);
};
