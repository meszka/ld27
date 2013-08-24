var Game = function () {

    var player, walk, map, viewport, bushes, time;

    function Player(options) {
        jaws.Sprite.call(this, options);
        this.speed = 1;
    }
    inherits(Player, jaws.Sprite);

    Player.prototype.move = function (x, y) {
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
    };

    Player.prototype.eat = function (amount) {
        this.hunger -= amount;
        if (this.hunger < 0) { this.hunger = 0; }
    }

    Player.prototype.interact = function () {
        var that = this;
        bushes.forEach(function (bush) {
            if (nextTo(that, bush, 1)) {
                if (bush.berries) {
                    bush.takeBerry();
                    that.eat(1);
                }
            }
        });
    };

    function Bush(options) {
        jaws.Sprite.call(this, options);
        this.setAnchor('bottom_left');
        this.spawnBerries();
    }
    inherits(Bush, jaws.Sprite);

    Bush.prototype.spawnBerries = function () {
        this.berries = 5;
        this.setImage(this.sheet.frames[0]);
    };
    Bush.prototype.takeBerry = function () {
        if (this.berries) {
            this.berries -= 1;
        }
        this.setImage(this.sheet.frames[5 - this.berries]);
    };
    Bush.prototype.sheet = new jaws.SpriteSheet({
        image: 'berry_bush.png',
        frame_size: [8, 8]
    });

    function tiledSpawnBushes(data) {
        var bushes = new jaws.SpriteList();
        data.layers[1].objects.forEach(function (object) {
            var bush = new Bush({ x: object.x, y: object.y });
            bushes.push(bush);
        });
        return bushes;
    }

    function nextTo(obj1, obj2, distance) {
        var larger_rect = obj1.rect();
        larger_rect.move(-distance, -distance);
        larger_rect.resize(distance * 2, distance * 2);
        return jaws.collideRects(larger_rect, obj2.rect());
    }

    function isWater(tiles) {
        return tiles.some(function (tile) {
            return tile.id == 7;
        });
    }

    function newDay() {
        time = 10 * 1000;
        player.x = 100;
        player.y = 75;
        player.hunger = 20;

        bushes.forEach(function (bush) {
            bush.spawnBerries();
        });
    }

    this.setup = function () {
        jaws.canvas.width = jaws.canvas.width * 4;
        jaws.canvas.height = jaws.canvas.height * 4;
        jaws.context.scale(4, 4);
        jaws.useCrispScaling();

        map = tiledInitMap(jaws.assets.get('map.json'));
        bushes = tiledSpawnBushes(jaws.assets.get('map.json'));

        walk = new jaws.Animation({
            sprite_sheet: 'front_walk.png',
            frame_size: [8, 8],
            frame_duration: 60
        });

        player = new Player({ x: 100, y: 75, width: 4, height: 4 });
        player.anim = walk;

        viewport = new jaws.Viewport({ max_x: map.width, max_y: map.height });

        newDay();
    };

    this.update = function () {
        player.walking = false;
        if (jaws.pressed('left'))  { player.move(-1, 0); }
        if (jaws.pressed('right')) { player.move(1, 0); }
        if (jaws.pressed('up'))    { player.move(0, -1); }
        if (jaws.pressed('down'))  { player.move(0, 1); }
        if (jaws.pressedWithoutRepeat('z'))  { player.interact(); }

        time -= jaws.game_loop.tick_duration;
        if (time <= 0) {
            newDay();
        }
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

        jaws.context.font = '10px monospace';
        jaws.context.fillStype = 'rgb(255,255,255)';
        jaws.context.fillText((Math.ceil(time / 1000)), 20, 20);
        if (player.hunger > 0) {
            jaws.context.fillText('Hungry!', 50, 20);
        }
        if (time < 4 * 1000) {
            jaws.context.fillText('Need sleep!', 50, 30);
        }
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
