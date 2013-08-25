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
        death_reason, door, days, message_text, message_time, inventory,
        items, item_sheet, item_images, item_names, inventory_sprites, fish_limit;

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
        var tiles_touched = map.atRect(this.rect());
        var blocked = false;
        if (isBlocking(tiles_touched)) {
            blocked = true;
        }
        var object_collisions = jaws.collideOneWithMany(this, objects);
        var that = this;
        if (!blocked) {
            blocked = object_collisions.some(function (object) {
                return object.blocking;
            });
        }
        if (blocked) {
            this.x -= x;
            this.y -= y;
        }

        object_collisions.forEach(function (object) {
            if (object instanceof Item) {
                object.collect();
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
        var next_to_tiles = nextToTiles(this);
        var water_tiles = next_to_tiles.filter(isWater);
        if (water_tiles.length) {
            goFish(water_tiles);
        }
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
            message("Mmm berries");
            jaws.assets.get(afile('eat')).play();
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

    function Tree(options) {
        jaws.Sprite.call(this, options);
        this.setImage('tree.png');
        this.blocking = true;
        this.cuts = 0;
    }
    inherits(Tree, jaws.Sprite);

    Tree.prototype.interact = function () {
        if (!this.stump && inventory.axe) {
            this.cut();
        }
    };
    Tree.prototype.cut = function () {
        jaws.assets.get(afile('hit')).play();
        this.cuts++;
        if (this.cuts >= 3) {
            this.stump = true;
            this.setImage('stump.png');
            this.move(3, 0);
            get('wood');
        }
    };

    function Item(options) {
        jaws.Sprite.call(this, options);
        this.type = options.type;
        this.setImage(item_images[this.type]);
    }
    inherits(Item, jaws.Sprite);

    Item.prototype.draw = function () {
        if (!this.collected) {
            jaws.Sprite.prototype.draw.call(this);
        }
    };

    Item.prototype.collect = function () {
        this.collected = true;
        get(this.type);
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
            if (object.type == 'tree') {
                var object = new Tree({ x: object.x, y: object.y });
            }
            if (object.type == 'item') {
                var object = new Item({ x: object.x, y: object.y, type: object.name });
                items.push(object);
            }
            object.setAnchor('bottom_left');
            objects.push(object);
        });
        objects.sort(function (a, b) { return b.y - a.y; });
        return objects;
    }

    function expandedRect(rect, distance) {
        var larger_rect = new jaws.Rect(rect.x, rect.y, rect.width, rect.height);
        larger_rect.move(-distance, -distance);
        larger_rect.resize(distance * 2, distance * 2);
        return larger_rect;
    }
    function nextTo(obj1, obj2, distance) {
        var larger_rect = expandedRect(obj1.rect(), distance);
        return jaws.collideRects(larger_rect, obj2.rect());
    }

    function isBlocking(tiles) {
        var blocking_tiles = [7, 36, 37, 38, 42, 43, 44];
        return tiles.some(function (tile) {
            return (blocking_tiles.indexOf(tile.id) != -1)
        });
    }

    function isWater(tile) {
        return tile.id == 7;
    }

    function nextToTiles(object) {
        var larger_rect = expandedRect(object.rect(), 1);
        return map.atRect(larger_rect); 
    }

    function goFish(tiles) {
        if (inventory.rod) {
            if (Math.random() < 0.75) {
                message("You almost had one...");
                return;
            }

            var fished = tiles.some(function (tile) { return tile.fished; });
            if (fished) {
                message("The fish aren't biting...");
                return;
            }

            if (fish_limit <= 0) {
                message("I think that's enough fish for today.");
                return;
            }

            fish_limit--;
            player.eat(10); 
            message("You caught a fish! Yum!");
            jaws.assets.get(afile('fish')).play();
            tiles.forEach(function (tile) {
                tile.fished = true;
            });
        }
    }

    function newDay() {
        message_text = "";
        message_time = 0;

        sleeping = false;
        time = 10 * 1000;
        player.x = 100;
        player.y = 75;
        player.hunger += 10;
        fish_limit = 3;

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

    function get(item_name) {
        inventory[item_name] = true;
        inventory_sprites[item_name].setImage(item_images[item_name]);
        message(item_messages[item_name]);
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
        item_sheet = new jaws.SpriteSheet({
            image: 'items.png',
            frame_size: [8, 8]
        });
        item_images = {
            rod: item_sheet.frames[0],
            axe: item_sheet.frames[1],
            wood: item_sheet.frames[2],
            hammer: item_sheet.frames[3],
            mystery: item_sheet.frames[7],
        };
        item_messages = {
            rod: "You got a fishing rod!",
            axe: "You got an axe!",
            wood: "You got some wood!",
            hammer: "You got a hammer!",
        };
        item_names = ['rod', 'axe', 'wood', 'hammer'];

        inventory = {};
        inventory_sprites = {};

        var x_offset = 0;
        item_names.forEach(function (name) {
            x_offset += 10;
            inventory_sprites[name] = new jaws.Sprite({
                x: 130 + x_offset,
                y: 10,
                image: item_images.mystery,
            });
        });

        map = tiledInitMap(jaws.assets.get('map.json'));
        bushes = new jaws.SpriteList();
        items = new jaws.SpriteList();
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
                if (nextTo(player, door, 1)) {
                    sleep();
                } else {
                    if (player.hunger > 0) {
                        die('Died of starvation');
                    } else {
                        die('Killed by the creatures of the night.');
                    }
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
            write(death_reason + "\npress R to restart", 20, 20);
        } else {
            player.setImage(player.anim.frames[0]);
            if (player.walking) {
                player.setImage(player.anim.next());
            }

            viewport.centerAround(player);
            viewport.apply(function () {
                map.tiles.draw();

                for (var i = objects.length - 1; i >= 0; i--) {
                   objects.at(i).draw(); 
                }
                // objects.forEach(function (object) {
                //    object.rect().draw(); 
                // });
                player.draw();
                // player.rect().draw();
            });
            for (i in inventory_sprites) {
                inventory_sprites[i].draw();
            }

            jaws.context.fillStyle = 'rgb(255,255,255)';
            write((Math.ceil(time / 1000)), 20, 20);
            write('Day: ' + (days + 1), 100, 20);
            if (player.hunger > 0) {
                write('Hungry!', 50, 20);
            }
            if (time <= 4 * 1000) {
                message('Go back to your hut!');
            }
            if (message_time) {
                write(message_text, 20, 140);
            }

            var alpha;
            if (time  <= 4 * 1000) {
                alpha = 0.8 - ( ((time) / 1000) / 4 * 0.8 );
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
        'tree.png',
        'stump.png',
        'map.json',
        'tiles.png',
        'items.png',
        afile('hit'),
        afile('eat'),
        afile('fish'),
    ]);

    var font = new Font();
    font.onload = function () {
        jaws.start(Setup);
    };
    font.fontFamily = 'font04b03';
    font.src = '04B_03__.TTF';
};
