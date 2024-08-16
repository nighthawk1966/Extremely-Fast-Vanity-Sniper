"use strict";
import tls from "tls";
import WebSocket from "ws";
import extractJsonFromString from "extract-json-from-string";

let vanity;
const guilds = {};

const tlsSocket = tls.connect({
    host: "canary.discord.com",
    port: 8443,
});

tlsSocket.on("data", async (data) => {
    const ext = await extractJsonFromString(data.toString());
    const find = ext.find((e) => e.code) || ext.find((e) => e.message);

    if (find) {
        console.log(find);

        const requestBody = JSON.stringify({
            content: `@everyone ${vanity}\n\`\`\`json\n${JSON.stringify(find)}\`\`\``,
        });
        const contentLength = Buffer.byteLength(requestBody);
        const requestHeader = [
            `POST /api/channels/kanal id/messages HTTP/1.1`,
            "Host: canary.discord.com",
            `Authorization: token gir cano`,
            "Content-Type: application/json",
            `Content-Length: ${contentLength}`,
            "",
            "",
        ].join("\r\n");
        const request = requestHeader + requestBody;
        tlsSocket.write(request);
    }
});

tlsSocket.on("error", (error) => {
    console.log(`tls error`, error);
    return process.exit();
});

tlsSocket.on("secureConnect", () => {
    const websocket = new WebSocket("wss://gateway-us-east1-b.discord.gg");
    websocket.onclose = (event) => {
        console.log(`ws closed ${event.code}`);
        return process.exit();
    };
    websocket.onmessage = async (message) => {
        const { d, op, t } = JSON.parse(message.data);
        if (t === "GUILD_UPDATE") {
            const start = process.hrtime();
            const find = guilds[d.guild_id];
            if (find && find !== d.vanity_url_code) {
                const requestBody = JSON.stringify({ code: find });
                tlsSocket.write([
                    `PATCH /api/v7/guilds/sunucu/vanity-url HTTP/1.1`,
                    "Host: canary.discord.com",
                    `Authorization: token`,
                    "Content-Type: application/json",
                    `Content-Length: ${requestBody.length}`,
                    "",
                    "",
                ].join("\r\n") + requestBody);
                const end = process.hrtime(start);
                vanity = `${find} **nighthawk update** `;
            }
        } else if (t === "GUILD_DELETE") {
            const find = guilds[d.id];
            if (find) {
                const requestBody = JSON.stringify({ code: find });
                tlsSocket.write([
                    `PATCH /api/v9/guilds/sunucu id/vanity-url HTTP/1.1`,
                    "Host: canary.discord.com",
                    `Authorization: token gir cano`,
                    "Content-Type: application/json",
                    `Content-Length: ${requestBody.length}`,
                    "",
                    "",
                ].join("\r\n") + requestBody);
                vanity = `${find} **delete**`;
            }
        } else if (t === "READY") {
            d.guilds.forEach((guild) => {
                if (guild.vanity_url_code) {
                    guilds[guild.id] = guild.vanity_url_code;
                } else {
                }
            });
            console.log(guilds);
        }
        if (op === 10) {
            websocket.send(JSON.stringify({
                op: 2,
                d: {
                    token: "token",
                    intents: 513 << 0,
                    properties: {
                        os: "linux",
                        browser: "firefox",
                        device: "nighthawk",
                    },
                },
            }));
            setInterval(() => websocket.send(JSON.stringify({ op: 0.1, d: {}, s: null, t: "heartbeat" })), d.heartbeat_interval);
        } else if (op === 7)
            return process.exit();
    };

    setInterval(async () => {
        for (let i = 0; i < 5; i++) {
            await new Promise((resolve) => setTimeout(resolve, 120));
            tlsSocket.write(["GET / HTTP/1.1", "Host: canary.discord.com", "", ""].join("\r\n"));
        }
    }, 10000);
});
