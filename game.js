var Setup = function () {
    this.setup = function () {
        jaws.width = jaws.canvas.width / 4;
        jaws.height = jaws.canvas.height / 4;
        jaws.context.scale(4, 4);
        jaws.useCrispScaling();
        jaws.switchGameState(Game);
    };
};

var Game = function () {

    var player, walk, map, viewport, objects, bushes, time, sleeping, dead,
        death_reason, door, days, message_text, message_time;

    function Player(options) {
        jaws.Sprite.call(this, options);
        this.speed = 1;
        this.hunger = 0;
    }
    inherits(Player, jaws.Sprite);

    Player.prototype.move = function (x, y) {
        this.x += x;
        this.y += y;
        this.walking = true;
        tiles_touched = map.atRect(this.rect());
        if (isBlocking(tiles_touched)) {
            this.x -= x;
            this.y -= y;
        }
        var object_collisions = jaws.collideOneWithMany(this, objects);
        var that = this;
        object_collisions.forEach(function (object) {
            if (object.blocking) {
                that.x -= x;
                that.y -= y;
            }
        });
    };

    Player.prototype.eat = function (amount) {
        this.hunger -= amount;
    }

    Player.prototype.interact = function () {
        var that = this;
        objects.forEach(function (object) {
            if (nextTo(that, object, 1)) {
                if (typeof object.interact === 'function') {
                    object.interact();
                }
            }
        });
    };

    function Bush(options) {
        jaws.Sprite.call(this, options);
        this.spawnBerries();
        this.blocking = true;
    }
    inherits(Bush, jaws.Sprite);

    Bush.prototype.spawnBerries = function () {
        this.berries = 5;
        this.setImage(this.sheet.frames[0]);
    };
    Bush.prototype.interact = function () {
        if (this.berries) {
            player.eat(1);
            this.takeBerry();
        }
    };
    Bush.prototype.takeBerry = function () {
        this.berries -= 1;
        this.setImage(this.sheet.frames[5 - this.berries]);
    };
    Bush.prototype.sheet = new jaws.SpriteSheet({
        image: 'berry_bush.png',
        frame_size: [8, 8]
    });

    function Door(options) {
        jaws.Sprite.call(this, options);
        this.setImage(map.tile_sheet.frames[49]);
    }
    inherits(Door, jaws.Sprite);
    
    Door.prototype.interact = function () {
        if (player.hunger > 0) {
            message("Can't sleep if hungry!");
        } else {
            sleep();
        }
    };

    function tiledSpawnObjects(data) {
        var objects = new jaws.SpriteList();
        data.layers[1].objects.forEach(function (object) {
            if (object.type == 'bush') {
                var object = new Bush({ x: object.x, y: object.y });
                bushes.push(object);
            }
            if (object.type == 'door') {
                var object = new Door({ x: object.x, y: object.y });
                door = object;
            }
            object.setAnchor('bottom_left');
            objects.push(object);
        });
        return objects;
    }

    function nextTo(obj1, obj2, distance) {
        var larger_rect = obj1.rect();
        larger_rect.move(-distance, -distance);
        larger_rect.resize(distance * 2, distance * 2);
        return jaws.collideRects(larger_rect, obj2.rect());
    }

    function isBlocking(tiles) {
        var blocking_tiles = [7, 36, 37, 38, 42, 43, 45];
        return tiles.some(function (tile) {
            // return tile.id == 7;
            return (blocking_tiles.indexOf(tile.id) != -1)
        });
    }

    function newDay() {
        sleeping = false;
        time = 10 * 1000;
        player.x = 100;
        player.y = 75;
        player.hunger += 10;

        bushes.forEach(function (bush) {
            bush.spawnBerries();
        });
    }

    function sleep() {
        sleeping = true;
        time = 3 * 1000;
    }

    function die(reason) {
        dead = true;
        death_reason = reason;
    }

    function write(text, x, y) {
        jaws.context.save();
        jaws.context.font = '8px font04b03';
        jaws.context.shadowColor = 'black';
        jaws.context.shadowOffsetX = 4;
        jaws.context.shadowOffsetY = 4;

        var lines = text.toString().split("\n");
        var y_offset = 0;
        lines.forEach(function (line) {
            jaws.context.fillText(line, x, y + y_offset);
            y_offset += 10;
        });
        jaws.context.restore();
    }

    function message(text) {
        message_text = text;
        message_time = 1500;
    }

    this.setup = function () {
        map = tiledInitMap(jaws.assets.get('map.json'));
        bushes = new jaws.SpriteList();
        objects = tiledSpawnObjects(jaws.assets.get('map.json'));

        walk = new jaws.Animation({
            sprite_sheet: 'front_walk.png',
            frame_size: [8, 8],
            frame_duration: 60
        });

        player = new Player({ x: 100, y: 75, width: 4, height: 4 });
        player.anim = walk;

        viewport = new jaws.Viewport({ max_x: map.width, max_y: map.height });

        days = 0;

        newDay();
    };

    this.update = function () {
        if (sleeping) {
            time -= jaws.game_loop.tick_duration;
            if (time <= 0) {
                days++;
                newDay();
            }

        } else if (dead) {
            if (jaws.pressedWithoutRepeat('r')) {
                jaws.switchGameState(Game);
            }

        } else {
            player.walking = false;
            if (jaws.pressed('left'))  { player.move(-1, 0); }
            if (jaws.pressed('right')) { player.move(1, 0); }
            if (jaws.pressed('up'))    { player.move(0, -1); }
            if (jaws.pressed('down'))  { player.move(0, 1); }
            if (jaws.pressedWithoutRepeat('z'))  { player.interact(); }

            time -= jaws.game_loop.tick_duration;
            message_time -= jaws.game_loop.tick_duration;
            if (message_time < 0) { message_time = 0; }
            if (time <= 0) {
                if (nextTo(player, door)) {
                    sleep();
                } else {
                    die('Killed by the creatures of the night.');
                }
            }
        }
    };

    this.draw = function () {
        jaws.clear();
        if (sleeping) {
            jaws.context.save();
            jaws.context.fillStyle = 'rgba(0,0,20,1)';
            jaws.context.fillRect(0, 0, jaws.canvas.width, jaws.canvas.height);
            jaws.context.restore();
            write('Sleeping...', 20, 20);
        } else if (dead) {
            jaws.context.save();
            jaws.context.fillStyle = 'rgba(0,0,20,1)';
            jaws.context.fillRect(0, 0, jaws.canvas.width, jaws.canvas.height);
            jaws.context.restore();
            write("Dead...\n" + death_reason + "\npress R to restart", 20, 20);
        } else {
            player.setImage(player.anim.frames[0]);
            if (player.walking) {
                player.setImage(player.anim.next());
            }

            viewport.centerAround(player);
            viewport.apply(function () {
                map.tiles.draw();
                objects.draw();
                player.draw();
            });

            jaws.context.fillStyle = 'rgb(255,255,255)';
            write((Math.ceil(time / 1000)), 20, 20);
            write('Day: ' + (days + 1), 100, 20);
            if (player.hunger > 0) {
                write('Hungry!', 50, 20);
            }
            if (time < 4 * 1000) {
                write('Need sleep!', 50, 30);
            }
            if (message_time) {
                write(message_text, 20, 140);
            }

            var alpha;
            if (time  < 5000) {
                alpha = 0.8 - ( ((time) / 1000) / 5 * 0.8 );
            } else {
                alpha = 0;
            }

            jaws.context.save();
            jaws.context.fillStyle = 'rgba(0,0,20,' + alpha + ')';
            jaws.context.fillRect(0, 0, jaws.canvas.width, jaws.canvas.height);
            jaws.context.restore();
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

    var font = new Font();
    font.onload = function () {
        jaws.start(Setup);
    };
    font.fontFamily = 'font04b03';
    font.src = '04B_03__.TTF';
};
