/*import peer from 'peerjs';
//import XMLHttpRequest from 'xmlhttprequest';
import Wrtc from 'electron-webrtc';
import WebSocket from 'ws';
const Peer = peer.peerjs ? peer.peerjs.Peer : peer;
//const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var wrtc = Wrtc();

const RTCPeerConnection = wrtc.RTCPeerConnection;
const RTCSessionDescription = wrtc.RTCSessionDescription;
const RTCIceCandidate = wrtc.RTCIceCandidate;

//const WebSocket = require('ws');
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
*/
