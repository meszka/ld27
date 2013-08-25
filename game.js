var fps = 30;

var Setup = function () {
    this.setup = function () {
        jaws.width = jaws.canvas.width / 4;
        jaws.height = jaws.canvas.height / 4;
        jaws.context.scale(4, 4);
        jaws.useCrispScaling();
        jaws.switchGameState(Game, { fps: fps });
    };
};

var Game = function () {
    var player, walk, map, viewport, objects, bushes, time, sleeping, dead,
        death_reason, door, days, message_text, message_time, inventory,
        items, item_sheet, item_images, item_names, inventory_sprites, fish_limit,
        won, win_sprite;

    function Player(options) {
        jaws.Sprite.call(this, options);
        this.speed = 2;
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
            if (nextTo(that, object, 2)) {
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
            this.takeBerry(1);
            message("Mmm berries");
            jaws.assets.get(afile('eat')).play();
        }
    };
    Bush.prototype.takeBerry = function (n) {
        this.berries -= n;
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

    function Rock(options) {
        jaws.Sprite.call(this, options);
        this.setImage('rock.png');
        this.blocking = true;
    }
    inherits(Rock, jaws.Sprite);

    function Hole(options) {
        jaws.Sprite.call(this, options);
        this.setImage(this.sheet.frames[0]);
    }
    inherits(Hole, jaws.Sprite);

    Hole.prototype.sheet = new jaws.SpriteSheet({
        image: 'hole.png',
        frame_size: [8, 8],
    });

    Hole.prototype.interact = function () {
        if (this.dug) {
            return;
        }
        if (inventory.shovel) {
            this.dug = true;
            this.setImage(this.sheet.frames[1]);
            get('treasure');
        } else {
            message('This spot looks suspicious...');
        }
    };

    function Boat(options) {
        jaws.Sprite.call(this, options);
        this.setImage(this.sheet.frames[0]);
        this.blocking = true;
        this.holes = 3;
    }
    inherits(Boat, jaws.Sprite);

    Boat.prototype.sheet = new jaws.SpriteSheet({
        image: 'boat.png',
        frame_size: [24, 16],
    });

    Boat.prototype.interact = function () {
        if (this.holes) {
            if (!inventory.wood && !inventory.hammer) {
                message('Maybe a little wood could fix it...');
                return;
            }
            if (!inventory.wood) {
                message('Need more wood!');
                return;
            }
            if (inventory.wood && !inventory.hammer) {
                message('You need a tool to fix this...');
                return;
            }
            this.holes--;
            this.setImage(this.sheet.frames[3 - this.holes]);
            unget('wood');
            if (this.holes) {
                message('You fixed a hole in the boat!');
            } else {
                message('There! Good as new!');
            }
            jaws.assets.get(afile('hit')).play();
        } else {
            if (player.hunger > 0) {
                message('Too hungry to row...');
            } else {
                win();
            }
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
        if (!this.collected) {
            this.collected = true;
            get(this.type);
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
            if (object.type == 'tree') {
                var object = new Tree({ x: object.x, y: object.y });
            }
            if (object.type == 'rock') {
                var object = new Rock({ x: object.x, y: object.y });
            }
            if (object.type == 'hole') {
                var object = new Hole({ x: object.x, y: object.y });
            }
            if (object.type == 'boat') {
                var object = new Boat({ x: object.x, y: object.y, type: object.name });
                items.push(object);
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
        var larger_rect = expandedRect(object.rect(), 2);
        return map.atRect(larger_rect); 
    }

    function goFish(tiles) {
        if (inventory.rod) {
            if (Math.random() < 0.5) {
                message("You almost had one...");
                return;
            }

            // var fished = tiles.some(function (tile) { return tile.fished; });
            // if (fished) {
            //     message("The fish aren't biting...");
            //     return;
            // }

            if (fish_limit <= 0) {
                message("I think that's enough fish for today");
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
        player.x = door.x;
        player.y = door.y;
        player.hunger += 10;
        fish_limit = 3;

        bushes.forEach(function (bush) {
            bush.spawnBerries();
        });
    }

    function sleep() {
        sleeping = true;
        time = 2 * 1000;
    }

    function die(reason) {
        dead = true;
        death_reason = reason;
    }

    function win() {
        won = true;
        var win_sheet = new jaws.SpriteSheet({
            image: 'win.png',
            frame_size: [48, 24],
        });
        win_sprite = new jaws.Sprite({ x: 100, y: 100, anchor: 'center' });
        if (inventory.treasure) {
            win_sprite.setImage(win_sheet.frames[1]);
        } else {
            win_sprite.setImage(win_sheet.frames[0]);
        }
    }

    function get(item_name) {
        inventory[item_name] = true;
        inventory_sprites[item_name].setImage(item_images[item_name]);
        message(item_messages[item_name]);
        jaws.assets.get(afile('collect')).play();
    }
    function unget(item_name) {
        inventory[item_name] = false;
        inventory_sprites[item_name].setImage(item_images.mystery);
    }

    function write(text, x, y) {
        jaws.context.save();
        jaws.context.fillStyle = 'white';
        jaws.context.textBaseline = 'top';
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
            shovel: item_sheet.frames[4],
            treasure: item_sheet.frames[5],
            mystery: item_sheet.frames[7],
        };
        item_messages = {
            rod: 'You got a fishing rod!',
            axe: 'You got an axe!',
            wood: 'You got some wood!',
            hammer: 'You got a hammer!',
            shovel: 'You got a shovel!',
            treasure: 'You found a treasure chest!',
        };
        item_names = ['rod', 'axe', 'wood', 'hammer', 'shovel', 'treasure'];

        inventory = {};
        inventory_sprites = {};

        var x_offset = 0;
        item_names.forEach(function (name) {
            x_offset += 10;
            inventory_sprites[name] = new jaws.Sprite({
                x: 120 + x_offset,
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

        player = new Player({ x: door.x, y: door.y });
        player.anim = walk;

        viewport = new jaws.Viewport({ max_x: map.width, max_y: map.height });

        days = 0;

        newDay();
    };

    this.update = function () {
        if (sleeping) {
            // time -= jaws.game_loop.tick_duration;
            time -= 1000 / fps;
            if (time <= 0) {
                days++;
                newDay();
            }
        } else if (dead || won) {
            if (jaws.pressedWithoutRepeat('r')) {
                jaws.switchGameState(Game, { fps: fps });
            }
        } else {
            player.walking = false;
            // var d = jaws.game_loop.tick_duration / 10 * player.speed;
            var d = player.speed;
            if (jaws.pressed('left'))  { player.move(-d, 0); }
            if (jaws.pressed('right')) { player.move(d, 0); }
            if (jaws.pressed('up'))    { player.move(0, -d); }
            if (jaws.pressed('down'))  { player.move(0, d); }
            if (jaws.pressedWithoutRepeat('z') || jaws.pressedWithoutRepeat('x')) {
                player.interact();
            }

            // time -= jaws.game_loop.tick_duration;
            time -= 1000 / fps;
            // message_time -= jaws.game_loop.tick_duration;
            message_time -= 1000 / fps;
            if (message_time < 0) { message_time = 0; }
            if (time <= 0) {
                if (player.hunger <= 0 && nextTo(player, door, 2)) {
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
            var days_text = days != 1 ? 'days' : 'day';
            write(death_reason + "\n\nSurvived " + days +
                  " " + days_text + "\nPress R to restart", 20, 30);
        } else if (won) {
            jaws.context.save();
            jaws.context.fillStyle = '#67a6e7';
            jaws.context.fillRect(0, 0, jaws.canvas.width, jaws.canvas.height);
            jaws.context.restore();
            var treasure_text = "";
            if (inventory.treasure) {
                "You also found the buried treasure. Sweet!\n"
            }
            var days_text = days != 1 ? 'days' : 'day';
            write("You're on your way home. Hooray!\n" + treasure_text + "\nSurvived " + (days + 1) +
                  " " + days_text + "\nPress R to restart", 20, 30);
            win_sprite.draw();
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

            write((Math.ceil(time / 1000)), 20, 10);
            write('Day: ' + (days + 1), 90, 10);
            if (player.hunger > 0) {
                write('Hungry!', 40, 10);
            }
            if (time <= 4 * 1000) {
                if (message_time <= 0) {
                    if (player.hunger <= 0) {
                        message('Go back to your hut!');
                    }
                }
            }
            if (message_time) {
                write(message_text, 20, 140);
            }

        }

        jaws.context.save();
        jaws.context.shadowColor = 'black';
        jaws.context.shadowOffsetX = 4;
        jaws.context.shadowOffsetY = 4;
        for (i in inventory_sprites) {
            inventory_sprites[i].draw();
        }
        jaws.context.restore();
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
        'hole.png',
        'boat.png',
        'win.png',
        'rock.png',
        afile('hit'),
        afile('eat'),
        afile('fish'),
        afile('collect'),
    ]);

    var font = new Font();
    font.onload = function () {
        jaws.start(Setup, { fps: fps });
    };
    font.fontFamily = 'font04b03';
    font.src = '04B_03__.TTF';
};
