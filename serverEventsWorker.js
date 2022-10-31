let workerUniqueIdentifier = "";
let workerId = Math.floor(Math.random() * 10000);
let sharedWorker = false;
let listeners = []; // NON SESSION
let checkAlive = []; //[port|self, timestamp] // will be used to ping pages and detect those inactive to clear their subscriptions
const sessionsData = {}; // object containng necessary info per user session
//Within
// subscriptionsToListener = []; // [subscriptionId, port|self]
let debugEnabled = false;
function debug(...args) {
    if (debugEnabled) {
        if (args.length === 1) {
            console.log("Worker: " + args[0]);
        }
        else if (args.length === 2) {
            console.log("Worker: " + args[0], args[1]);
        }
        else if (args.length === 3) {
            console.log("Worker: " + args[0], args[1], args[2]);
        }
        else if (args.length === 4) {
            console.log("Worker: " + args[0], args[1], args[2], args[3]);
        }
        else if (args.length === 5) {
            console.log("Worker: " + args[0], args[1], args[2], args[3], args[4]);
        }
        else if (args.length === 6) {
            console.log("Worker: " + args[0], args[1], args[2], args[3], args[4], args[5]);
        }
        else {
            console.log("Worker:", args);
        }
    }
}
debug("start");
function generateUniqueId(length) {
    let result = "";
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
workerUniqueIdentifier = generateUniqueId(8);
function subscribe(sessionId, listener, subscriptionUrl, onSuccess) {
    if (sessionsData[sessionId] !== undefined) {
        const sessionData = sessionsData[sessionId];
        const xhttp = new XMLHttpRequest();
        debug("Will subscribe to " + subscriptionUrl);
        xhttp.onreadystatechange = function () {
            debug("Subscribing status ", xhttp.readyState, xhttp.status);
            if (xhttp.readyState === XMLHttpRequest.DONE) {
                if (xhttp.status === 200) {
                    const subscriptionId = xhttp.responseText;
                    // log("Subscribed " + subscriptionUrl+ " "+subscriptionId);
                    sessionData.subscriptionsToListener.push([subscriptionId, listener]);
                    onSuccess(subscriptionId);
                }
                else if (xhttp.status === 401) {
                    // user not logged in, ignore
                }
                else {
                    listeners.forEach(listener => {
                        listener.postMessage({ "messageType": "subscribeFailed", "error": "HTTP Status " + xhttp.status });
                    });
                }
            }
        };
        debug("Subscribing", subscriptionUrl);
        xhttp.open("GET", sessionData.urlPrefix + subscriptionUrl, true);
        if (sessionId.length > 0) { // otherwise it's unauthorized session
            xhttp.setRequestHeader("Authorization", sessionId);
        }
        xhttp.withCredentials = true;
        xhttp.send();
    }
}
function unsubscribe(sessionId, port, subscriptionId, onSuccess) {
    if (sessionsData[sessionId] !== undefined && sessionsData[sessionId].channelId !== undefined) {
        const sessionData = sessionsData[sessionId];
        const xhttp = new XMLHttpRequest();
        const subscriptionPort = sessionData.subscriptionsToListener.filter(s => s[0] === subscriptionId)[0];
        if (subscriptionPort[1] === port) {
            xhttp.onreadystatechange = function () {
                if (xhttp.readyState === XMLHttpRequest.DONE) {
                    if (xhttp.status === 200) {
                        sessionData.subscriptionsToListener = sessionData.subscriptionsToListener.filter(s => s[0] !== subscriptionId);
                        onSuccess();
                    }
                    else {
                        // ports.forEach(port => {
                        //   port.postMessage({"messageType": "unsubscribeFailed", "error": "HTTP Status " + xhttp.status});
                        // });
                    }
                }
            };
            debug("Unsubscribing", subscriptionId);
            xhttp.open("GET", sessionData.urlPrefix + "server-events/unsubscribe/" + sessionData.channelId + "/" + subscriptionId, true);
            if (sessionId.length > 0) { // otherwise it's unauthorized session
                xhttp.setRequestHeader("Authorization", sessionId);
            }
            xhttp.withCredentials = true;
            xhttp.send();
        }
    }
}
function startListening(sessionId, newUrlPrefix, onSuccess) {
    debug("Start listening");
    if (sessionsData[sessionId] === undefined) {
        sessionsData[sessionId] = {
            channelOpenListeners: [],
            subscriptionsToListener: [],
            urlPrefix: ""
        };
    }
    const sessionData = sessionsData[sessionId];
    if (sessionData.channelOpeningInProgress === true) {
        debug("Delaying opening new channel");
        sessionData.channelOpenListeners.push(onSuccess);
    }
    else if (sessionData.channelId === undefined) {
        sessionData.channelOpeningInProgress = true;
        debug("Opening new channel");
        // sessionId = newSessionId;
        // debug("Session ID changed to '"+sessionId+"'");
        sessionData.urlPrefix = newUrlPrefix;
        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState === XMLHttpRequest.DONE) {
                if (xhttp.status === 200) {
                    const channelId = JSON.parse(xhttp.responseText).channelId;
                    debug("New channel opened " + channelId);
                    sessionData.channelId = channelId;
                    onSuccess(channelId);
                    sessionData.channelOpenListeners.forEach(onSuccessListener => {
                        debug("Delayed update success");
                        onSuccessListener(channelId);
                    });
                    sessionData.channelOpenListeners = [];
                    if (sessionsData[sessionId] !== undefined) { // if there was no logout between
                        continueListening(sessionId, channelId, 0, 0);
                    }
                }
                else if (xhttp.status === 401) {
                    listeners.forEach(listener => {
                        listener.postMessage({ "messageType": "channelOpeningNotAuthorized" });
                    });
                }
                else {
                    listeners.forEach(listener => {
                        listener.postMessage({ "messageType": "channelOpeningFailed", "error": "HTTP Status " + xhttp.status });
                    });
                }
                delete sessionData.channelOpeningInProgress;
            }
        };
        debug("Opening channel", workerUniqueIdentifier, sessionId);
        xhttp.open("GET", sessionData.urlPrefix + "server-events/open-channel/" + workerUniqueIdentifier, true);
        if (sessionId.length > 0) { // otherwise it's unauthorized session
            xhttp.setRequestHeader("Authorization", sessionId);
        }
        xhttp.withCredentials = true;
        xhttp.send();
    }
    else {
        debug("Page connected to channel");
        onSuccess(sessionData.channelId);
    }
}
function continueListening(sessionId, channelId, retryNo, requestId) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (sessionsData[sessionId] === undefined || sessionsData[sessionId].channelId === undefined) {
            // ignore response, because session is no longer valid
        }
        else if (xhttp.readyState === XMLHttpRequest.DONE) {
            const sessionData = sessionsData[sessionId];
            if (xhttp.status === 200) {
                // ListenResponse
                const response = JSON.parse(this.responseText);
                if (response.error !== undefined) {
                    channelId = "";
                    debug("Sending emergencyReload [" + this.responseText + "]");
                    listeners.forEach(port => {
                        port.postMessage({
                            "messageType": "emergencyReload",
                            "error": "Server events listener error: [" + response.error + "]"
                        });
                    });
                }
                else if (response.events !== undefined && response.events.length > 0) {
                    debug("Maybe sending events to listeners " + listeners.length);
                    for (let j = 0; j < listeners.length; j++) {
                        const port = listeners[j];
                        const eventsToSend = response.events.filter(function (event) {
                            return event.subscriptionsIds.filter((subscriptionId) => {
                                return sessionData.subscriptionsToListener.filter(s => s[0] === subscriptionId && s[1] === port).length > 0;
                            }).length > 0;
                        });
                        if (eventsToSend.length > 0) {
                            debug("Sending events to page " + eventsToSend.length);
                            port.postMessage({ "messageType": "events", "events": eventsToSend });
                        }
                    }
                }
                // timeout so we'll not build up stack (which will eventually lead to stack overflow)
                setTimeout(() => {
                    continueListening(sessionId, channelId, 0, requestId + 1);
                });
            }
            else {
                if (retryNo < 5) { // try five times before reporting an error (up to 20 seconds, for temporary connections issue)
                    setTimeout(() => {
                        continueListening(sessionId, channelId, retryNo + 1, requestId);
                    }, 4000);
                }
                else {
                    const errorMessage = "Server events listener connection error";
                    // if (xhttp.status === 0) { WHY it's only for this error?
                    delete sessionData.channelId;
                    debug("Sending unableToConnect (emergencyReload)");
                    listeners.forEach(port => {
                        port.postMessage({ "messageType": "unableToConnect", "error": errorMessage });
                    });
                    // } else {
                    //   debug("Unhandled Listening Error", xhttp.status);
                    // }
                }
            }
        }
    };
    if (sessionsData[sessionId] !== undefined) {
        const sessionData = sessionsData[sessionId];
        debug("Listening " + requestId + (retryNo > 0 ? " Retry " + retryNo : "") + " in session " + sessionId);
        xhttp.open("GET", sessionData.urlPrefix + "server-events/listen/" + channelId + "/" + workerUniqueIdentifier + "/" + requestId, true);
        if (sessionId.length > 0) { // otherwise it's unauthorized session
            xhttp.setRequestHeader("Authorization", sessionId);
        }
        xhttp.withCredentials = true;
        xhttp.timeout = 60000;
        xhttp.send();
    }
}
function closeConnectionForClosedPage(sessionId, listener) {
    debug("page disconnected");
    if (sessionsData[sessionId] !== undefined) {
        const sessionData = sessionsData[sessionId];
        const listenerSubscriptions = sessionData.subscriptionsToListener.filter(s => s[1] === listener);
        sessionData.subscriptionsToListener = sessionData.subscriptionsToListener.filter(s => s[1] !== listener);
        listeners = listeners.filter(p => p !== listener);
        for (let i = 0; i < listenerSubscriptions.length; i++) {
            const subscriptionId = listenerSubscriptions[i][0];
            const xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (xhttp.readyState === XMLHttpRequest.DONE) {
                    if (xhttp.status === 200) {
                        // do nothing
                    }
                    else {
                        debug("Error while unsubscribing", xhttp.status);
                    }
                }
            };
            xhttp.open("GET", sessionData.urlPrefix + "server-events/unsubscribe/" + sessionData.channelId + "/" + subscriptionId, true);
            if (sessionId.length > 0) { // otherwise it's unauthorized session
                xhttp.setRequestHeader("Authorization", sessionId);
            }
            xhttp.withCredentials = true;
            xhttp.send();
            // do not wait for response
        }
    }
}
function closeAllConnections(sessionId) {
    if (sessionsData[sessionId] !== undefined) {
        const sessionData = sessionsData[sessionId];
        debug("closeAllConnections");
        const subscriptionsToListener = sessionData.subscriptionsToListener;
        sessionData.subscriptionsToListener = [];
        subscriptionsToListener.forEach((l) => delete listeners[listeners.indexOf(l[1])]);
        for (let i = 0; i < subscriptionsToListener.length; i++) {
            const subscriptionId = subscriptionsToListener[i][0];
            const xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (xhttp.readyState === XMLHttpRequest.DONE) {
                    if (xhttp.status === 200) {
                        // do nothing
                    }
                    else {
                        debug("Error while unsubscribing", xhttp.status);
                    }
                }
            };
            xhttp.open("GET", sessionData.urlPrefix + "server-events/unsubscribe/" + sessionData.channelId + "/" + subscriptionId, true);
            if (sessionId.length > 0) { // otherwise it's unauthorized session
                xhttp.setRequestHeader("Authorization", sessionId);
            }
            xhttp.withCredentials = true;
            xhttp.send();
            // do not wait for response
        }
        delete sessionsData[sessionId];
    }
}
function handleMessage(listener, data) {
    debug("Received message " + data.messageType);
    switch (data.messageType) {
        case "ping":
            listener.postMessage({ messageType: "pong" });
            break;
        case "userLoggedIn":
            debug("User logged in");
            break;
        case "userLoggedOut":
            debug("userLoggedOut");
            if (data.sessionId !== undefined) {
                closeAllConnections(data.sessionId);
            }
            else {
                throw new Error("userLoggedOut: Session id is missing");
            }
            break;
        case "listen":
            if (data.sessionId !== undefined && data.urlPrefix !== undefined) {
                startListening(data.sessionId, data.urlPrefix, (channelId) => {
                    listener.postMessage({ messageType: "listenResponse", channelId: channelId });
                });
            }
            else {
                throw new Error("listen: No sessionId or no urlPrefix");
            }
            break;
        case "subscribe":
            if (data.sessionId !== undefined && data.subscriptionUrl !== undefined) {
                subscribe(data.sessionId, listener, data.subscriptionUrl, (subscriptionId) => {
                    listener.postMessage({ messageType: "subscribed", "subscriptionId": subscriptionId });
                });
            }
            else {
                throw new Error("subscribe: No sessionId or no subscriptionUrl");
            }
            break;
        case "unsubscribe":
            if (data.sessionId !== undefined && data.subscriptionId !== undefined) {
                unsubscribe(data.sessionId, listener, data.subscriptionId, () => {
                    listener.postMessage({ messageType: "unsubscribed", "subscriptionId": data.subscriptionId });
                });
            }
            else {
                throw new Error("unsubscribe: No sessionId or no subscriptionId");
            }
            break;
        case "pong":
            checkAlive = checkAlive.filter(a => a[0] !== listener);
            checkAlive.push([listener, new Date().getTime()]);
            break;
        case "pageClosed":
            if (data.sessionId !== undefined) {
                closeConnectionForClosedPage(data.sessionId, listener);
            }
            break;
    }
}
// This code should handle both Worker and SharedWorker events
// port has the same API for sending messages as self
self.addEventListener("connect", function (e) {
    sharedWorker = true;
    const port = e.ports[0];
    listeners.push(port);
    port.addEventListener("message", function (e) {
        handleMessage(port, e.data);
    }, false);
    port.start();
}, false);
// self.addEventListener("message", function (e: MessageEvent) {
//
//   listeners = [self];
//
//   handleMessage(self, e.data);
// }, false);
//# sourceMappingURL=serverEventsWorker.js.map