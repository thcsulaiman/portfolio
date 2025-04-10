const socket = io(); // Connect to the signaling server
let peerConnection = null;
let partnerSocketId = null; // Declare partnerSocketId globally
const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }] // Google's STUN server
};

// Handle call pairing (when two users are matched)
socket.on("call-paired", (id) => {
    partnerSocketId = id; // Set the partner's socket ID
    console.log(`You are paired with: ${partnerSocketId}`);
})

document.querySelector(".history").onclick = function () {
    if (document.querySelector(".historyPanel").style.display === "none") {
      document.querySelector(".historyPanel").style.display = "block"
    }
  
    else {
      document.querySelector(".historyPanel").style.display = "none"
    }
  };

const localAudio = document.getElementById("localAudio");
const remoteAudio = document.getElementById("remoteAudio");
const callButton = document.getElementById("phone-icon");
const callendbtn = document.getElementById("call-end");
// Access the phone-icon button and call-control div
const loadingAnim = document.getElementById("loading");

const micOn = document.getElementById("mic-on");
const micOff = document.getElementById("mic-off");
let localStream; // To store the local stream for mic access

// Event listener for micOn button (enable mic)
micOff.addEventListener("click", () => {
    // Enable mic access by getting user media
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            localStream = stream; // Store the stream for later use
            localAudio.srcObject = localStream; // Set local audio stream
            micOff.style.display = "none"; // Show Mic Off button
            micOn.style.display = "block"; // Hide Mic On button
            
        })
        .catch(error => {
            console.error("Error accessing microphone:", error);
        });
});

// Event listener for micOff button (disable mic)
micOn.addEventListener("click", () => {
    // Stop all tracks of the local stream to disable the mic
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop()); // Stop all tracks
        localAudio.srcObject = null; // Clear the audio source
        micOn.style.display = "none"; // Show Mic On button
        micOff.style.display = "block"; // Hide Mic Off button
        
    }
});



navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        localAudio.srcObject = stream; // Set local audio
        localAudio.muted = true; // Mute local audio to avoid echo
    })
    .catch(error => console.error("Error accessing microphone:", error));

// Handle call button click
callButton.addEventListener("click", () => {
    startCall();
    callButton.style.display = "none"
    loadingAnim.style.display = "block"
    document.getElementById("mic-off").style.display = "none"
    document.getElementById("mic-on").style.display = "block"

});

var connectionTimeout; // Global variable for timeout


function startCall() {
    peerConnection = new RTCPeerConnection(servers);

     // Check if local stream is available
     if (!localAudio.srcObject) {
        console.error("Local audio stream is missing!");
        return;
    }

     // Add local tracks to peer connection
     localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Send ICE candidates to peer
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("ice-candidate", {
                candidate: event.candidate,
                to: partnerSocketId, // 🔹 Ensure correct recipient
            });
        }
    };

   // Receive remote stream
   peerConnection.ontrack = event => {
    console.log("Received remote stream:", event.streams[0]);
    remoteAudio.srcObject = event.streams[0];
};

   // Monitor connection state changes        // after call connected
   peerConnection.oniceconnectionstatechange = () => {
    console.log("ICE Connection State:", peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === "connected") {
        clearTimeout(connectionTimeout); // Cancel timeout if connected
        loadingAnim.style.display = "none";
        callendbtn.style.display = "block";
    }
};

    // Create an offer and send it
    peerConnection.createOffer()
        .then(offer => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit("offer", {
                offer: peerConnection.localDescription,
                to: partnerSocketId, // 🔹 Ensure correct recipient
            });
        })
        .catch(error => console.error("Error creating offer:", error));


     // Set a timeout for connection failure
     connectionTimeout = setTimeout(() => {
        console.log("Connection timeout! No response from peer.");
        
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        // Reset UI
        loadingAnim.style.display = "none";
        callButton.style.display = "block";
        callendbtn.style.display = "none";

        alert("Failed to connect. Please try again.");
    }, 15000); // 15 seconds timeout
    
}

// Handle answer from peer
socket.on("answer", answer => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Store ICE candidates if peerConnection is not ready
let pendingCandidates = [];

// Handle ICE candidates
socket.on("ice-candidate", candidate => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(error => console.error("Error adding ICE candidate:", error));
    } else {
        // Store the candidate to add later
        pendingCandidates.push(candidate);
    }
});

// Ensure ICE candidates are added after peerConnection is initialized
function processPendingCandidates() {
    while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift();
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(error => console.error("Error adding stored ICE candidate:", error));
    }
}

// Handle incoming offer
// Call this function after setting remote description
socket.on("offer", offer => {
    peerConnection = new RTCPeerConnection(servers);

    localStream = localAudio.srcObject; // Use global localStream
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).then(() => {
        processPendingCandidates(); // ✅ Process stored ICE candidates
    });

    peerConnection.createAnswer()
        .then(answer => {
            peerConnection.setLocalDescription(answer);
            socket.emit("answer", answer);
        })
        .catch(error => console.error("Error creating answer:", error));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("ice-candidate", {
                candidate: event.candidate,
                to: partnerSocketId, // 🔹 Ensure correct recipient
            });
        }
    };

    peerConnection.ontrack = event => {
        console.log("Received remote stream:", event.streams[0]);
        remoteAudio.srcObject = event.streams[0];
    };
});
// connection close 
// Clear ICE candidates when call ends
// Handle call end button click
callendbtn.addEventListener("click", () => {
    if (peerConnection) {
        socket.emit("call-ended"); // Notify the server
        endCall(); // Call cleanup function
    }
});

// Handle incoming call-ended event from the server
socket.on("call-ended", () => {
    endCall(); // Call cleanup function when remote user ends the call
});

// Function to clean up after call ends
function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Reset UI elements
    callButton.style.display = "block";
    callendbtn.style.display = "none";
    loadingAnim.style.display = "none";
}