const Discordie = require("discordie");
const fs = require("fs");
const token = "./token.txt";

// global variables
global.serverdata = "./data/servers.json";
global.playlist = "./playlist";
global.s; //s = servers (list of servers with all info)
global.bot = new Discordie({autoReconnect: true});

// project modules
var cmd = require("./commands.js");
var music = require("./music.js");
var func = require("./common.js");

// connect bot
start();

global.bot.Dispatcher.on("DISCONNECTED", e =>
{
    console.log(`${e.error}\nRECONNECT DELAY: ${e.delay}`);
});

global.bot.Dispatcher.on("VOICE_CHANNEL_LEAVE", e =>
{
    var client = func.get_client(e.guildId);
    if (e.user.id === global.bot.User.id)
    {
        console.log(`BZZT LEFT CHANNEL ${e.channel.name.toUpperCase()} BZZT`);
        if (!e.newChannelId)
        {
            var vc = global.bot.Channels.find(c => c.id == e.channelId);
            vc.join(vc).catch((e) => {console.log(e);});
        }
    }
    else if (client.is_playing && client.encoder.voiceConnection && client.encoder.voiceConnection.channel.members.length === 1 && !client.paused)
    {
        client.paused = true;
        client.encoder.voiceConnection.getEncoderStream().cork();
    }
});

global.bot.Dispatcher.on("VOICE_CHANNEL_JOIN", e =>
{
    var client = func.get_client(e.guildId);
    if (client.is_playing && client.encoder.voiceConnection && client.encoder.voiceConnection.channel.members.length === 1 && !client.paused)
    {
        client.paused = true;
        client.encoder.voiceConnection.getEncoderStream().cork();
    }
});

global.bot.Dispatcher.on("CHANNEL_CREATE", e =>
{
    if (client.tc && client.vc)
    {
        return;
    }
    else
    {
        var ch = e.channel;
        var client = func.get_client(ch.guild_id);

        if (ch.type === 0 && !client.tc && func._can(["SEND_MESSAGES"], ch))
        {
            client.tc = {id: ch.id, name: ch.name};
        }
        else if (ch.type === 2 && !client.vc && func._can(["SPEAK", "CONNECT"], ch))
        {
            ch.join();
            client.vc = {id: ch.id, name: ch.name};
        }
        func.write_changes();
    }
});

global.bot.Dispatcher.on("CHANNEL_DELETE", e =>
{
    var client = func.get_client(e.data.guild_id);
    var i;
    if (e.channelId === client.tc.id)
    {
        var tc = global.bot.Channels.textForGuild(client.server.id);
        for (i = 0; i < tc.length; i++)
        {
            if (func._can(["SEND_MESSAGES"], tc[i]))
            {
                client.tc = {id: tc[i].id, name: tc[i].name};
                break;
            }
        }
        if (e.channelId === client.tc.id)
        {
            client.tc = undefined;
        }
    }
    else if (e.channelId === client.vc.id)
    {
        var vc = global.bot.Channels.voiceForGuild(client.server.id);
        for (i = 0; i < vc.length; i++)
        {
            if (func._can(["SPEAK", "CONNECT"], vc[i]))
            {
                vc[i].join();
                client.vc = {id: vc[i].id, name: vc[i].name};
                break;
            }
        }
        if (e.channelId === client.vc.id)
        {
            client.vc = undefined;
        }
    }
    else
    {
        return;
    }
    func.write_changes();
});

global.bot.Dispatcher.on("GUILD_CREATE", e =>
{
    var servers = [];
    servers.push(e.guild);
    console.log(`BZZT JOINED ${e.guild.name} GUILD BZZT`);
    sweep_clients(servers);
});

global.bot.Dispatcher.on("GUILD_DELETE", e =>
{
    var index = global.s.findIndex(s => s.server.id === e.guildId);
    var client = func.get_client(e.guildId);
    console.log(`BZZT LEFT ${client.server.name} GUILD BZZT`);
    client.paused = true;
    if (client.is_playing)
    {
        client.encoder.destroy();
    }
    global.s.splice(index, 1);
    func.write_changes();
});

global.bot.Dispatcher.on("GATEWAY_READY", () =>
{
    global.s = [];
    console.log("BZZT ONLINE BZZT");
    global.bot.User.setGame("BZZT KILLING BZZT");
    fs.open(global.serverdata, "r", (err) =>
    {
        var servers = global.bot.Guilds.toArray();
        if (err)
        {
            console.log("BZZT NO SERVER FILE BZZT");
            sweep_clients(servers);
        }
        else
        {
            var tmp;
            var old_servers = JSON.parse(fs.readFileSync(global.serverdata, "utf-8"));
            if (old_servers.length === 0)
            {
                console.log("BZZT EMPTY SERVER FILE BZZT");
                return sweep_clients(servers);
            }
            var i;
            for (i = 0; i < old_servers.length; i++)
            {
                tmp = undefined;

                var server = servers.find(s => s.id === old_servers[i].server.id);
                if (server)
                {
                    tmp = {};
                    tmp.server = {id: server.id, name: server.name};
                    var old_tc = global.bot.Channels.textForGuild(tmp.server.id)
                    .find(c => c.id == old_servers[i].tc.id);
                    if (old_tc && func._can(["SEND_MESSAGES"], old_tc))
                    {
                        tmp.tc = {id: old_tc.id, name: old_tc.name};
                    }
                    else
                    {
                        tmp.tc = func.find_channel("text", tmp.server.id);
                    }

                    var old_vc = global.bot.Channels.voiceForGuild(tmp.server.id)
                    .find(c => c.id == old_servers[i].vc.id);
                    if (old_vc && func._can(["SPEAK", "CONNECT"], old_vc))
                    {
                        old_vc.join();
                        tmp.vc = {id: old_vc.id, name: old_vc.name};
                    }
                    else
                    {
                        tmp.vc = func.find_channel("voice", tmp.server.id);
                    }
                    global.s.push({
                        server:         tmp.server,
                        tc:             tmp.tc,
                        vc:             tmp.vc,
                        vip:            old_servers[i].vip,
                        queue:          [],
                        now_playing:    {},
                        is_playing:     false,
                        paused:         false,
                        autoplay:       old_servers[i].autoplay,
                        inform_np:      old_servers[i].inform_np,
                        announce_auto:  old_servers[i].announce_auto,
                        encoder:        {},
                        volume:         old_servers[i].volume,
                        meme:           old_servers[i].meme,
                        swamp:          true,
                        lmao_count:     0
                    });
                }
            }
            var init_servers = [];
            for (i = 0; i < global.s.length; i++)
            {
                init_servers.push(global.s[i].server);
                var index = servers.findIndex(servers => servers.id === global.s[i].server.id);
                if (index !== -1)
                {
                    servers.splice(index, 1);
                }
            }
            setTimeout(function(){init(init_servers);}, 2000);
            sweep_clients(servers);
        }
    });
});

global.bot.Dispatcher.on("MESSAGE_CREATE", e =>
{
    var msg = e.message;
    var text = msg.content;
    if (msg.author.id !== global.bot.User.id)
    {
        if (text[0] == "*")
        {
            if (cmd.handle_command(msg, text.substring(1), false))
            {
                if (func._can(["MANAGE_MESSAGES"], msg.channel))
                {
                    setTimeout(function(){msg.delete();}, 5000);
                }
            }
        }
        else if (func.get_client(msg.guild.id).meme)
        {
            if (func._can(["SEND_MESSAGES"], msg.channel))
            {
                cmd.handle_command(msg, text, true);
            }
        }
    }
});

function start()
{
    fs.open(token, "a+", () =>
    {
        var tok = fs.readFileSync(token, "utf-8").split("\n")[0];
        if (tok !== "")
        {
            fs.stat(global.playlist, (err) =>
            {
                if (err)
                {
                    console.log("BZZT NO PLAYLIST FOLDER BZZT\nBZZT MAKING PLAYLIST FOLDER BZZT");
                    fs.mkdirSync("playlist");
                }
            });
            fs.stat(".\\data", (err) =>
            {
                if (err)
                {
                    console.log("BZZT NO DATA FOLDER BZZT\nBZZT MAKING DATA FOLDER BZZT");
                    fs.mkdirSync("data");
                }
            });
            global.bot.connect({token: tok});
        }
        else
        {
            console.log("BZZT TOKEN EMPTY BZZT");
        }
    });
}

function sweep_clients(servers)
{
    if (servers.length !== 0)
    {
        for (var i = 0; i < servers.length; i++)
        {
            var tmp = {};
            tmp.server = {id: servers[i].id, name: servers[i].name};
            tmp.tc = func.find_channel("text", tmp.server.id);
            tmp.vc = func.find_channel("voice", tmp.server.id);
            global.s.push({
                server:         tmp.server,
                tc:             tmp.tc,
                vc:             tmp.vc,
                vip:            null,
                queue:          [],
                now_playing:    {},
                is_playing:     false,
                paused:         false,
                autoplay:       false,
                inform_np:      true,
                announce_auto:  true,
                encoder:        {},
                volume:         5,
                meme:           false,
                swamp:          true,
                lmao_count:     0
            });
        }
        setTimeout(function(){init(servers);}, 2000);
    }
}

function init(servers)
{
    for (var i = 0; i < servers.length; i++)
    {
        for (var j = 0; j < global.s.length; j++)
        {
            if (servers[i].id === global.s[j].server.id && global.s[j].autoplay && global.bot.User.getVoiceChannel(global.s[j].server.id).members.length !== 1)
            {
                music.auto_queue(global.s[j]);
            }
        }
    }
    func.write_changes();
}
