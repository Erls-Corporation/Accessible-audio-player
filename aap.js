/* Javascript for Accessible Audio Player (AAP)
http://www.terrillthompson.com/music/aap
Author: Terrill Thompson
Version: 2.1.3
Last update: September 10, 2011

Uses Yahoo! Media Player as fallback. API docs are here: 
http://mediaplayer.yahoo.com/api/

*/

////////////////////////////////////////
//
// user-defined global variables
//
////////////////////////////////////////

// useDebug - set to true to display event log, otherwise set to false
var useDebug = false; 

// useYahoo - set to true to always use the fallback Yahoo Media Player (RECOMMENDED FOR TESTING ONLY)
var useYahoo = false; 

////////////////////////////////////////
//
// end user-defined global variables
//
////////////////////////////////////////

if (useDebug) { 
	var debug;
	var log;
	var numEvents = 0;
}
	
var player; //will be programatically set either to "html5" or "yahoo"

//id's of various components 
var audioId;
var playlistId;
var nowPlayingId;
var controllerId;
var statusBarId;

var audio;
var controller;
var loading = false;
var playpause;
var seekBar;
var seekBack;
var seekForward;
var seekInterval = 15; //number of seconds to seek forward or back
var timer;
var elapsedTimeContainer;
var elapsedTime;
var duration;
var durationContainer;
var pauseTime = 0;
var mute;
var volumeUp;
var volumeDown;
var hasSlider; 
var numSongs; 
var songIndex = 0;
var prevSongIndex = 0;
var songId;
var songTitle;
//var prevSongId;
var prevSongId;
var prevSongTitle;
var playlist;
var nowPlayingDiv;
var statusBar;
var userClickedPlayPause = false;
var userClickedLink = false;
var autoplaying = false;

var playButtonImage = 'images/audio_play.gif';
var pauseButtonImage = 'images/audio_pause.gif';
var volumeButtonImage = 'images/audio_volume.gif';
var muteButtonImage = 'images/audio_mute.gif';
	
//vars used by Yahoo
var thisMediaObj;
	
function aap_init() { 
	var audioId = 'aap-audio'; //id of the <audio> element
	var playlistId = 'aap-playlist'; //id of the playlist <ul> 
	var nowPlayingId = 'aap-now-playing'; //id of the Now Playing <div>
	var controllerId = 'aap-controller'; //id of the <div> where controls will be written
	var statusBarId = 'aap-status-bar'; //id of the <div> where status messages are written
	var debugId = 'aap-debug'; //id of the <div> where debug messages are written
	if (useDebug) setupDebug(debugId); 

	audio = document.getElementById(audioId);

	if (audio) { 

		controller = document.getElementById(controllerId);
		nowPlayingDiv = document.getElementById(nowPlayingId);
		playlist = document.getElementById(playlistId);
		statusBar = document.getElementById(statusBarId);
		numSongs = countSongs(playlist);
	
		if (audio.canPlayType) { //this browser suports HTML5 audio
			// check canPlayType for all audio sources
			var sources = audio.getElementsByTagName('source');
			var canPlaySourceType = false;
			for (var i=0; i<sources.length; i++) { 
				var audioSource = sources[i];
				var sourceType = audioSource.getAttribute('type');
				if (audio.canPlayType(sourceType)) canPlaySourceType = true; 
			}
			if ((!canPlaySourceType) && (sources.length == 1) && (sourceType == 'audio/mpeg')) { 
				//the only file type provided is an MP3, and this browser can't play it in HTML5 audio player
				player = 'yahoo';
				YAHOO.MediaPlayer.onAPIReady.subscribe(yahooInit);		
			}
			else if ((numSongs > 1) && (isUserAgent('firefox/3') || isUserAgent('Firefox/2') || isUserAgent('Firefox/1'))) { 
				//This is Firefox 3 or earlier. It can play the current file type in HTML5 but it chokes on playlists
				//See here: https://developer.mozilla.org/forums/viewtopic.php?f=4&t=48
				//Therefore, need to use Yahoo if there is more than one track in playlist
				player = 'yahoo';
				YAHOO.MediaPlayer.onAPIReady.subscribe(yahooInit);		
			}
			else if (useYahoo) { 
				player = 'yahoo';
				// if forcing browser to use yahoo player, be sure html5 isn't set to autoplay 
				// otherwise, it will play, and so will Yahoo!
				if (audio.getAttribute('autoplay') != null) { 
					audio.removeAttribute('autoplay');
				}			
				YAHOO.MediaPlayer.onAPIReady.subscribe(yahooInit);
			}
			else { 
				player = 'html5';
				if (audio.getAttribute('autoplay') != null) { 
					autoplaying = true;
				}			
			}
		}
		else { //this browser does not support HTML5 audio at all
			player = 'yahoo';
			YAHOO.MediaPlayer.onAPIReady.subscribe(yahooInit);		
		}
		if (useDebug) logit('Using player: ' + player);

		addButtons();
		addEventListeners();
	
		if (player == 'html5') { 
			// most browsers at this point attempt to load the <audio> media source 
			// if successful, the "canplay" and "canplaythrough" events are triggered 
			// other browsers (ahem) just sit there waiting for further instructions... 
			if (isUserAgent('chrome') || isUserAgent('opera')) { 
				playAudio(); //this doesn't play the audio - it just loads the selected track
			}
		}
	}
	else { 
		//there is no audio tag on this page. Do nothing.
	}
}

function isUserAgent(which) { 
	var userAgent = navigator.userAgent.toLowerCase();
	if (userAgent.indexOf(which)!=-1) return true; 
	else return false;
}

function yahooInit() { 

	//get and set default values 
	YAHOO.MediaPlayer.setVolume(volume);

	// Add listeners for Yahoo events
	YAHOO.MediaPlayer.onMediaUpdate.subscribe(onMediaUpdateHandler);	
	YAHOO.MediaPlayer.onPlaylistUpdate.subscribe(onPlaylistUpdateHandler);
	YAHOO.MediaPlayer.onTrackStart.subscribe(onTrackStartHandler);
	YAHOO.MediaPlayer.onTrackPause.subscribe(onTrackPauseHandler);
	YAHOO.MediaPlayer.onProgress.subscribe(onProgressHandler);
	YAHOO.MediaPlayer.onTrackComplete.subscribe(onTrackCompleteHandler);

	//since parse was false initially, need to load media from playlist now
	YAHOO.MediaPlayer.addTracks(playlist,null,true);
}

function addEventListeners() { 

	//handle clicks on playlist (HTML5 only - Yahoo playlist handled elsewhere)
	if (player == 'html5') { 
	
		if (playlist) { 
			if (playlist.addEventListener) { 
				playlist.addEventListener('click',function (e) { 
					if (e.preventDefault) e.preventDefault();
					else e.returnValue = false; //??
					userClickedLink = true; 
					if (useDebug) { 
						logit('<strong>You clicked a title in the playlist</strong>');
					}
					songIndex = getSongIndex(e);
					if (numSongs == 1) playAudio();
					else if (numSongs > 1) { 
						swapSource(e.target);
						updatePlaylist(songIndex);
					}
				}, false);
			}
			else if (playlist.attachEvent) { 
				playlist.attachEvent('onclick',function (e) { 
					e.preventDefault();
					userClickedLink = true; 
					if (useDebug) { 
						logit('<strong>You clicked a title in the playlist</strong>');
					}
					songIndex = getSongIndex(e);
					if (numSongs == 1) playAudio();
					else if (numSongs > 1) { 
						swapSource(e.target);
						updatePlaylist(songIndex);
					}
				});
			}
		}
	}

	if (playpause) { 
		//handle clicks on play/pause button (HTML5 + Yahoo)
		if (playpause.addEventListener) { 
			playpause.addEventListener('click',function (e) { 
				userClickedPlayPause = true;
				playAudio();
			}, false);
		}
		else if (playpause.attachEvent) { 
			playpause.attachEvent('onclick',function (e) { 
				userClickedPlayPause = true;
				playAudio();
			});
		}
	}
	
	if (seekBar) { 
		//handle seekBar onchange event (user slides or clicks seekBar)
		//(HTML5 + Yahoo) however no known browser that is using Yahoo 
		//supports seekBar slider 
		if (seekBar.addEventListener) { 
			seekBar.addEventListener('change',function (e) { 
				seekAudio(seekBar);
			}, false);
		}
		else if (seekBar.attachEvent) { 
			seekBar.attachEvent('onclick',function (e) { 
				seekAudio(seekBar);
			});
		}
	}

	if (seekBack) { 	
		//handle clicks on seekBack button (HTML5 + Yahoo)
		if (seekBack.addEventListener) { 
			seekBack.addEventListener('click',function (e) { 
				seekAudio(seekBack);
			}, false);
		}
		else if (seekBack.attachEvent) { 
			seekBack.attachEvent('onclick',function (e) { 
				seekAudio(seekBack);
			});
		}
	}
	
	if (seekForward) { 
		//handle clicks on seekForward button (HTML5 + Yahoo)
		if (seekForward.addEventListener) { 
			seekForward.addEventListener('click',function (e) { 
				seekAudio(seekForward);
			}, false);
		}
		else if (seekForward.attachEvent) { 
			seekForward.attachEvent('onclick',function (e) { 
				seekAudio(seekForward);
			});
		}
	}

	if (mute) { 
		//handle clicks on mute button (HTML5 + Yahoo)
		if (mute.addEventListener) { 
			mute.addEventListener('click',function (e) { 
				toggleMute();
			}, false);
		}
		else if (mute.attachEvent) { 
			mute.attachEvent('onclick',function (e) { 
				toggleMute();
			});
		}
	}
	
	if (volumeUp) { 	
		//handle clicks on volume Up button (HTML5 + Yahoo)
		if (volumeUp.addEventListener) { 
			volumeUp.addEventListener('click',function (e) { 
				updateVolume('up');
			}, false);
		}
		else if (volumeUp.attachEvent) { 
			volumeUp.attachEvent('onclick',function (e) { 
				updateVolume('up');
			});
		}
	}
	
	if (volumeDown) { 
		//handle clicks on volumeDown button (HTML5 + Yahoo)
		if (volumeDown.addEventListener) { 
			volumeDown.addEventListener('click',function (e) { 
				updateVolume('down');
			}, false);
		}
		else if (volumeDown.attachEvent) { 
			volumeDown.attachEvent('onclick',function (e) { 
				updateVolume('down');
			});
		}
	}
		
	//add event listeners for most media events documented here: 
	//https://developer.mozilla.org/En/Using_audio_and_video_in_Firefox
	if (player == 'html5' && audio.addEventListener) { 
	
		audio.addEventListener('abort',function () { 
			if (useDebug) logit('abort');
		}, false);
		
		audio.addEventListener('canplay',function () { 
			if (useDebug) logit('canplay');
		}, false);

		audio.addEventListener('canplaythrough',function () { 
			if (useDebug) logit('canplaythrough');
			playAudio();  
		}, false);

		audio.addEventListener('canshowcurrentframe',function () { 
			if (useDebug) logit('canshowcurrentframe');
		}, false);

		audio.addEventListener('dataunavailable',function () { 
			if (useDebug) logit('dataunavailable');
		}, false);
		
		audio.addEventListener('durationchange',function () { 
			if (useDebug) logit('durationchange');
			//duration of audio has changed (probably from unknown to known value). 
			//Update seekbar with new value
			setupSeekControls();
		}, false);

		audio.addEventListener('emptied',function () { 
			if (useDebug) logit('emptied');
		}, false);

		audio.addEventListener('empty',function () { 
			if (useDebug) logit('empty');
		}, false);

		audio.addEventListener('ended',function () { 
			if (useDebug) logit('ended');
			statusBar.innerHTML = 'End of track';
			//although user didn't technically click anything to trigger play event, 
			//it's almost as if they did, so... 
			userClickedPlayPause = true; //??
			//play the next song when the current one ends
			if (numSongs > 1) playNext();
			else { 
				//reset slider and/or start time to 0
				if (seekBar.type !== 'text') { 
					seekBar.value = 0;
				}
				showTime(0,elapsedTimeContainer,hasSlider);
				//reset play button 
				playpause.setAttribute('title','Play');
				playpause.style.backgroundImage='url(' + playButtonImage + ')';						
			}
		}, false);

		// Note: As of 7-25-11, error events are not being triggered.
		// The HTML5 spec may have evolved since AAP 1.0. This section needs to be updated.  
		// Resource: http://dev.w3.org/html5/spec/Overview.html#media-element
		audio.addEventListener('error',function () { 
			statusBar.innerHTML = 'Error';		
			var errorCode = audio.error.code;
			var networkState = audio.networkState;
			if (errorCode == 1) var errorMsg = 'Waiting'; //actually, aborted I think 
			else if (errorCode == 2) var errorMsg = 'Network error';
			else if (errorCode == 3) var errorMsg = 'Media decoding error';
			else if (errorCode == 4) { 
				//4 = media source not supported 
				//Firefix 3.x returns this if it tries to load a file 
				//from a source that has been changed dynamically (e.g., via swapSource()) 
				//To determine whether this is Firefox 3.x or an actual media source problem,
				//need to also evaluate netWorkState 
				//Firefox 3.x returns a bogus netWorkState value (4), not in the HTML5 spec
				if (networkState == 4) {
					var errorMsg = 'Firefox 3.x File Load Error! ';	
				}
				else { 
					//if it's not Firefox 3.x, then it must really be a media source problem 
					var errorMsg = 'Error reading media source';
				}
			}
			else var errorMsg = 'Unknown error: ' + errorCode;
			statusBar.innerHTML = errorMsg;
			if (useDebug) logit(errorMsg);
		}, false);

		audio.addEventListener('loadeddata',function () { 
			if (useDebug) logit('loadeddata');
			//meta data includes duration 
			duration = audio.duration;
			if (duration > 0) {
				showTime(duration,durationContainer,hasSlider);
				seekBar.setAttribute('min',0);
				seekBar.setAttribute('max',duration);
			}
		}, false);

		audio.addEventListener('loadedmetadata',function () { 
			if (useDebug) logit('loadedmetadata');
		}, false);

		audio.addEventListener('loadstart',function () { 
			statusBar.innerHTML = 'Loading';
			if (useDebug) logit('loadstart');
		}, false);

		audio.addEventListener('mozaudioavailable',function () { 
			if (useDebug) logit('mozaudioavailable');
		}, false);

		audio.addEventListener('pause',function () { 
			if (useDebug) logit('pause');
		}, false);

		audio.addEventListener('play',function () { 
			if (useDebug) logit('play');
			//good time to be sure the pause button is showing
			playpause.setAttribute('title','Play');
		}, false);

		audio.addEventListener('ratechange',function () { 
			if (useDebug) logit('ratechange');
		}, false);

		audio.addEventListener('seeked',function () { 
			if (useDebug) logit('seeked');
		}, false);

		audio.addEventListener('seeking',function () { 
			if (useDebug) logit('seeking');
		}, false);

		audio.addEventListener('suspend',function () { 
			if (useDebug) logit('suspend');
		}, false);

		audio.addEventListener('timeupdate',function () { 
			//the current time on the media has been updated
			//not added to event log - it happens too often
			updateSeekBar();			
		}, false);

		audio.addEventListener('volumechange',function () { 
			//not added to event log - already logged via volume functions
			if (useDebug) logit('volumechange event registered');
		}, false);

		audio.addEventListener('waiting',function () { 
			if (useDebug) logit('waiting');
			statusBar.innerHTML = 'Waiting';
		}, false);	
	}
}

function addButtons() { 
	
	// add HTML buttons to #controller
	playpause = document.createElement('input');
	playpause.setAttribute('type','button');
	playpause.setAttribute('id','aap-playpause');	
	playpause.setAttribute('value','');
	playpause.setAttribute('title','Play');
	playpause.setAttribute('accesskey','P');
	controller.appendChild(playpause);

	// Don't display a slider in browsers that tell you they can handle it but really can't
	// Safari on iOS acknowledges seekBar.type = 'range', but displays it as a text input, not a slider
	// Chrome crashes if user moves the slider too rapidly
	if (!(isUserAgent('iphone') || isUserAgent('ipad') || isUserAgent('chrome'))) { 	
		seekBar = document.createElement('input');
		seekBar.setAttribute('type','range');
		seekBar.setAttribute('id','aap-seekBar');	
		seekBar.setAttribute('value','0'); //???
		seekBar.setAttribute('step','any');
		controller.appendChild(seekBar);
		hasSlider = true;
	}
		
	if (hasSlider) { 
		// Check to see if browser can really support this feature 
		// If browser says seekBar is type="text", we know it can't (e.g., Firefox can't) 
		if (seekBar.type == 'text') { 
			controller.removeChild(seekBar); 
			hasSlider = false;
		}
	}
		
	//Now add rewind and fast forward buttons  
	//These will be hidden from users who have sliders, but visible to users who don't
	//We still want them, even if hidden, so users can benefit from their accesskeys
	seekBack = document.createElement('input');
	seekBack.setAttribute('type','button');
	seekBack.setAttribute('id','aap-seekBack');	
	seekBack.setAttribute('value','');
	seekBack.setAttribute('title','Rewind ' + seekInterval + ' seconds');
	seekBack.setAttribute('accesskey','R');
	controller.appendChild(seekBack);
	seekForward = document.createElement('input');
	seekForward.setAttribute('type','button');
	seekForward.setAttribute('id','aap-seekForward');
	seekForward.setAttribute('value','');
	seekForward.setAttribute('title','Forward ' + seekInterval + ' seconds');
	seekForward.setAttribute('accesskey','F');
	controller.appendChild(seekForward);
	
	// initially, seekBar, seekBack, & seekForward should be disabled
	// they will be enabled once the duration of the media file is known 
	toggleSeekControls('off');

	if (hasSlider == true) { 
		//Note: all major browsers support accesskey on elements hidden with visibility:hidden
		seekBack.style.visibility='hidden';
		seekForward.style.visibility='hidden';
	}
	timer = document.createElement('span');
	timer.setAttribute('id','aap-timer');			
	elapsedTimeContainer = document.createElement('span');
	elapsedTimeContainer.setAttribute('id','aap-elapsedTime');	
	var startTime = document.createTextNode('0:00');
	elapsedTimeContainer.appendChild(startTime);
	
	durationContainer = document.createElement('span');
	durationContainer.setAttribute('id','aap-duration');	
	timer.appendChild(elapsedTimeContainer);
	timer.appendChild(durationContainer);
	controller.appendChild(timer);

	if (!(isUserAgent('iphone') || isUserAgent('ipad'))) { 
		//iphones and ipads don't support HTML5 audio volume control 
		//so don't display volume-related buttons 
		mute = document.createElement('input');
		mute.setAttribute('type','button');
		mute.setAttribute('id','aap-mute');
		mute.setAttribute('value','');
		mute.setAttribute('title','Mute');		
		mute.setAttribute('accesskey','M');
		controller.appendChild(mute);

		volumeUp = document.createElement('input');
		volumeUp.setAttribute('type','button');
		volumeUp.setAttribute('id','aap-volumeUp');
		volumeUp.setAttribute('value','');
		volumeUp.setAttribute('title','Volume Up');		
		volumeUp.setAttribute('accesskey','U');
		controller.appendChild(volumeUp);

		volumeDown = document.createElement('input');
		volumeDown.setAttribute('type','button');
		volumeDown.setAttribute('id','aap-volumeDown');		
		volumeDown.setAttribute('value','');
		volumeDown.setAttribute('title','Volume Down');		
		volumeDown.setAttribute('accesskey','D');
		controller.appendChild(volumeDown);	
	}	
	audio.volume = volume;
	setupSeekControls(); 
}

function showTime(time,elem,hasSlider) { 
	//time must be passed to this function in seconds
	var minutes = Math.floor(time/60);  
	var seconds = Math.floor(time % 60); 
	if (seconds < 10) seconds = '0' + seconds;
	var output = minutes + ':' + seconds; 
	if (elem == elapsedTimeContainer) elem.innerHTML = output;
	else { 
		if (output == '0:00') { 
			//don't show 0:00 as duration - just empty out the div
			elem.innerHTML = '';
		}
		else {
			elem.innerHTML = ' / ' + output;
		}
	}
}

function playAudio() { 
	if (player == 'html5') { 
		if (autoplaying) { 
			statusBar.innerHTML = 'Playing';
			playpause.setAttribute('title','Pause');
			playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
			autoplaying = false; //reset. This var is only true when page is first loaded
		}		
		else if (userClickedPlayPause) { 
			if (audio.paused || audio.ended) { 
				//audio is paused. play it. 
				audio.play(); 
				statusBar.innerHTML = 'Playing';
				playpause.setAttribute('title','Pause');
				playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
			}
			else { 
				//audio is playing. pause it.
				audio.pause();
				statusBar.innerHTML = 'Paused';
				playpause.setAttribute('title','Play');
				playpause.style.backgroundImage='url(' + playButtonImage + ')';
			}
			userClickedPlayPause = false; //reset
		}
		else if (userClickedLink) { 
			if (audio.paused || audio.ended) { 
				// User clicked on a link, so they probably expect the media to play 
				audio.play(); 
				statusBar.innerHTML = 'Playing';
				playpause.setAttribute('title','Pause');
				playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
			}
			else { 
				// audio is playing, and will continue playing after new media is loaded
				// that's done elsewhere 
			}			
		}
		else { 
			// not sure how this function was called. Do nothing. 
		}
		if (typeof songTitle == 'undefined') { 
			//this will only be true if songIndex == 0, and user has clicked Play button
			updatePlaylist(0);
		}
		loading=false;
	}
	else { //player is yahoo
		playerState = YAHOO.MediaPlayer.getPlayerState();
		//values: STOPPED: 0, PAUSED: 1, PLAYING: 2,BUFFERING: 5, ENDED: 7
		if (playerState == 2) { //playing 
			YAHOO.MediaPlayer.pause();
			statusBar.innerHTML = 'Paused';
			playpause.setAttribute('title','Play');
			playpause.style.backgroundImage='url(' + playButtonImage + ')';
		}
		else { 
			if (playerState == 0) statusBar.innerHTML = 'Stopped';
			else if (playerState == 1) statusBar.innerHTML = 'Paused';
			else if (playerState == 5) statusBar.innerHTML = 'Buffering';
			else if (playerState == 7) statusBar.innerHTML = 'Ended';
			YAHOO.MediaPlayer.play();
			statusBar.innerHTML = 'Playing';
			playpause.setAttribute('title','Pause');
			playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
		}				
	}
}

function playAudioOld() { 
	if (player == 'html5') { 
		if (autoplaying) { 
			statusBar.innerHTML = 'Playing';
			playpause.setAttribute('title','Pause');
			playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
			autoplaying = false; //reset. This var is only true when page is first loaded
		}		
		else if (audio.paused || audio.ended) { 
			//Safari 5.x (both Win & Mac) has audio.paused=true even if it hasn't played yet
			//Don't play unless user initiated the play event
			if (userClickedPlayPause) { 
				audio.play(); 
				statusBar.innerHTML = 'Playing';
				playpause.setAttribute('title','Pause');
				playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
				userClickedPlayPause = false; //reset
				autoplaying = false; //another reset. This is only true when page is first loaded
			}
		}
		else if (userClickedPlayPause) { 
			//similar to above, only pause if user requested it
			//this should eliminate browsers pausing after other events
			//e.g., Chrome 7.x pausing after seeked
			// and Firefox 3.x mysterious pause after 3 seconds bug
			audio.pause();
			statusBar.innerHTML = 'Paused';
			playpause.setAttribute('title','Play');
			playpause.style.backgroundImage='url(' + playButtonImage + ')';
			userClickedPlayPause = false; //reset
		}
		else { 
			// if this function was called without clicking on the play/pause button, just ignore it!
			// ???
		}
		if (typeof songTitle == 'undefined') { 
			//this will only be true if songIndex == 0, and user has clicked Play button
			updatePlaylist(0);
		}
		loading=false;
	}
	else { //player is yahoo
		playerState = YAHOO.MediaPlayer.getPlayerState();
		//values: STOPPED: 0, PAUSED: 1, PLAYING: 2,BUFFERING: 5, ENDED: 7
		if (playerState == 2) { //playing 
			YAHOO.MediaPlayer.pause();
			statusBar.innerHTML = 'Paused';
			playpause.setAttribute('title','Play');
			playpause.style.backgroundImage='url(' + playButtonImage + ')';
		}
		else { 
			if (playerState == 0) statusBar.innerHTML = 'Stopped';
			else if (playerState == 1) statusBar.innerHTML = 'Paused';
			else if (playerState == 5) statusBar.innerHTML = 'Buffering';
			else if (playerState == 7) statusBar.innerHTML = 'Ended';
			YAHOO.MediaPlayer.play();
			statusBar.innerHTML = 'Playing';
			playpause.setAttribute('title','Pause');
			playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
		}				
	}
}

function playNext() {
	//called when previous track has ended
	if (songIndex == (numSongs - 1)) { //this is the lastsong
		//loop around to start of playlist
		songIndex = 0;
	}
	else songIndex++;
	var songObj = getTrack(songIndex);
	swapSource(songObj);
	audio.load(); //track will play automatically after canplaythrough event is triggered
	updatePlaylist(songIndex);
}

function playPrevious() { 
	//never called, but might be if we add a "Previous Track" button
	if (songIndex == 0) { //this is the first song
		//loop around to end of playlist
		songIndex = numSongs-1;
	}
	else songIndex--;
	var songObj = getTrack(songIndex);
	swapSource(songObj);
	audio.load(); //track will play automatically after canplaythrough event is triggered
	updatePlaylist(songIndex);
}

function getTrack(songIndex) { 
	//returns anchor object corresponding with position songIndex in playlist
	var children = playlist.childNodes;
	var count = 0;
	for (var i=0; i < children.length; i++) { 
		if (children[i].nodeName == 'LI') { 		
			if (count == songIndex) { 
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
}

function updatePlaylist(songIndex) { 
	//updates playlist (and NowPlayingDiv) so current playing track is identified
	//also updates global var songTitle
	//Yahoo adds the following code to each item in playlist. Need to work around that.
	var yahooCode = '<em class="ymp-skin"></em>';
	var children = playlist.childNodes;
	var count = 0;
	for (var i=0; i < children.length; i++) { 
		if (children[i].nodeName == 'LI') { 
			if (count == songIndex) { //this is the song			
				children[i].className='focus'; 
				if (children[i].childNodes[0].nodeName == 'A') { 
					songTitle = children[i].childNodes[0].innerHTML;
					var titleLang = children[i].childNodes[0].getAttribute('lang');
					var anchorDepth = 1;
				}
				else { 
					//Yahoo player has wrapped the <a> in a <span>. <a> is one level deeper
					songTitle = children[i].childNodes[0].childNodes[0].innerHTML;
					var titleLang = children[i].childNodes[0].childNodes[0].getAttribute('lang');
					var anchorDepth = 2;
				}
				//clean up global var songTitle if needed (remove * and/or Yahoo code)
				var starPos = songTitle.indexOf(' *');				
				if (starPos != -1) { 
					//this title already has a *, so remove it + plus everything that follows
					songTitle = songTitle.substr(0,starPos);
				}
				else { 				
					//this title does not yet have a star. Add one to the HTML in the playlist
					if (songTitle.indexOf(yahooCode) != -1) {
						//this title has yahooCode, so be sure to restore it after the *
						if (anchorDepth == 1) { 
							children[i].childNodes[0].innerHTML = songTitle + ' *' + yahooCode;
						}
						else if (anchorDepth == 2) { 
							children[i].childNodes[0].childNodes[0].innerHTML = songTitle + ' *' + yahooCode;
						}
					}
					else { 
						//no yahooCode, so just add a *
						if (anchorDepth == 1) { 
							children[i].childNodes[0].innerHTML = songTitle + ' *';
						}
						else if (anchorDepth == 2) { 
							children[i].childNodes[0].childNodes[0].innerHTML = songTitle + ' *';
						}
					}
				}
				if (typeof titleLang != 'undefined') {
					var npTitle = '<span lang="' + titleLang + '">' + songTitle + '</span>';
				}
				else { 
					var npTitle = songTitle;
				}
				nowPlayingDiv.innerHTML = '<span>Selected track:</span><br/>' + npTitle;
			}
			else if (count == prevSongIndex) { //this was the previous song
				//remove * from innerHTML (if there is one)				
				if (typeof prevSongTitle != 'undefined') {
					if (player == 'yahoo') { 
						var originalTitle = prevSongTitle + ' <em class="ymp-skin"></em>'; 
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
							children[i].childNodes[0].innerHTML = prevSongTitle;
						}
						else { 
							//Yahoo player has wrapped the <a> in a <span>. <a> is one level deeper
							children[i].childNodes[0].childNodes[0].innerHTML = prevSongTitle;
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
	prevSongIndex = songIndex;
	prevSongTitle = songTitle;
}

function countSongs(playlist) { 
	var children = playlist.childNodes;
	var count = 0;
	var finished = false;
	for (var i=0; i < children.length && finished == false; i++) { 
		if (children[i].nodeName == 'LI') count++;
	}
	return count;
}

function getSongIndex(e) { 
	//returns songIndex, and changes value of global var songTitle
	var eTarget = e.target; //should be a link 
	if (eTarget.nodeName == 'A') { 
		var eUrl = eTarget.getAttribute('href');
		var children = playlist.childNodes;
		var count = 0;
		for (var i=0; i < children.length; i++) { 
			if (children[i].nodeName == 'LI') { 
				var thisSongUrl = children[i].childNodes[0].getAttribute('href');
				if (thisSongUrl == eUrl) { //this is the song
					songTitle = children[i].childNodes[0].innerHTML;
					return count;
				}
				count++;
			}
		}
	}
}

function getSongId(songIndex) { 
	//returns a link object from playlist
	var children = playlist.childNodes;
	var count = 0;
	for (var i=0; i < children.length; i++) { 
		if (children[i].nodeName == 'LI') {		
			if (count == songIndex) { 
				// this is the track 
				if (player == 'html5') { 
					return children[i].childNodes[0].getAttribute('id');
				}
				else { 				
					// Yahoo may have wrapped the <a> it inside a <span> 
					// (or maybe not)
					var grandChildren = children[i].childNodes;
					if (grandChildren.length > 0) { 
						for ( var j=0; j < grandChildren.length; j++ ) { 
							if (grandChildren[j].nodeName == 'A') { 
								return grandChildren[j].getAttribute('id');
							}
							else { 
								var greatGrandChildren = grandChildren[j].childNodes;
								if (greatGrandChildren.length > 0) { 
									for ( var k=0; k < greatGrandChildren.length; k++ ) { 
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
}

function getSongIdFromTitle(targetTitle) { 
	// this function returns the id of a link with a matching title
	var children = playlist.childNodes;	
	for (var i=0; i < children.length; i++) { 
		if (children[i].nodeName == 'LI') { 
			if (children[i].childNodes[0].nodeName == 'A') { 
				var thisTitle = children[i].childNodes[0].innerHTML;
				// compare targetTitle with same-length # of characters from thisTitle 
				// since thisTitle may have " *" or injected Yahoo markup on the end
				if (thisTitle.substr(0,targetTitle.length) == targetTitle) { 
					return children[i].childNodes[0].getAttribute('id');
				}
			}
			else { 
				//check one layer deeper - if this is Yahoo player, link is wrapped in a <span>
				if (children[i].childNodes[0].childNodes[0].nodeName == 'A') { 
					var thisTitle = children[i].childNodes[0].childNodes[0].innerHTML;
					if (thisTitle.substr(0,targetTitle.length) == targetTitle) { 
						return children[i].childNodes[0].childNodes[0].getAttribute('id');
					}
				}
			}
		}
	}
}

function getSongIndexFromYahooSongId(yahooSongId) { 
	// Yahoo Song Id is a bit of a hack 
	// It's an internal id string and doesn't exist in the DOM, although it's included as part of a longer class name 
	// that's been added to a class attribute on an anchor tag in the playlist
	// If we can find that anchor, we can get the id of that anchor
	var currentIndex = 0;
	var children = playlist.childNodes; 
	for (var i=0; i < children.length; i++) { 
		if (children[i].nodeName == 'LI') { 
			var thisClass = children[i].childNodes[0].className;
			if (thisClass.indexOf(yahooSongId) != -1) { 
				return currentIndex; 
			}
			else { 
				currentIndex++;
			}
		}
	}
	return false;
}

function getYahooSongIndex(songId) { 
	//getting Yahoo Song index is a bit of a hack 
	//step through playlist, looking for an anchor tag with a class attribute that includes the songId string
	var children = playlist.childNodes; 
	var count = 0;
	for (var i=0; i < children.length; i++) { 
		if (children[i].nodeName == 'LI') { 
			var thisClass = children[i].childNodes[0].className;
			if (thisClass.indexOf(songId) != -1) { 
				return count;
			}
			count++;
		}
	}
	return false;
}

function setupSeekControls() { 
	// this function is called when player is first being built
	// It is called again by Yahoo when duration is known (via onProgressHandler)
	if (useDebug) logit('Setting up seek controls');

	// audio.duration returns a very very precice decimal value 
	// this is exposed by MSAA and read by NVDA, and impairs accessibility
	// Plus, it isn't necessary for our purposes
	// So, even if duration is known, get a fresh, usable value
	if (player == 'html5') { 
		duration = Math.floor(audio.duration);
	}

	// If duration is unknown, can't define the slider's max attribute yet 
	if (isNaN(duration) || duration == 0) { 
		if (player == 'html5') { 
			//add an event listener so we can update slider whenever duration is known
			if (audio.addEventListener) { 
				audio.addEventListener('loadedmetadata',function (e) { 
					duration = audio.duration;
					if (duration > 0) {
						showTime(duration,durationContainer,hasSlider);
						if (hasSlider) {
							seekBar.setAttribute('min',0);
							seekBar.setAttribute('max',duration);
						}
					}
					toggleSeekControls('on');
				},false);
			}
		}
		else { 
			// max will be set when duration is known
			// min can be set now 
			if (hasSlider) { 
				seekBar.setAttribute('min',0);
			}
		}
	}
	else { //duration is known	
		if (hasSlider) {
			seekBar.setAttribute('min',0);  
			seekBar.setAttribute('max',Math.floor(duration));
		}
		if (player == 'html5') { //duration is in seconds
			showTime(duration,durationContainer,hasSlider);
		}
		else { //duration is in ms & must be converted
			showTime(duration/1000,durationContainer,hasSlider);
		}
		toggleSeekControls('on');
	}
}

function seekAudio(element, trackPos) {
	//element is either seekBar, seekForward, seekBack, or 'targetTime' (Yahoo only)
	//trackPos is only provided (in seconds) if element == 'targetTime'
	if (player == 'html5') { 
		if (element == seekBar) { 
			var targetTime = element.value;
			if (targetTime < duration) audio.currentTime = targetTime;
		}
		else if (element == seekForward) { 
			var targetTime = audio.currentTime + seekInterval;
			if (targetTime < duration) audio.currentTime = targetTime;
			else audio.currentTime = duration;
		}
		else if (element == seekBack) { 
			var targetTime = audio.currentTime - seekInterval;
			if (targetTime > 0) audio.currentTime = targetTime;
			else audio.currentTime = 0;
		}
	}
	else { 
		//seeking only works in Yahoo player if a track has started playing
		//shouldn't be possible to call this function prior to that because seek buttons are disabled
		//but this if loop is here to prevent an error, just in case	
		if (typeof thisMediaObj != 'undefined') {
			if (element == 'targetTime') { 
				var targetTime = trackPos * 1000;		
			}
			else { 
				var trackPos = YAHOO.MediaPlayer.getTrackPosition();
				if (element == seekBar) { 
					var targetTime = element.value;
				}
				else if (element == seekForward) { 							
					// NOTE: API docs at http://mediaplayer.yahoo.com/api say getTrackPosition() returns value in ms
					// This is incorrect - it returns the current position in SECONDS!
					// Target time, however, must be passed to play() in ms  
					var targetTime = Math.floor(trackPos + seekInterval) * 1000;
					
					// if advancing would exceed duration, stop one second short of duration 
					// this will allow track to end normally 
					if (targetTime > duration) targetTime = duration - 1000;
				}
				else if (element == seekBack) { 
					var targetTime =  Math.floor(trackPos - seekInterval) * 1000;
					if (targetTime < 0) targetTime = 0;
				}
			}
			YAHOO.MediaPlayer.play(thisMediaObj.track,targetTime);
		}
	}
}

function updateSeekBar() { 
	if (player == 'html5') { 
		if (hasSlider) { //increment it 
			seekBar.value = audio.currentTime;
		}
		//also increment counter 
		showTime(audio.currentTime,elapsedTimeContainer,hasSlider);
	}
	else { 
		if (hasSlider) { //increment it
			seekBar.value = YAHOO.MediaPlayer.getTrackPosition() * 1000;
		}	
	}
}

function toggleMute() { 
	if (player == 'html5') { 
		if (audio.muted) { 
			audio.muted = false; //unmute the volume
			mute.setAttribute('title','Mute');
			audio.volume = volume;
			if (useDebug) logit('unmuting volume');
			mute.style.backgroundImage='url(' + volumeButtonImage + ')';
		}
		else { 
			audio.muted = true; //mute the volume
			mute.setAttribute('title','UnMute');
			//don't update var volume. Keep it at previous level 
			//so we can return to it on unmute
			if (useDebug) logit('muting volume');
			mute.style.backgroundImage='url(' + muteButtonImage + ')';
		}
	}
	else { 
		if (YAHOO.MediaPlayer.getVolume() == 0) { //muted, so unmute. 
			mute.setAttribute('title','Mute');
			YAHOO.MediaPlayer.setVolume(volume); //volume should still be at pre-muted value
			mute.style.backgroundImage='url(' + volumeButtonImage + ')';
		}
		else { //not muted, so mute
			mute.setAttribute('title','UnMute');
			//don't update var volume. Keep it at previous level 
			//so we can return to it on unmute
			YAHOO.MediaPlayer.setVolume(0);
			mute.style.backgroundImage='url(' + muteButtonImage + ')';
		}
	}		
}

function updateVolume(direction) {
	//volume is a range between 0 and 1
	if (player == 'yahoo') volume = YAHOO.MediaPlayer.getVolume();
	if (direction == 'up') { 
		if (volume < 0.9) { 
			if (volume == 0) toggleMute();
			volume = Math.round((volume + 0.1)*10)/10;
		}
		else volume = 1;
	}
	else { //direction is down
		if (volume > 0.1) volume = Math.round((volume - 0.1)*10)/10;
		else { 
			volume = 0;
			toggleMute();
		}
	}
	if (player == 'html5') audio.volume = volume;
	else YAHOO.MediaPlayer.setVolume(volume);
	if (!isNaN(volume) && !audio.muted) { 
		if (useDebug) logit('Adjusting volume to ' + volume);
	}
}

function setupDebug(debugId) { 
	debug = document.getElementById(debugId);
	debug.setAttribute('role','complimentary');
	debug.setAttribute('aria-labelledby','debug-heading');
	debug.style.display='block';
	var debugH = document.createElement('h3');
	debugH.setAttribute('id','aap-debug-heading');
	debugH.innerHTML = 'Event Log';
	var debugP = document.createElement('p');
	var pStr = 'The following events, listed in reverse chronological order, ';
	pStr += 'are provided here for testing and debugging:';
	debugP.innerHTML = pStr;
	log = document.createElement('ul');
	log.setAttribute('id','aap-log');
	debug.appendChild(debugH);
	debug.appendChild(debugP);
	debug.appendChild(log);		
}
	
function swapSource(targetLink) { 
	var linkFormats = targetLink.getAttribute('data-format');
	var formats_array = linkFormats.split(' ');
	var formats_count = formats_array.length; 	
	if (formats_count > 0) { 
		//remove current source elements from audio
		if (audio.hasChildNodes()) {
		    while (audio.childNodes.length >= 1) {
				audio.removeChild(audio.firstChild);
			}
		}
		//now step through each format and create a new <source>
		for (var i=0; i < formats_count; i++) { 
			var source = document.createElement('source');
			var format = formats_array[i];
			if (format == 'ogg') var mimetype = 'audio/ogg';
			else if (format == 'oga') var mimetype = 'audio/ogg';
			else if (format == 'mp3') var mimetype = 'audio/mpeg';
			else if (format == 'm4a') var mimetype = 'audio/mp4';
			else if (format == 'wav') var mimetype = 'audio/wav';
			source.setAttribute('type',mimetype); 
			var urlAttrib = 'data-' + format;
			var specialUrl = targetLink.getAttribute(urlAttrib);
			if (specialUrl) { 
				//this track includes a special, unique URL for this file format
				source.setAttribute('src',specialUrl);
			}
			else { 
				//all versions of this track have the same path and filename (minus extension)
				//replace the current extension with this format
				var linkHref = targetLink.getAttribute('href');
				var linkParts = linkHref.split('.');
				var parts_count = linkParts.length;
				var newHref = linkParts[0];
				for (var j=1; j < (parts_count-1); j++) { 
					newHref += '.' + linkParts[j];
				}
				newHref += '.' + format;
				source.setAttribute('src',newHref);
			}
			audio.appendChild(source);
		}
	}
	//reload audio after sources have been updated
	if (player == 'html5') { 
		audio.load();
	}
	else { 
		playAudio();
	}
}
	
function logit(eventDescription) { 
	if (typeof log != 'undefined') { 
		var newEvent = document.createElement('li');
		newEvent.innerHTML = eventDescription;
		if (numEvents == 0) log.appendChild(newEvent);
		else log.insertBefore(newEvent,log.firstChild);
		numEvents++;
	}
}

function str_replace (search, replace, subject) {
	f = [].concat(search);
	r = [].concat(replace);
	s = subject;
	ra = r instanceof Array; 
	sa = s instanceof Array;    
	s = [].concat(s);
	if (count) {
		this.window[count] = 0;
	}
	for (i=0, sl=s.length; i < sl; i++) {
		if (s[i] === '') {
			continue;
		}
		for (j=0, fl=f.length; j < fl; j++) {
			temp = s[i]+'';
			repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
			s[i] = (temp).split(f[j]).join(repl);
			if (count && s[i] !== temp) {
				this.window[count] += (temp.length-s[i].length)/f[j].length;
			}        
		}
	}
	return sa ? s : s[0];
}

function toggleSeekControls(state) { 
	if (state == 'on') { 
		if (hasSlider) { 
			seekBar.disabled=false;
			if (seekBar.getAttribute('class')){
				seekBar.removeAttribute('class');
			}
			else { //if this is IE7 
				seekBar.removeAttribute('className');
			}
		}
		seekBack.disabled=false; 
		seekForward.disabled=false;
		if (seekBack.getAttribute('class')) { 
			seekBack.removeAttribute('class');
			//we can safely assume seekForward has class="disabled" too
			seekForward.removeAttribute('class');
		}
		else { //if this is IE7
			seekBack.removeAttribute('className');
			seekForward.removeAttribute('className');		
		}
	}
	else if (state == 'off') { 
		if (hasSlider) { 
			//before disabling the slider, reset its position to 0
			seekBar.value = 0;	
			// also reset duration display
			if (durationContainer) durationContainer.innerHTML = '';
			//now disable the seekBar
			seekBar.disabled=true;
			seekBar.className='disabled';
		}
		seekBack.disabled=true;
		seekBack.className='disabled';
		seekForward.disabled=true;
		seekForward.className='disabled';
	}
}

///////////////////////////////////////////////////
// YAHOO! Functions 
//////////////////////////////////////////////////
	
function onMediaUpdateHandler (mediaObj) { 
	if (useDebug) logit('onMediaUpdate');
	// this called when "media object is updated with properties like title, album etc."
	// however, it does *not* yet know the duration of the media 
	// therefore, this is a good time to reset the duration (and temp disable seek buttons)
	// it will be updated via onProgressHandler as soon as Yahoo has figured it out 	
	duration = 0; 
	toggleSeekControls('off');
}
	
function onPlaylistUpdateHandler (playlistArray) {
	if (useDebug) logit('onPlaylistUpdate');
	numSongs = YAHOO.MediaPlayer.getPlaylistCount();
	if (useDebug) logit('Playlist has ' + numSongs + ' tracks');
	//set first track as "Now playing"
	updatePlaylist(0);
}

function onTrackStartHandler (mediaObj) {
	//track has started playing, possibly via a click in the playlist
	if (useDebug) logit('onTrackStart');
	var trackMeta = YAHOO.MediaPlayer.getMetaData();
	songTitle = trackMeta['title'];
	var yahooSongId = trackMeta['id']; 
	//yahooSongId is an internal Yahoo-assigned ID, NOT an HTML id attribute 
	songIndex = getSongIndexFromYahooSongId(yahooSongId); 

	//if playing has resumed after a Pause, Firefox restarts at 0, rather than at current position
	//to compensate for this bug, need to seek ahead 
	if (isUserAgent('firefox/3') || isUserAgent('Firefox/2') || isUserAgent('Firefox/1')) { 
		if (songId == prevSongId) { 
			if (pauseTime > 0) seekAudio('targetTime',pauseTime); 
		}
		else { 
			//this is a new track, so reset pauseTime
			pauseTime = 0;
		}
	}

	//be sure playpause button is in pause state
	if (useDebug) logit('onTrackStart');
	statusBar.innerHTML = 'Playing';
	nowPlayingDiv.innerHTML = '<span>Selected Track:</span><br/>' + songTitle; 
	playpause.setAttribute('title','Pause');
	playpause.style.backgroundImage='url(' + pauseButtonImage + ')';
	thisMediaObj = mediaObj;	
	updatePlaylist(songIndex);
	
	//at this point, ok to enable seek buttons IF duration > 0
	if (duration > 0) { 
		toggleSeekControls('on');
	}
}

function onTrackPauseHandler (mediaObj) {
	//track has been paused, possiblly via a click on a pause button in the playlist
	//be sure playpause button is in play state
	if (useDebug) logit('onTrackPause');
	statusBar.innerHTML = 'Paused';
	pauseTime = YAHOO.MediaPlayer.getTrackPosition(); 
	playpause.setAttribute('title','Play');
	playpause.style.backgroundImage='url(' + playButtonImage + ')';
}

function onProgressHandler (progressArray) { 
	// according to the Yahoo API, this event is triggered when "progress is updated" 
	// that seems to be about once per second
	//progressArray includes keys 'elapsed' and 'duration', both in ms
	elapsedTime = progressArray['elapsed']; 
	if (elapsedTime > 0) { 
		showTime(elapsedTime/1000,elapsedTimeContainer);
		if (duration > 0) { 
			updateSeekBar();
		}
	}
	else showTime(0,elapsedTimeContainer);
	if (isNaN(duration)) duration = 0;
	if (duration == 0) { //check to see if Yahoo knows the duration of the media yet
		duration = progressArray['duration']; //in ms	
		if (duration > 0) {  
			if (useDebug) logit('Media duration: ' + duration + ' ms');	
			showTime(duration/1000,durationContainer);
			// ok to enable seekBar, seekBack and seekForward buttons 
			// now that we have duration. 
			setupSeekControls(); 
		}
		else { 
			showTime(0,durationContainer);		
		}
	}
}

function onTrackCompleteHandler (mediaObj) {
	if (useDebug) logit('onTrackComplete');
	statusBar.innerHTML = 'End of track';
	// Yahoo player advances to the next track automatically 
	// but does not restart at beginning after last track is played
	// This seems ok. 
	// If I decide to change it, this would be the place to do so
}

function getLinksToAudio () { 
	var allLinks = document.getElementsByTagName('a');
	var links = new Array();
	for (var i=0; i<allLinks.length; i++) { 
		if (allLinks[i].className=='aap-link') { 
			//this is an AAPP link
			links.push(allLinks[i]);
		}
	}
	return links;
}	

function getSupportedTypes() { 
	return new Array('mp3','ogg','wav','m4a','webm');
}

function playNewAudio(trackUrl,trackTitle) { 
	//play audio track that is not part of the original playlist 
	nowPlayingDiv.innerHTML = '<span>Selected Track:</span><br/>' + trackTitle;
}

//Call aap_init onload
if (window.addEventListener) {
	window.addEventListener('load', aap_init, false);
}
else if (window.attachEvent) {
	window.attachEvent('onload', aap_init);
}
else {
	document.addEventListener('load', aap_init, false);
} 
