var Game = function () {

    this.setup = function () {
    };

    this.update = function () {
    };

    this.draw = function () {
        jaws.clear();
    };

};

jaws.onload = function () {
    jaws.assets.add([
    ]);
    jaws.start(Game);
};
