/* Javascript for Accessible Audio Player (AAP)
http://www.terrillthompson.com/music/aap
Author: Terrill Thompson
Version: 2.1.3
Last update: September 10, 2011

Uses Yahoo! Media Player as fallback. API docs are here:
http://mediaplayer.yahoo.com/api/
*/

accessibleAudioPlayer = {
// User defined variables.

// useDebug - set to true to display event log, otherwise set to false.
useDebug: true,
// useYahoo - set to true to always use the fallback Yahoo Media Player
// (RECOMMENDED FOR TESTING ONLY).
useYahoo: false,

// end user-defined variables.
debug: '',
log: '',
numEvents: 0,
// player will be programatically set either to "html5" or "yahoo".
player: '',

//id's of various components.
audioId: '',
playlistId: '',
nowPlayingId: '',
controllerId: '',
statusBarId: '',
debugId: '',

// DOM objects of various components.
audio: '',
controller: '',
loading: false,
playpause: '',
seekBar: '',
seekBack: '',
seekForward: '',
//Number of seconds to seek forward or back.
seekInterval: 15,
timer: '',
elapsedTimeContainer: '',
elapsedTime: '',
duration: '',
durationContainer: '',
pauseTime: 0,
mute: '',
volumeUp: '',
volumeDown: '',
hasSlider: '',
numSongs: '',
songIndex: 0,
prevSongIndex: 0,
songId: '',
songTitle: '',
prevSongId: '',
prevSongTitle: '',
playlist: '',
nowPlayingDiv: '',
statusBar: '',
userClickedPlayPause: false,
userClickedLink: false,
autoplaying: false,

playButtonImage: 'images/audio_play.gif',
pauseButtonImage: 'images/audio_pause.gif',
volumeButtonImage: 'images/audio_volume.gif',
muteButtonImage: 'images/audio_mute.gif',

//vars used by Yahoo.
thisMediaObj: '',

init: function () {
var sources, canPlaySourceType, i, audioSource, sourceType;
this.audioId = 'aap-audio';
this.playlistId = 'aap-playlist';
this.nowPlayingId = 'aap-now-playing';
this.controllerId = 'aap-controller';
this.statusBarId = 'aap-status-bar';
this.debugId = 'aap-debug';

if (this.useDebug) {
this.setupDebug(this.debugId);
}

this.audio = document.getElementById(this.audioId);
if (this.audio) {
this.controller = document.getElementById(this.controllerId);
this.nowPlayingDiv = document.getElementById(this.nowPlayingId);
this.playlist = document.getElementById(this.playlistId);
this.statusBar = document.getElementById(this.statusBarId);
this.numSongs = this.countSongs(this.playlist);

// Test to see if the browser supports html5 audio.
if (this.audio.canPlayType) {
// check canPlayType for all audio sources
sources = this.audio.getElementsByTagName('source');
canPlaySourceType = false;
for (i = 0; i < sources.length; i++) {
audioSource = sources[i];
sourceType = audioSource.getAttribute('type');
if (this.audio.canPlayType(sourceType)) {
canPlaySourceType = true;
}
}
if ((!canPlaySourceType) && (sources.length == 1) && (sourceType == 'audio/mpeg')) {
//The only file type provided is an MP3, and this browser can't play
//    it in HTML5 audio player.
this.player = 'yahoo';
YAHOO.MediaPlayer.onAPIReady.subscribe(this.yahooInit);
}
else if ((this.numSongs > 1) && (this.isUserAgent('firefox/3') || this.isUserAgent('Firefox/2') || this.isUserAgent('Firefox/1'))) {
//This is Firefox 3 or earlier. It can play the current file type in
// HTML5 but it chokes on playlists.
//See here: https://developer.mozilla.org/forums/viewtopic.php?f=4&t=48
//Therefore, need to use Yahoo if there is more than one track in playlist.
this.player = 'yahoo';
YAHOO.MediaPlayer.onAPIReady.subscribe(this.yahooInit);
}
else if (this.useYahoo) {
this.player = 'yahoo';
// if forcing browser to use yahoo player, be sure html5 isn't set
// to autoplay. Otherwise, it will play, and so will Yahoo!.
if (this.audio.getAttribute('autoplay') != null) {
this.audio.removeAttribute('autoplay');
}
YAHOO.MediaPlayer.onAPIReady.subscribe(this.yahooInit);
}
else {
this.player = 'html5';
if (this.audio.getAttribute('autoplay') != null) {
this.autoplaying = true;
}
}
}
else {
//this browser does not support HTML5 audio at all.
this.player = 'yahoo';
YAHOO.MediaPlayer.onAPIReady.subscribe(this.yahooInit);
}

this.logit('Using player: ' + this.player);
this.addButtons();
this.addEventListeners();

if (this.player == 'html5') {
// most browsers at this point attempt to load the <audio> media source
// if successful, the "canplay" and "canplaythrough" events are
//   triggered. Other browsers (ahem) just sit there waiting for
// further instructions...
if (this.isUserAgent('chrome') || this.isUserAgent('opera')) {
this.playAudio(); //this doesn't play the audio - it just loads the selected track
}
}
}
},

countSongs: function (playlist) {
var children, count, finished, i;
children = playlist.childNodes;
count = 0;
finished = false;
for (i = 0; i < children.length && finished == false; i++) {
if (children[i].nodeName == 'LI') count++;
}
return count;
},

isUserAgent: function (which) {
var userAgent = navigator.userAgent.toLowerCase();
if (userAgent.indexOf(which)!=-1) {
return true;
}
else {
return false;
}
},

yahooInit: function () {
//Get and set default values.
YAHOO.MediaPlayer.setVolume(this.volume);

// Add listeners for Yahoo events
YAHOO.MediaPlayer.onMediaUpdate.subscribe(this.onMediaUpdateHandler);
YAHOO.MediaPlayer.onPlaylistUpdate.subscribe(this.onPlaylistUpdateHandler);
YAHOO.MediaPlayer.onTrackStart.subscribe(this.onTrackStartHandler);
YAHOO.MediaPlayer.onTrackPause.subscribe(this.onTrackPauseHandler);
YAHOO.MediaPlayer.onProgress.subscribe(this.onProgressHandler);
YAHOO.MediaPlayer.onTrackComplete.subscribe(this.onTrackCompleteHandler);

//since parse was false initially, need to load media from playlist now.
YAHOO.MediaPlayer.addTracks(this.playlist,null,true);
},

addEventListeners: function () {
//Handle clicks on playlist (HTML5 only - Yahoo playlist handled elsewhere).
if (this.player == 'html5') {

// Save the current object context in $this for use with inner functions.
$this = this;

if (this.playlist) {
if (this.playlist.addEventListener) {
this.playlist.addEventListener('click',function (e) {
if (e.preventDefault) {
e.preventDefault();
}
else {
e.returnValue = false; //??
}
$this.userClickedLink = true;
$this.logit('<strong>You clicked a title in the playlist</strong>');
$this.songIndex = $this.getSongIndex(e);
if ($this.numSongs == 1) {
$this.playAudio();
}
else if ($this.numSongs > 1) {
$this.swapSource(e.target);
$this.updatePlaylist($this.songIndex);
}
}, false);
}
else if (this.playlist.attachEvent) {
this.playlist.attachEvent('onclick',function (e) {
e.preventDefault();
$this.userClickedLink = true;
$this.logit('<strong>You clicked a title in the playlist</strong>');
$this.songIndex = $this.getSongIndex(e);
if ($this.numSongs == 1) {
$this.playAudio();
}
else if ($this.numSongs > 1) {
$this.swapSource(e.target);
$this.updatePlaylist($this.songIndex);
}
});
}
}
}

if (this.playpause) {
//handle clicks on play/pause button (HTML5 + Yahoo)
if (this.playpause.addEventListener) {
this.playpause.addEventListener('click',function (e) {
$this.userClickedPlayPause = true;
$this.playAudio();
}, false);
}
else if (this.playpause.attachEvent) {
this.playpause.attachEvent('onclick',function (e) {
$this.userClickedPlayPause = true;
$this.playAudio();
});
}
}

if (this.seekBar) {
//handle seekBar onchange event (user slides or clicks seekBar)
//(HTML5 + Yahoo) however no known browser that is using Yahoo
//supports seekBar slider
if (this.seekBar.addEventListener) {
this.seekBar.addEventListener('change',function (e) {
$this.seekAudio($this.seekBar);
}, false);
}
else if (this.seekBar.attachEvent) {
this.seekBar.attachEvent('onclick',function (e) {
$this.seekAudio($this.seekBar);
});
}
}

if (this.seekBack) {
//handle clicks on seekBack button (HTML5 + Yahoo)
if (this.seekBack.addEventListener) {
this.seekBack.addEventListener('click',function (e) {
$this.seekAudio($this.seekBack);
}, false);
}
else if (this.seekBack.attachEvent) {
this.seekBack.attachEvent('onclick',function (e) {
$this.seekAudio($this.seekBack);
});
}
}

if (this.seekForward) {
//handle clicks on seekForward button (HTML5 + Yahoo)
if (this.seekForward.addEventListener) {
this.seekForward.addEventListener('click',function (e) {
$this.seekAudio($this.seekForward);
}, false);
}
else if (this.seekForward.attachEvent) {
this.seekForward.attachEvent('onclick',function (e) {
$this.seekAudio($this.seekForward);
});
}
}

if (this.mute) {
//handle clicks on mute button (HTML5 + Yahoo)
if (this.mute.addEventListener) {
this.mute.addEventListener('click',function (e) {
$this.toggleMute();
}, false);
}
else if (this.mute.attachEvent) {
this.mute.attachEvent('onclick',function (e) {
$this.toggleMute();
});
}
}

if (this.volumeUp) {
//handle clicks on volume Up button (HTML5 + Yahoo)
if (this.volumeUp.addEventListener) {
this.volumeUp.addEventListener('click',function (e) {
$this.updateVolume('up');
}, false);
}
else if (this.volumeUp.attachEvent) {
this.volumeUp.attachEvent('onclick',function (e) {
$this.updateVolume('up');
});
}
}

if (this.volumeDown) {
//handle clicks on volumeDown button (HTML5 + Yahoo)
if (this.volumeDown.addEventListener) {
this.volumeDown.addEventListener('click',function (e) {
$this.updateVolume('down');
}, false);
}
else if (this.volumeDown.attachEvent) {
this.volumeDown.attachEvent('onclick',function (e) {
$this.updateVolume('down');
});
}
}

//add event listeners for most media events documented here:
//https://developer.mozilla.org/En/Using_audio_and_video_in_Firefox
if (this.player == 'html5' && this.audio.addEventListener) {
this.audio.addEventListener('abort',function () {
$this.logit('abort');
}, false);

this.audio.addEventListener('canplay',function () {
$this.logit('canplay');
}, false);

this.audio.addEventListener('canplaythrough',function () {
$this.logit('canplaythrough');
$this.playAudio();
}, false);

this.audio.addEventListener('canshowcurrentframe',function () {
$this.logit('canshowcurrentframe');
}, false);

this.audio.addEventListener('dataunavailable',function () {
$this.logit('dataunavailable');
}, false);

this.audio.addEventListener('durationchange',function () {
$this.logit('durationchange');
//duration of audio has changed (probably from unknown to known value).
//Update seekbar with new value
$this.setupSeekControls();
}, false);

this.audio.addEventListener('emptied',function () {
$this.logit('emptied');
}, false);

this.audio.addEventListener('empty',function () {
$this.logit('empty');
}, false);

this.audio.addEventListener('ended',function () {
$this.logit('ended');
$this.statusBar.innerHTML = 'End of track';
//although user didn't technically click anything to trigger play event,
//it's almost as if they did, so...
$this.userClickedPlayPause = true; //??
//play the next song when the current one ends
if ($this.numSongs > 1) {
$this.playNext();
}
else {
//reset slider and/or start time to 0
if ($this.seekBar.type !== 'text') {
$this.seekBar.value = 0;
}
$this.showTime(0, $this.elapsedTimeContainer, $this.hasSlider);
//reset play button
$this.playpause.setAttribute('title','Play');
$this.playpause.style.backgroundImage='url(' + playButtonImage + ')';
}
}, false);

// Note: As of 7-25-11, error events are not being triggered.
// The HTML5 spec may have evolved since AAP 1.0. This section needs to be updated.
// Resource: http://dev.w3.org/html5/spec/Overview.html#media-element
this.audio.addEventListener('error',function () {
var errorCode, networkState, errorMsg;
$this.statusBar.innerHTML = 'Error';
errorCode = $this.audio.error.code;
networkState = $this.audio.networkState;
if (errorCode == 1) {
errorMsg = 'Waiting'; //actually, aborted I think
}
else if (errorCode == 2) {
errorMsg = 'Network error';
}
else if (errorCode == 3) {
errorMsg = 'Media decoding error';
}
else if (errorCode == 4) {
//4 = media source not supported
//Firefox 3.x returns this if it tries to load a file
//from a source that has been changed dynamically (e.g., via swapSource())
//To determine whether this is Firefox 3.x or an actual media source problem,
//need to also evaluate netWorkState
//Firefox 3.x returns a bogus netWorkState value (4), not in the HTML5 spec
if (networkState == 4) {
errorMsg = 'Firefox 3.x File Load Error! ';
}
else {
//if it's not Firefox 3.x, then it must really be a media source problem
errorMsg = 'Error reading media source';
}
}
else {
errorMsg = 'Unknown error: ' + errorCode;
}
$this.statusBar.innerHTML = errorMsg;
$this.logit(errorMsg);
}, false);

this.audio.addEventListener('loadeddata',function () {
$this.logit('loadeddata');
//meta data includes duration
$this.duration = $this.audio.duration;
if ($this.duration > 0) {
$this.showTime($this.duration, $this.durationContainer, $this.hasSlider);
$this.seekBar.setAttribute('min',0);
$this.seekBar.setAttribute('max', $this.duration);
}
}, false);

this.audio.addEventListener('loadedmetadata',function () {
$this.logit('loadedmetadata');
}, false);

this.audio.addEventListener('loadstart',function () {
$this.statusBar.innerHTML = 'Loading';
$this.logit('loadstart');
}, false);

this.audio.addEventListener('mozaudioavailable',function () {
$this.logit('mozaudioavailable');
}, false);

this.audio.addEventListener('pause',function () {
$this.logit('pause');
}, false);

this.audio.addEventListener('play',function () {
$this.logit('play');
//good time to be sure the pause button is showing
$this.playpause.setAttribute('title','Play');
}, false);

this.audio.addEventListener('ratechange',function () {
$this.logit('ratechange');
}, false);

this.audio.addEventListener('seeked',function () {
$this.logit('seeked');
}, false);

this.audio.addEventListener('seeking',function () {
$this.logit('seeking');
}, false);

this.audio.addEventListener('suspend',function () {
$this.logit('suspend');
}, false);

this.audio.addEventListener('timeupdate',function () {
//the current time on the media has been updated
//not added to event log - it happens too often
$this.updateSeekBar();
}, false);

this.audio.addEventListener('volumechange',function () {
//not added to event log - already logged via volume functions
$this.logit('volumechange event registered');
}, false);

this.audio.addEventListener('waiting',function () {
$this.logit('waiting');
$this.statusBar.innerHTML = 'Waiting';
}, false);
}
},

addButtons: function () {
var startTime;
// add HTML buttons to #controller.
this.playpause = document.createElement('input');
this.playpause.setAttribute('type','button');
this.playpause.setAttribute('id','aap-playpause');
this.playpause.setAttribute('value','');
this.playpause.setAttribute('title','Play');
this.playpause.setAttribute('accesskey','P');
this.controller.appendChild(this.playpause);

// Don't display a slider in browsers that tell you they can handle it but really can't
// Safari on iOS acknowledges seekBar.type = 'range', but displays it as a text input, not a slider
// Chrome crashes if user moves the slider too rapidly
if (!(this.isUserAgent('iphone') || this.isUserAgent('ipad') || this.isUserAgent('chrome'))) {
this.seekBar = document.createElement('input');
this.seekBar.setAttribute('type','range');
this.seekBar.setAttribute('id','aap-seekBar');
this.seekBar.setAttribute('value','0'); //???
this.seekBar.setAttribute('step','any');
this.controller.appendChild(this.seekBar);
this.hasSlider = true;
}

if (this.hasSlider) {
// Check to see if browser can really support this feature
// If browser says seekBar is type="text", we know it can't (e.g., Firefox can't)
if (this.seekBar.type == 'text') {
this.controller.removeChild(this.seekBar);
this.hasSlider = false;
}
}

//Now add rewind and fast forward buttons
//These will be hidden from users who have sliders, but visible to users who don't
//We still want them, even if hidden, so users can benefit from their accesskeys
this.seekBack = document.createElement('input');
this.seekBack.setAttribute('type','button');
this.seekBack.setAttribute('id','aap-seekBack');
this.seekBack.setAttribute('value','');
this.seekBack.setAttribute('title','Rewind ' + this.seekInterval + ' seconds');
this.seekBack.setAttribute('accesskey','R');
this.controller.appendChild(this.seekBack);
this.seekForward = document.createElement('input');
this.seekForward.setAttribute('type','button');
this.seekForward.setAttribute('id','aap-seekForward');
this.seekForward.setAttribute('value','');
this.seekForward.setAttribute('title','Forward ' + this.seekInterval + ' seconds');
this.seekForward.setAttribute('accesskey','F');
this.controller.appendChild(this.seekForward);

// initially, seekBar, seekBack, & seekForward should be disabled
// they will be enabled once the duration of the media file is known
this.toggleSeekControls('off');

if (this.hasSlider == true) {
//Note: all major browsers support accesskey on elements hidden with visibility:hidden
this.seekBack.style.visibility='hidden';
this.seekForward.style.visibility='hidden';
}
this.timer = document.createElement('span');
this.timer.setAttribute('id','aap-timer');
this.elapsedTimeContainer = document.createElement('span');
this.elapsedTimeContainer.setAttribute('id','aap-elapsedTime');
this.startTime = document.createTextNode('0:00');
this.elapsedTimeContainer.appendChild(this.startTime);

this.durationContainer = document.createElement('span');
this.durationContainer.setAttribute('id','aap-duration');
this.timer.appendChild(this.elapsedTimeContainer);
this.timer.appendChild(this.durationContainer);
this.controller.appendChild(this.timer);

if (!(this.isUserAgent('iphone') || this.isUserAgent('ipad'))) {
//iphones and ipads don't support HTML5 audio volume control
//so don't display volume-related buttons
this.mute = document.createElement('input');
this.mute.setAttribute('type','button');
this.mute.setAttribute('id','aap-mute');
this.mute.setAttribute('value','');
this.mute.setAttribute('title','Mute');
this.mute.setAttribute('accesskey','M');
this.controller.appendChild(this.mute);

this.volumeUp = document.createElement('input');
this.volumeUp.setAttribute('type','button');
this.volumeUp.setAttribute('id','aap-volumeUp');
this.volumeUp.setAttribute('value','');
this.volumeUp.setAttribute('title','Volume Up');
this.volumeUp.setAttribute('accesskey','U');
this.controller.appendChild(this.volumeUp);

this.volumeDown = document.createElement('input');
this.volumeDown.setAttribute('type','button');
this.volumeDown.setAttribute('id','aap-volumeDown');
this.volumeDown.setAttribute('value','');
this.volumeDown.setAttribute('title','Volume Down');
this.volumeDown.setAttribute('accesskey','D');
this.controller.appendChild(this.volumeDown);
}
this.audio.volume = this.volume;
this.setupSeekControls();
},

showTime: function (time, elem, hasSlider) {
var minutes, seconds, output;
//time must be passed to this function in seconds
minutes = Math.floor(time/60);
seconds = Math.floor(time % 60);
if (seconds < 10) seconds = '0' + seconds;
output = minutes + ':' + seconds;
if (elem == this.elapsedTimeContainer) {
elem.innerHTML = output;
}
else {
if (output == '0:00') {
//don't show 0:00 as duration - just empty out the div
elem.innerHTML = '';
}
else {
elem.innerHTML = ' / ' + output;
}
}
},

playAudio: function () {
var playerState;
if (this.player == 'html5') {
if (this.autoplaying) {
this.statusBar.innerHTML = 'Playing';
this.playpause.setAttribute('title','Pause');
this.playpause.style.backgroundImage='url(' + this.pauseButtonImage + ')';
this.autoplaying = false; //reset. This var is only true when page is first loaded
}
else if (this.userClickedPlayPause) {
if (this.audio.paused || this.audio.ended) {
//audio is paused. play it.
this.audio.play();
this.statusBar.innerHTML = 'Playing';
this.playpause.setAttribute('title','Pause');
this.playpause.style.backgroundImage='url(' + this.pauseButtonImage + ')';
}
else {
//audio is playing. pause it.
this.audio.pause();
this.statusBar.innerHTML = 'Paused';
this.playpause.setAttribute('title','Play');
this.playpause.style.backgroundImage='url(' + this.playButtonImage + ')';
}
this.userClickedPlayPause = false; //reset
}
else if (this.userClickedLink) {
if (this.audio.paused || this.audio.ended) {
// User clicked on a link, so they probably expect the media to play
this.audio.play();
this.statusBar.innerHTML = 'Playing';
this.playpause.setAttribute('title','Pause');
this.playpause.style.backgroundImage='url(' + this.pauseButtonImage + ')';
}
else {
// audio is playing, and will continue playing after new media is loaded
// that's done elsewhere
}
}
else {
// not sure how this function was called. Do nothing.
}
if (typeof this.songTitle == 'undefined') {
//this will only be true if songIndex == 0, and user has clicked Play button
this.updatePlaylist(0);
}
this.loading=false;
}
else { //player is yahoo
playerState = YAHOO.MediaPlayer.getPlayerState();
//values: STOPPED: 0, PAUSED: 1, PLAYING: 2,BUFFERING: 5, ENDED: 7
if (playerState == 2) { //playing
YAHOO.MediaPlayer.pause();
this.statusBar.innerHTML = 'Paused';
this.playpause.setAttribute('title','Play');
this.playpause.style.backgroundImage='url(' + playButtonImage + ')';
}
else {
if (playerState == 0) {
this.statusBar.innerHTML = 'Stopped';
}
else if (playerState == 1) {
this.statusBar.innerHTML = 'Paused';
}
else if (playerState == 5) {
this.statusBar.innerHTML = 'Buffering';
}
else if (playerState == 7) {
this.statusBar.innerHTML = 'Ended';
}
YAHOO.MediaPlayer.play();
this.statusBar.innerHTML = 'Playing';
this.playpause.setAttribute('title','Pause');
this.playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
}
}
},

playAudioOld: function () {
var playerState;
if (this.player == 'html5') {
if (this.autoplaying) {
this.statusBar.innerHTML = 'Playing';
this.playpause.setAttribute('title','Pause');
this.playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
this.autoplaying = false; //reset. This var is only true when page is first loaded
}
else if (this.audio.paused || this.audio.ended) {
//Safari 5.x (both Win & Mac) has audio.paused=true even if it hasn't played yet
//Don't play unless user initiated the play event
if (this.userClickedPlayPause) {
this.audio.play();
this.statusBar.innerHTML = 'Playing';
this.playpause.setAttribute('title','Pause');
this.playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
this.userClickedPlayPause = false; //reset
this.autoplaying = false; //another reset. This is only true when page is first loaded
}
}
else if (this.userClickedPlayPause) {
//similar to above, only pause if user requested it
//this should eliminate browsers pausing after other events
//e.g., Chrome 7.x pausing after seeked
// and Firefox 3.x mysterious pause after 3 seconds bug
this.audio.pause();
this.statusBar.innerHTML = 'Paused';
this.playpause.setAttribute('title','Play');
this.playpause.style.backgroundImage='url(' + playButtonImage + ')';
this.userClickedPlayPause = false; //reset
}
else {
// if this function was called without clicking on the play/pause button, just ignore it!
// ???
}
if (typeof this.songTitle == 'undefined') {
//this will only be true if songIndex == 0, and user has clicked Play button
this.updatePlaylist(0);
}
this.loading=false;
}
else { //player is yahoo
playerState = YAHOO.MediaPlayer.getPlayerState();
//values: STOPPED: 0, PAUSED: 1, PLAYING: 2,BUFFERING: 5, ENDED: 7
if (playerState == 2) { //playing
YAHOO.MediaPlayer.pause();
this.statusBar.innerHTML = 'Paused';
this.playpause.setAttribute('title','Play');
this.playpause.style.backgroundImage='url(' + playButtonImage + ')';
}
else {
if (playerState == 0) {
this.statusBar.innerHTML = 'Stopped';
}
else if (playerState == 1) {
this.statusBar.innerHTML = 'Paused';
}
else if (playerState == 5) {
this.statusBar.innerHTML = 'Buffering';
}
else if (playerState == 7) {
this.statusBar.innerHTML = 'Ended';
}
YAHOO.MediaPlayer.play();
this.statusBar.innerHTML = 'Playing';
this.playpause.setAttribute('title','Pause');
this.playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
}
}
},

playNext: function () {
var songObj;
//called when previous track has ended
if (this.songIndex == (this.numSongs - 1)) { //this is the lastsong
//loop around to start of playlist
this.songIndex = 0;
}
else {
this.songIndex++;
}
songObj = this.getTrack(this.songIndex);
this.swapSource(songObj);
this.audio.load(); //track will play automatically after canplaythrough event is triggered
this.updatePlaylist(this.songIndex);
},

playPrevious: function () {
var songObj;
//never called, but might be if we add a "Previous Track" button
if (this.songIndex == 0) { //this is the first song
//loop around to end of playlist
this.songIndex = this.numSongs-1;
}
else {
this.songIndex--;
}
songObj = this.getTrack(this.songIndex);
this.swapSource(songObj);
this.audio.load(); //track will play automatically after canplaythrough event is triggered
this.updatePlaylist(this.songIndex);
},

getTrack: function (songIndex) {
var children, count, i;
//returns anchor object corresponding with position songIndex in playlist
children = this.playlist.childNodes;
count = 0;
for (i = 0; i < children.length; i++) {
if (children[i].nodeName == 'LI') {
if (count == this.songIndex) {
//this is the track
if (children[i].childNodes[0].nodeName == 'A') {
return children[i].childNodes[0];
}
else if (children[i].childNodes[0].childNodes[0].nodeName == 'A') {
return children[i].childNodes[0].childNodes[0];
}
}
count++;
}
}
return false;
},

updatePlaylist: function (songIndex) {
var yahooCode, children, count, i, titleLang, anchorDepth, starPos, npTitle, originalTitle;
//updates playlist (and NowPlayingDiv) so current playing track is identified
//also updates songTitle
//Yahoo adds the following code to each item in playlist. Need to work around that.
yahooCode = '<em class="ymp-skin"></em>';
children = this.playlist.childNodes;
count = 0;
for (i = 0; i < children.length; i++) {
if (children[i].nodeName == 'LI') {
if (count == songIndex) { //this is the song
children[i].className='focus';
if (children[i].childNodes[0].nodeName == 'A') {
this.songTitle = children[i].childNodes[0].innerHTML;
titleLang = children[i].childNodes[0].getAttribute('lang');
anchorDepth = 1;
}
else {
//Yahoo player has wrapped the <a> in a <span>. <a> is one level deeper
this.songTitle = children[i].childNodes[0].childNodes[0].innerHTML;
titleLang = children[i].childNodes[0].childNodes[0].getAttribute('lang');
anchorDepth = 2;
}
//clean up songTitle if needed (remove * and/or Yahoo code)
starPos = this.songTitle.indexOf(' *');
if (starPos != -1) {
//this title already has a *, so remove it + plus everything that follows
this.songTitle = this.songTitle.substr(0,starPos);
}
else {
//this title does not yet have a star. Add one to the HTML in the playlist
if (this.songTitle.indexOf(yahooCode) != -1) {
//this title has yahooCode, so be sure to restore it after the *
if (anchorDepth == 1) {
children[i].childNodes[0].innerHTML = this.songTitle + ' *' + yahooCode;
}
else if (anchorDepth == 2) {
children[i].childNodes[0].childNodes[0].innerHTML = this.songTitle + ' *' + yahooCode;
}
}
else {
//no yahooCode, so just add a *
if (anchorDepth == 1) {
children[i].childNodes[0].innerHTML = this.songTitle + ' *';
}
else if (anchorDepth == 2) {
children[i].childNodes[0].childNodes[0].innerHTML = this.songTitle + ' *';
}
}
}
if (typeof titleLang != 'undefined') {
npTitle = '<span lang="' + titleLang + '">' + this.songTitle + '</span>';
}
else {
npTitle = this.songTitle;
}
this.nowPlayingDiv.innerHTML = '<span>Selected track:</span><br/>' + npTitle;
}
else if (count == this.prevSongIndex) { //this was the previous song
//remove * from innerHTML (if there is one)
if (typeof this.prevSongTitle != 'undefined') {
if (this.player == 'yahoo') {
originalTitle = this.prevSongTitle + ' <em class="ymp-skin"></em>';
if (children[i].childNodes[0].nodeName == 'A') {
children[i].childNodes[0].innerHTML = originalTitle;
}
else {
//Yahoo player has wrapped the <a> in a <span>. <a> is one level deeper
children[i].childNodes[0].childNodes[0].innerHTML = originalTitle;
}
}
else {
if (children[i].childNodes[0].nodeName == 'A') {
children[i].childNodes[0].innerHTML = this.prevSongTitle;
}
else {
//Yahoo player has wrapped the <a> in a <span>. <a> is one level deeper
children[i].childNodes[0].childNodes[0].innerHTML = this.prevSongTitle;
}
}
//remove .focus class for <li>
if (children[i].getAttribute('class')){
children[i].removeAttribute('class');
}
else { //if this is IE7
children[i].removeAttribute('className');
}
}
}
count++;
}
}
//prevSongId = songId;	//not needed in AAP
this.prevSongIndex = songIndex;
this.prevSongTitle = this.songTitle;
},

getSongIndex: function (e) {
var eTarget, eUrl, children, count, i, thisSongUrl;
//returns songIndex, and changes value of songTitle
eTarget = e.target; //should be a link
if (eTarget.nodeName == 'A') {
eUrl = eTarget.getAttribute('href');
children = playlist.childNodes;
count = 0;
for (i = 0; i < children.length; i++) {
if (children[i].nodeName == 'LI') {
thisSongUrl = children[i].childNodes[0].getAttribute('href');
if (thisSongUrl == eUrl) { //this is the song
this.songTitle = children[i].childNodes[0].innerHTML;
return count;
}
count++;
}
}
}
},

getSongId: function (songIndex) {
var children, count, i, j, k, grandChildren, greatGrandChildren;
//returns a link object from playlist
children = this.playlist.childNodes;
count = 0;
for (i = 0; i < children.length; i++) {
if (children[i].nodeName == 'LI') {
if (count == songIndex) {
// this is the track
if (this.player == 'html5') {
return children[i].childNodes[0].getAttribute('id');
}
else {
// Yahoo may have wrapped the <a> it inside a <span>
// (or maybe not)
grandChildren = children[i].childNodes;
if (grandChildren.length > 0) {
for ( j = 0; j < grandChildren.length; j++ ) {
if (grandChildren[j].nodeName == 'A') {
return grandChildren[j].getAttribute('id');
}
else {
greatGrandChildren = grandChildren[j].childNodes;
if (greatGrandChildren.length > 0) {
for (k = 0; k < greatGrandChildren.length; k++ ) {
if (greatGrandChildren[k].nodeName == 'A') {
return greatGrandChildren[k].getAttribute('id');
}
}
}
}
}
}
}
}
count++;
}
}
return false;
},

getSongIdFromTitle: function (targetTitle) {
var children, i, thisTitle;
// this function returns the id of a link with a matching title
children = this.playlist.childNodes;
for (i = 0; i < children.length; i++) {
if (children[i].nodeName == 'LI') {
if (children[i].childNodes[0].nodeName == 'A') {
thisTitle = children[i].childNodes[0].innerHTML;
// compare targetTitle with same-length # of characters from thisTitle
// since thisTitle may have " *" or injected Yahoo markup on the end
if (thisTitle.substr(0,targetTitle.length) == targetTitle) {
return children[i].childNodes[0].getAttribute('id');
}
}
else {
//check one layer deeper - if this is Yahoo player, link is wrapped in a <span>
if (children[i].childNodes[0].childNodes[0].nodeName == 'A') {
thisTitle = children[i].childNodes[0].childNodes[0].innerHTML;
if (thisTitle.substr(0,targetTitle.length) == targetTitle) {
return children[i].childNodes[0].childNodes[0].getAttribute('id');
}
}
}
}
}
},

getSongIndexFromYahooSongId: function (yahooSongId) {
var currentIndex, children, i, thisClass;
// Yahoo Song Id is a bit of a hack
// It's an internal id string and doesn't exist in the DOM, although it's included as part of a longer class name
// that's been added to a class attribute on an anchor tag in the playlist
// If we can find that anchor, we can get the id of that anchor
currentIndex = 0;
children = this.playlist.childNodes;
for (i = 0; i < children.length; i++) {
if (children[i].nodeName == 'LI') {
thisClass = children[i].childNodes[0].className;
if (thisClass.indexOf(yahooSongId) != -1) {
return currentIndex;
}
else {
currentIndex++;
}
}
}
return false;
},

getYahooSongIndex: function (songId) {
var children, count, i, thisClass;
//getting Yahoo Song index is a bit of a hack
//step through playlist, looking for an anchor tag with a class attribute that includes the songId string
children = this.playlist.childNodes;
count = 0;
for (i = 0; i < children.length; i++) {
if (children[i].nodeName == 'LI') {
thisClass = children[i].childNodes[0].className;
if (thisClass.indexOf(songId) != -1) {
return count;
}
count++;
}
}
return false;
},

setupSeekControls: function () {
// this function is called when player is first being built
// It is called again by Yahoo when duration is known (via onProgressHandler)
this.logit('Setting up seek controls');
// audio.duration returns a very very precice decimal value
// this is exposed by MSAA and read by NVDA, and impairs accessibility
// Plus, it isn't necessary for our purposes
// So, even if duration is known, get a fresh, usable value
if (this.player == 'html5') {
this.duration = Math.floor(this.audio.duration);
}
// If duration is unknown, can't define the slider's max attribute yet
if (isNaN(this.duration) || this.duration == 0) {
if (this.player == 'html5') {
//add an event listener so we can update slider whenever duration is known
if (this.audio.addEventListener) {
this.audio.addEventListener('loadedmetadata',function (e) {
this.duration = this.audio.duration;
if (duration > 0) {
this.showTime(this.duration,this.durationContainer,this.hasSlider);
if (this.hasSlider) {
this.seekBar.setAttribute('min',0);
this.seekBar.setAttribute('max',duration);
}
}
this.toggleSeekControls('on');
},false);
}
}
else {
// max will be set when duration is known
// min can be set now
if (this.hasSlider) {
this.seekBar.setAttribute('min',0);
}
}
}
else { //duration is known
if (this.hasSlider) {
this.seekBar.setAttribute('min',0);
this.seekBar.setAttribute('max',Math.floor(duration));
}
if (this.player == 'html5') { //duration is in seconds
this.showTime(this.duration,this.durationContainer,this.hasSlider);
}
else { //duration is in ms & must be converted
this.showTime(this.duration/1000,this.durationContainer,this.hasSlider);
}
this.toggleSeekControls('on');
}
},

seekAudio: function (element, trackPos) {
var targetTime;
//element is either seekBar, seekForward, seekBack, or 'targetTime' (Yahoo only)
//trackPos is only provided (in seconds) if element == 'targetTime'
if (this.player == 'html5') {
if (element == this.seekBar) {
targetTime = element.value;
if (targetTime < this.duration) {
this.audio.currentTime = targetTime;
}
}
else if (element == this.seekForward) {
targetTime = this.audio.currentTime + this.seekInterval;
if (targetTime < this.duration) {
this.audio.currentTime = targetTime;
}
else {
this.audio.currentTime = this.duration;
}
}
else if (element == this.seekBack) {
var targetTime = this.audio.currentTime - this.seekInterval;
if (targetTime > 0) {
this.audio.currentTime = targetTime;
}
else {
this.audio.currentTime = 0;
}
}
}
else {
//seeking only works in Yahoo player if a track has started playing
//shouldn't be possible to call this function prior to that because seek buttons are disabled
//but this if loop is here to prevent an error, just in case
if (typeof this.thisMediaObj != 'undefined') {
if (element == 'targetTime') {
targetTime = trackPos * 1000;
}
else {
trackPos = YAHOO.MediaPlayer.getTrackPosition();
if (element == this.seekBar) {
targetTime = element.value;
}
else if (element == this.seekForward) {
// NOTE: API docs at http://mediaplayer.yahoo.com/api say getTrackPosition() returns value in ms
// This is incorrect - it returns the current position in SECONDS!
// Target time, however, must be passed to play() in ms
targetTime = Math.floor(trackPos + this.seekInterval) * 1000;
// if advancing would exceed duration, stop one second short of duration
// this will allow track to end normally
if (targetTime > this.duration) {
targetTime = this.duration - 1000;
}
}
else if (element == this.seekBack) {
targetTime =  Math.floor(trackPos - this.seekInterval) * 1000;
if (targetTime < 0) {
targetTime = 0;
}
}
}
YAHOO.MediaPlayer.play(this.thisMediaObj.track,targetTime);
}
}
},

updateSeekBar: function () {
if (this.player == 'html5') {
if (this.hasSlider) { //increment it
this.seekBar.value = this.audio.currentTime;
}
//also increment counter
this.showTime(this.audio.currentTime,this.elapsedTimeContainer,this.hasSlider);
}
else {
if (this.hasSlider) { //increment it
this.seekBar.value = YAHOO.MediaPlayer.getTrackPosition() * 1000;
}
}
},

toggleMute: function () {
if (this.player == 'html5') {
if (this.audio.muted) {
this.audio.muted = false; //unmute the volume
this.mute.setAttribute('title','Mute');
this.audio.volume = this.volume;
this.logit('unmuting volume');
this.mute.style.backgroundImage='url(' + volumeButtonImage + ')';
}
else {
this.audio.muted = true; //mute the volume
this.mute.setAttribute('title','UnMute');
//don't update var volume. Keep it at previous level
//so we can return to it on unmute
this.logit('muting volume');
this.mute.style.backgroundImage='url(' + muteButtonImage + ')';
}
}
else {
if (YAHOO.MediaPlayer.getVolume() == 0) { //muted, so unmute.
this.mute.setAttribute('title','Mute');
YAHOO.MediaPlayer.setVolume(this.volume); //volume should still be at pre-muted value
this.mute.style.backgroundImage='url(' + volumeButtonImage + ')';
}
else { //not muted, so mute
this.mute.setAttribute('title','UnMute');
//don't update var volume. Keep it at previous level
//so we can return to it on unmute
YAHOO.MediaPlayer.setVolume(0);
this.mute.style.backgroundImage='url(' + muteButtonImage + ')';
}
}
},

updateVolume: function (direction) {
//volume is a range between 0 and 1
if (this.player == 'yahoo') {
this.volume = YAHOO.MediaPlayer.getVolume();
}
if (direction == 'up') {
if (this.volume < 0.9) {
if (this.volume == 0) this.toggleMute();
this.volume = Math.round((this.volume + 0.1)*10)/10;
}
else {
this.volume = 1;
}
}
else { //direction is down
if (this.volume > 0.1) {
this.volume = Math.round((this.volume - 0.1)*10)/10;
}
else {
this.volume = 0;
this.toggleMute();
}
}
if (this.player == 'html5') {
this.audio.volume = this.volume;
}
else {
YAHOO.MediaPlayer.setVolume(this.volume);
}
if (!isNaN(this.volume) && !this.audio.muted) {
this.logit('Adjusting volume to ' + volume);
}
},

setupDebug: function (debugId) {
var debugH, debugP, pStr;
this.debug = document.getElementById(debugId);
this.debug.setAttribute('role','complimentary');
this.debug.setAttribute('aria-labelledby','debug-heading');
this.debug.style.display='block';
debugH = document.createElement('h3');
debugH.setAttribute('id','aap-debug-heading');
debugH.innerHTML = 'Event Log';
debugP = document.createElement('p');
pStr = 'The following events, listed in reverse chronological order, ';
pStr += 'are provided here for testing and debugging:';
debugP.innerHTML = pStr;
this.log = document.createElement('ul');
this.log.setAttribute('id','aap-log');
this.debug.appendChild(debugH);
this.debug.appendChild(debugP);
this.debug.appendChild(this.log);
},

swapSource: function (targetLink) {
var linkFormats, formats_array, formats_count, i, source, format, mimetype, urlAttrib, specialUrl, linkHref, linkParts, parts_count, newHref, j;
linkFormats = targetLink.getAttribute('data-format');
formats_array = linkFormats.split(' ');
formats_count = formats_array.length;
if (formats_count > 0) {
//remove current source elements from audio
if (this.audio.hasChildNodes()) {
while (this.audio.childNodes.length >= 1) {
this.audio.removeChild(this.audio.firstChild);
}
}
//now step through each format and create a new <source>
for (i = 0; i < formats_count; i++) {
source = document.createElement('source');
format = formats_array[i];
if (format == 'ogg') {
mimetype = 'audio/ogg';
}
else if (format == 'oga') {
mimetype = 'audio/ogg';
}
else if (format == 'mp3') {
mimetype = 'audio/mpeg';
}
else if (format == 'm4a') {
mimetype = 'audio/mp4';
}
else if (format == 'wav') {
mimetype = 'audio/wav';
}
source.setAttribute('type',mimetype);
urlAttrib = 'data-' + format;
specialUrl = targetLink.getAttribute(urlAttrib);
if (specialUrl) {
//this track includes a special, unique URL for this file format
source.setAttribute('src',specialUrl);
}
else {
//all versions of this track have the same path and filename (minus extension)
//replace the current extension with this format
linkHref = targetLink.getAttribute('href');
linkParts = linkHref.split('.');
parts_count = linkParts.length;
newHref = linkParts[0];
for (j = 1; j < (parts_count-1); j++) {
newHref += '.' + linkParts[j];
}
newHref += '.' + format;
source.setAttribute('src',newHref);
}
this.audio.appendChild(source);
}
}
//reload audio after sources have been updated
if (this.player == 'html5') {
this.audio.load();
}
else {
this.playAudio();
}
},

logit: function (eventDescription) {
var newEvent;
if (this.useDebug) {
if (typeof this.log != 'undefined') {
newEvent = document.createElement('li');
newEvent.innerHTML = eventDescription;
if (this.numEvents == 0) {
this.log.appendChild(newEvent);
}
else {
this.log.insertBefore(newEvent, this.log.firstChild);
}
this.numEvents++;
}
}
},

str_replace: function (search, replace, subject) {
var f, r, s, ra, sa, count, i, sl, j, fl, temp, repl;
f = [].concat(search);
r = [].concat(replace);
s = subject;
ra = r instanceof Array;
sa = s instanceof Array;
s = [].concat(s);
count = 0;
for (i = 0, sl = s.length; i < sl; i++) {
if (s[i] === '') {
continue;
}
for (j = 0, fl = f.length; j < fl; j++) {
temp = s[i]+'';
repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
s[i] = (temp).split(f[j]).join(repl);
if (count && s[i] !== temp) {
count += (temp.length-s[i].length)/f[j].length;
}
}
}
return sa ? s : s[0];
},

toggleSeekControls: function (state) {
if (state == 'on') {
if (this.hasSlider) {
this.seekBar.disabled=false;
if (this.seekBar.getAttribute('class')){
this.seekBar.removeAttribute('class');
}
else { //if this is IE7
this.seekBar.removeAttribute('className');
}
}
this.seekBack.disabled=false;
this.seekForward.disabled=false;
if (this.seekBack.getAttribute('class')) {
this.seekBack.removeAttribute('class');
//we can safely assume seekForward has class="disabled" too
this.seekForward.removeAttribute('class');
}
else { //if this is IE7
this.seekBack.removeAttribute('className');
this.seekForward.removeAttribute('className');
}
}
else if (state == 'off') {
if (this.hasSlider) {
//before disabling the slider, reset its position to 0
this.seekBar.value = 0;
// also reset duration display
if (this.durationContainer) {
this.durationContainer.innerHTML = '';
}
//now disable the seekBar
this.seekBar.disabled=true;
this.seekBar.className='disabled';
}
this.seekBack.disabled=true;
this.seekBack.className='disabled';
this.seekForward.disabled=true;
this.seekForward.className='disabled';
}
},

///////////////////////////////////////////////////
// YAHOO! Functions
//////////////////////////////////////////////////

onMediaUpdateHandler: function (mediaObj) {
this.logit('onMediaUpdate');
// this called when "media object is updated with properties like title, album etc."
// however, it does *not* yet know the duration of the media
// therefore, this is a good time to reset the duration (and temp disable seek buttons)
// it will be updated via onProgressHandler as soon as Yahoo has figured it out
this.duration = 0;
this.toggleSeekControls('off');
},

onPlaylistUpdateHandler: function (playlistArray) {
this.logit('onPlaylistUpdate');
this.numSongs = YAHOO.MediaPlayer.getPlaylistCount();
this.logit('Playlist has ' + numSongs + ' tracks');
//set first track as "Now playing"
this.updatePlaylist(0);
},

onTrackStartHandler: function (mediaObj) {
var trackMeta, yahooSongId;
//track has started playing, possibly via a click in the playlist
this.logit('onTrackStart');
trackMeta = YAHOO.MediaPlayer.getMetaData();
this.songTitle = trackMeta['title'];
yahooSongId = trackMeta['id'];
//yahooSongId is an internal Yahoo-assigned ID, NOT an HTML id attribute
this.songIndex = this.getSongIndexFromYahooSongId(yahooSongId);

//if playing has resumed after a Pause, Firefox restarts at 0, rather than at current position
//to compensate for this bug, need to seek ahead
if (this.isUserAgent('firefox/3') || this.isUserAgent('Firefox/2') || this.isUserAgent('Firefox/1')) {
if (this.songId == this.prevSongId) {
if (this.pauseTime > 0) {
this.seekAudio('targetTime',this.pauseTime);
}
}
else {
//this is a new track, so reset pauseTime
this.pauseTime = 0;
}
}

//be sure playpause button is in pause state
this.logit('onTrackStart');
this.statusBar.innerHTML = 'Playing';
this.nowPlayingDiv.innerHTML = '<span>Selected Track:</span><br/>' + songTitle;
this.playpause.setAttribute('title','Pause');
this.playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
this.thisMediaObj = mediaObj;
this.updatePlaylist(this.songIndex);

//at this point, ok to enable seek buttons IF duration > 0
if (this.duration > 0) {
this.toggleSeekControls('on');
}
},

onTrackPauseHandler: function (mediaObj) {
//track has been paused, possiblly via a click on a pause button in the playlist
//be sure playpause button is in play state
this.logit('onTrackPause');
this.statusBar.innerHTML = 'Paused';
this.pauseTime = YAHOO.MediaPlayer.getTrackPosition();
this.playpause.setAttribute('title','Play');
this.playpause.style.backgroundImage='url(' + playButtonImage + ')';
},

onProgressHandler: function (progressArray) {
// according to the Yahoo API, this event is triggered when "progress is updated"
// that seems to be about once per second
//progressArray includes keys 'elapsed' and 'duration', both in ms
this.elapsedTime = progressArray['elapsed'];
if (this.elapsedTime > 0) {
this.showTime(this.elapsedTime/1000,this.elapsedTimeContainer);
if (this.duration > 0) {
this.updateSeekBar();
}
}
else {
this.showTime(0,this.elapsedTimeContainer);
}
if (isNaN(this.duration)) {
this.duration = 0;
}
if (this.duration == 0) { //check to see if Yahoo knows the duration of the media yet
this.duration = progressArray['duration']; //in ms
if (this.duration > 0) {
this.logit('Media duration: ' + duration + ' ms');
this.showTime(this.duration/1000,this.durationContainer);
// ok to enable seekBar, seekBack and seekForward buttons
// now that we have duration.
this.setupSeekControls();
}
else {
this.showTime(0,this.durationContainer);
}
}
},

onTrackCompleteHandler: function (mediaObj) {
this.logit('onTrackComplete');
this.statusBar.innerHTML = 'End of track';
// Yahoo player advances to the next track automatically
// but does not restart at beginning after last track is played
// This seems ok.
// If I decide to change it, this would be the place to do so
},

getLinksToAudio: function () {
var allLinks, links;
allLinks = document.getElementsByTagName('a');
links = new Array();
for (i = 0; i < allLinks.length; i++) {
if (allLinks[i].className=='aap-link') {
//this is an AAPP link
links.push(allLinks[i]);
}
}
return links;
},

getSupportedTypes: function () {
return new Array('mp3','ogg','wav','m4a','webm');
},

playNewAudio: function (trackUrl,trackTitle) {
//play audio track that is not part of the original playlist
this.nowPlayingDiv.innerHTML = '<span>Selected Track:</span><br/>' + trackTitle;
}
};
