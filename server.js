const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("client")); // Serve static files from "client" folder
// Store timeouts for waiting users
let waitingUserTimeouts = {}; // Maps user ID to their timeout ID
let waitingUsers = []; // Store users waiting for a call
let activeCalls = {}; // Store active calls as { socket.id: { partnerSocketId, status } }

// A function to clean up users that have been waiting for too long
function cleanUpInactiveUsers() {
    const timeoutDuration = 60000; // 60 seconds timeout duration (adjust as needed)

    waitingUsers = waitingUsers.filter(user => {
        const isInactive = Date.now() - user.lastActivity > timeoutDuration;
        if (isInactive) {
            console.log(`User ${user.id} removed from waiting queue due to inactivity.`);
        }
        return !isInactive; // Keep only active users
    });
}

// Call the cleanup function every minute (60000ms)
setInterval(cleanUpInactiveUsers, 60000);



io.on("connection", socket => {
    console.log("A user connected:", socket.id);

    // Handle call request
    socket.on("call-request", () => {
        console.log(`User ${socket.id} is requesting a call`);

        if (waitingUsers.length > 0) {
            // Pair with the first waiting user
            const partnerSocket = waitingUsers.shift(); // Get the first user from the queue
            activeCalls[socket.id] = partnerSocket.id;
            activeCalls[partnerSocket.id] = socket.id;

            // Notify both users that they are paired
            socket.emit("call-paired", partnerSocket.id);
            io.to(partnerSocket.id).emit("call-paired", socket.id);            

            // Clear the timeout for the partner (if any)
            clearTimeout(waitingUserTimeouts[partnerSocket.id]);
            delete waitingUserTimeouts[partnerSocket.id];

        } else {
            // No one is available, add the current user to the queue
            waitingUsers.push({ id: socket.id, lastActivity: Date.now() }); // Store as object


            // Set a timeout to remove the user from the waiting queue after 90 seconds
            waitingUserTimeouts[socket.id] = setTimeout(() => {
                console.log(`User ${socket.id} has been removed from the waiting queue due to timeout.`);
                waitingUsers = waitingUsers.filter(id => id !== socket.id); // Filtering by the socket ID
                delete waitingUserTimeouts[socket.id];
            }, 90000); // Timeout after 90 seconds
        }
    });



    // Handle incoming offer
    socket.on("offer", offer => {
        console.log("Received offer from", socket.id);
        io.to(activeCalls[socket.id]).emit("offer", offer); // Send offer to paired clients
    });

    // Handle incoming answer
    socket.on("answer", answer => {
        console.log("Received answer from", socket.id);
        io.to(activeCalls[socket.id]).emit("answer", answer);
    });

    // Handle ICE candidates
    socket.on("ice-candidate", candidate => {
        console.log("Received ICE candidate from", socket.id);

        const partnerSocketId = activeCalls[socket.id]; // Get the paired user
        if (partnerSocketId) {
            // Send the candidate to the paired user
            io.to(partnerSocketId).emit("ice-candidate", candidate);
        }
    });


    // Handle user disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        // Remove from activeCalls if they are in a call
        if (activeCalls[socket.id]) {
            const partnerSocketId = activeCalls[socket.id];

            // Notify both users that the call has ended
            io.to(partnerSocketId).emit("call-disconnected", socket.id); // Notify partner that the other user disconnected
            io.to(socket.id).emit("call-disconnected", partnerSocketId); // Notify the disconnected user
            
            // Remove both users from activeCalls
            delete activeCalls[socket.id];
            delete activeCalls[partnerSocketId];
        }

        // ✅ Remove the disconnected user from the waiting queue
        waitingUsers = waitingUsers.filter(id => id !== socket.id);
        if (waitingUserTimeouts[socket.id]) {
            // Clear the timeout if it's set for the user
            clearTimeout(waitingUserTimeouts[socket.id]);
            delete waitingUserTimeouts[socket.id];
        }
    });





    // Handle call end
    socket.on("call-ended", () => {
        console.log(`User ${socket.id} ended the call`);

        if (activeCalls[socket.id]) {
            const partnerSocketId = activeCalls[socket.id];
    
            // Notify the other user that the call has ended
            io.to(partnerSocketId).emit("call-ended");
    
            // Remove both users from activeCalls
            delete activeCalls[socket.id];
            delete activeCalls[partnerSocketId];
        }
        // Reset UI elements
        callButton.style.display = "block";
        callendbtn.style.display = "none";
    });

});

server.listen(3000, () => {
    console.log("Server is running on http://127.0.0.1:3000");
});
