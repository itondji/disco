import Peer from 'peerjs';
const window = global;
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var wrtc = require('electron-webrtc')();

const RTCPeerConnection = wrtc.RTCPeerConnection;
const RTCSessionDescription = wrtc.RTCSessionDescription;
const RTCIceCandidate = wrtc.RTCIceCandidate;

const WebSocket = require('ws');
const location = {
  protocol: 'http',
};

export default function Peer2(id, options) {
  // Deal with overloading :-D
  if (id && id.constructor == Object) {
    options = id;
    id = undefined;
  } else if (id) {
    // Ensure id is a string
    id = id.toString();
  }

  return new Peer(id, options);
}
