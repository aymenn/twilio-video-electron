'use strict';

var Video = require('twilio-video');
var randomName = require('./common/randomname').randomName;
var generateToken = require('./common/randomname').generateToken;

var activeRoom;
var previewTracks;
var identity;
var roomName;


// In the renderer process.
const { desktopCapturer } = require('electron')
const accessTokenUrl = "http://localhost:3000/token";

function handleStream (stream) {
  const video = document.querySelector('video')
  video.srcObject = stream
  video.onloadedmetadata = (e) => video.play()
}

function handleError (e) {
  log(e)
}

async function getScreenTrack() {
    try {
        log("In  getScreenTrack()");
        const screenTrack = await desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
          for (const source of sources) {
            log('Found screen source: ' + source.name);

            if (source.name === 'Entire screen') {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: source.id,
                      minWidth: 1280,
                      maxWidth: 1280,
                      minHeight: 720,
                      maxHeight: 720
                    }
                  }
                })
                const screenTrack = stream.getVideoTracks()[0];
                log('Got screen track');
                return screenTrack;

              } catch (e) {
                handleError(e)
              }
              return
            }
          }
        })

        return screenTrack;
    } catch(e) {
        log(e);
    }
}

// Attach the Track to the DOM.
function attachTrack(track, container, participantName) {

  let cardSize = "12rem";

  if ( track.disable === undefined) { // only on local tracks
    cardSize = "36rem";
  }

  if (track.kind === 'audio') {
    container.append(track.attach());
  } else {
    const card = $('<div class="card" style="width:'+cardSize+';"/>');
    const cardTitle = $('<h5 class="card-title">'+ participantName + '</h5>');
    cardTitle.appendTo(card);
    const embed = $('<div />').addClass("embed-responsive embed-responsive-16by9");
    embed.appendTo(card);
    card.appendTo(container);
    
    if ( !track.sid) {
      embed.attr('trackid',track.id);
    } else {
      embed.attr('id', track.sid);
    }
    
    embed.append(track.attach());
  }
}

// Attach array of Tracks to the DOM.
function attachTracks(tracks, container, participantName) {

  tracks.forEach(function(track) {
    attachTrack(track, container, participantName);
  });
}

// Detach given track from the DOM
function detachTrack(track) {
  track.detach().forEach(function(element) {
    element.remove();
  });
  
  $('#'+track.sid).parent().remove();
  if ( track.id) {
    $("[trackid*='"+track.id+"']").parent().remove();
  }

  if ( track.stop) { // For local tracks
    track.stop();
  }
}

// A new RemoteTrack was published to the Room.
function trackPublished(publication, container, participantName) {
  if (publication.isSubscribed) {
    attachTrack(publication.track, container, participantName);
  }
  publication.on('subscribed', function(track) {
    log('Subscribed to ' + publication.kind + ' track');
    attachTrack(track, container, participantName);
  });
  publication.on('unsubscribed', detachTrack);
}

// A RemoteTrack was unpublished from the Room.
function trackUnpublished(publication) {
  log(publication.kind + ' track was unpublished.');
}

// A new RemoteParticipant joined the Room
function participantConnected(participant, container) {
  participant.tracks.forEach(function(publication) {
    trackPublished(publication, container, participant.identity);
  });
  participant.on('trackPublished', function(publication) {
    trackPublished(publication, container, participant.identity);
  });
  participant.on('trackUnpublished', trackUnpublished);
}

// Detach the Participant's Tracks from the DOM.
function detachParticipantTracks(participant) {
  var tracks = getTracks(participant);
  tracks.forEach(detachTrack);
}


// Connects to a Room with Voice, Video and, if selected, the screen track.
// For screensharing, it shares the entire screen. See getScreenTrack
async function connectAsync(data) {

    roomName = document.getElementById('room-name').value;
    if (!roomName) {
      alert('Please enter a room name.');
      return;
    }

    log("Joining room '" + roomName + "'...");
    var connectOptions = {
      name: roomName,
      logLevel: 'debug'
    };

    const localTracksPromise = Video.createLocalTracks();

    localTracksPromise.then(function(tracks) {
      if ( !connectOptions.tracks) {
        connectOptions.tracks = tracks;
      } else {
        connectOptions.tracks.push(tracks)
      }
    }, function(error) {
      error('Unable to access local media', error);
    });

    if ($('#screen-share-checkbox').is(":checked") == true) {
      const screenTrack = await getScreenTrack();

      log("getScreenTrack done: " + screenTrack)
      if ( !connectOptions.tracks) {
        connectOptions.tracks = [];
      }
      connectOptions.tracks.push(screenTrack)
    }

    await localTracksPromise;
    

    // Join the Room with the token from the server and the
    // LocalParticipant's Tracks.
    Video.connect(data.token, connectOptions).then(roomJoined, function(error) {
      log('Could not connect to Twilio: ' + error.message);
    });
}

// When we are about to transition away from this page, disconnect
// from the room, if joined.
window.addEventListener('beforeunload', leaveRoomIfJoined);

// Obtain a token from the server in order to connect to the Room.

log("Generating Access Token");
const data = generateToken(randomName());

  identity = data.identity;
  log('Got access token with identity: ' + data.identity);
  // Bind button to join Room.
  document.getElementById('button-join').onclick = function() {
    connectAsync(data);
  }

  document.getElementById('button-leave').style.display = 'none';

  // Bind button to leave Room.
  document.getElementById('button-leave').onclick = function() {
    log('Leaving room...');
    activeRoom.disconnect();
  };

  $('#screen-share-checkbox').click(function() {
  });


// Get the Participant's Tracks.
function getTracks(participant) {
  return Array.from(participant.tracks.values()).filter(function(publication) {
    return publication.track;
  }).map(function(publication) {
    return publication.track;
  });
}

// Successfully connected!
function roomJoined(room) {
  window.room = activeRoom = room;
  
  log("Joined as '" + identity + "'");
  document.getElementById('button-join').style.display = 'none';
  document.getElementById('screen-share-checkbox').style.display = 'none';
  document.getElementById('screen-share-checkbox-label').style.display = 'none';
  document.getElementById('button-leave').style.display = 'inline';

  // Attach LocalParticipant's Tracks, if not already attached.
  var previewContainer = document.getElementById('local-media');
  if (!previewContainer.querySelector('video')) {
    attachTracks(getTracks(room.localParticipant), previewContainer, room.localParticipant.identity);
  }

  // Attach the Tracks of the Room's Participants.
  var remoteMediaContainer = document.getElementById('remote-media');
  room.participants.forEach(function(participant) {
    log("Already in Room: '" + participant.identity + "'");
    participantConnected(participant, remoteMediaContainer);
  });

  // When a Participant joins the Room, log the event.
  room.on('participantConnected', function(participant) {
    log("Joining: '" + participant.identity + "'");
    participantConnected(participant, remoteMediaContainer);
  });

  // When a Participant leaves the Room, detach its Tracks.
  room.on('participantDisconnected', function(participant) {
    log("RemoteParticipant '" + participant.identity + "' left the room");
    detachParticipantTracks(participant);
  });

  // Once the LocalParticipant leaves the room, detach the Tracks
  // of all Participants, including that of the LocalParticipant.
  room.on('disconnected', function() {
    log('Left');
    if (previewTracks) {
      previewTracks.forEach(function(track) {
        track.stop();
      });
      previewTracks = null;
    }
    detachParticipantTracks(room.localParticipant);
    room.participants.forEach(detachParticipantTracks);
    activeRoom = null;
    document.getElementById('button-join').style.display = 'inline';
    document.getElementById('button-leave').style.display = 'none';
    document.getElementById('screen-share-checkbox').style.display = 'inline';
    document.getElementById('screen-share-checkbox-label').style.display = 'inline';
  });
}

$('#preview-modal').on('hidden.bs.modal', function (e) {
  if (previewTracks) {
    previewTracks.forEach(function(track) {
      track.stop();
      detachTrack(track);
    });
    previewTracks = null;
  }
});

$('#preview-modal').on('show.bs.modal', function (e) {
  var localTracksPromise = previewTracks
    ? Promise.resolve(previewTracks)
    : Video.createLocalTracks();

  localTracksPromise.then(function(tracks) {
    window.previewTracks = previewTracks = tracks;
    var previewContainer = document.getElementById('preview-local-media');
    if (!previewContainer.querySelector('video')) {
      attachTracks(tracks, previewContainer,'');
    }
  }, function(error) {
    error('Unable to access local media', error);
    log('Unable to access Camera and Microphone');
  });
})

// Activity log.
function log(message) {
  var logDiv = document.getElementById('log');
  logDiv.innerHTML += '<p>&gt;&nbsp;' + message + '</p>';
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Leave Room.
function leaveRoomIfJoined() {
  if (activeRoom) {
    activeRoom.disconnect();
  }
}
