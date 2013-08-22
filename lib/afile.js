function getAudioFormat() {
    var audio = new Audio();
    if (audio.canPlayType('audio/mpeg')) {
        return "mp3";
    } else if (audio.canPlayType('audio/ogg; codecs="vorbis"')) {
        return "ogg";
    } else {
        return "wav";
    }
}

var AUDIO_FORMAT = getAudioFormat();

function afile(name) {
    return name + "." + AUDIO_FORMAT;
}
