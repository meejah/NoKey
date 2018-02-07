import { setup } from '../web/setup.js';
import Elm from './build/apps.js';

console.log("(background) start background.js");

const sendMsgToAll = (msg, ports) => {
    for (let key in ports) {
        if (ports[key]) {
            ports[key].postMessage(msg);
        }
    }
};


setup(Elm.MainBackground.worker, (app) => {
    // console.log("(background) started", app);

    // ports are stored in this object
    let ports = {};
    let lastPort = null;

    chrome.runtime.onConnect.addListener(function(port) {
        // console.log("(background) port connected", port.name);
        ports[port.name] = port;
        lastPort = port.name;

        port.onMessage.addListener(function(msg) {
            if (msg.type === "onStateRequest") {
                // console.log("(background) onStateRequest from " + port.name);
                app.ports.onStateRequest.send(msg.data);
            } else if (msg.type === "onReceiveMsg") {
                // console.log("(background) onReceiveMsg from " + port.name, msg.data);
                app.ports.onReceiveMsg.send(msg.data);
            } else if (msg.type === "getAccountsForSite") {
                app.ports.onRequestAccountsForSite.send(msg.data);
            } else if (msg.type === "didSubmit") {
                console.log("didSubmit", msg.data);
                app.ports.onAddSiteEntry.send(msg.data);
            }
        });
        port.onDisconnect.addListener(() => {
            // console.log("(background) port.onDisconnect " + port.name);
            delete ports[port.name];
        });
    });

    app.ports.accountsForSite.subscribe((accounts) => {
        if (!lastPort) return;
        ports[lastPort].postMessage({
            type: "onGetAccountsForSite",
            data: accounts
        });
    });

    // fillForm : { login : String, site : String, password : String } -> Cmd msg
    app.ports.fillForm.subscribe((msg) => {
        console.log("fill form:", msg);
        sendMsgToAll({ type: "fillForm", data: msg }, ports);
    });


    app.ports.notificationCount.subscribe((count) => {
        console.log("notificationCount: ", count);
        browser.browserAction.setBadgeBackgroundColor({color: "red"});
        if (count > 0) {
            browser.browserAction.setBadgeText({text: ""+count});
            // this is the tooltip
            browser.browserAction.setTitle({title: "NoKey: User interaction required"});

        } else {
            browser.browserAction.setBadgeText({text: ""});
            browser.browserAction.setTitle({title: "NoKey"});
        }
    });

    app.ports.sendOutNewState.subscribe((state) => {
        sendMsgToAll({ type: "onNewState", data: state }, ports);
        // console.log("(background) want to sendOutNewState", state);
    });
});



