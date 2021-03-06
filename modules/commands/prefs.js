const func = require('../common.js')
const main = require('../../TuxedoMan.js')
const moment = require('moment')

module.exports = {
  command: 'prefs',
  description: 'Display current bot preferences',
  parameters: [],
  rank: 2,
  execute: function (msg) {
    const bot = main.bot()
    let client = func.getClient(msg.guild.id)
    let guild = bot.Guilds.toArray().find(g => g.id === client.guild.id)
    let vipRole = getCleanVipRole(client, guild)
    let gameRoles = getCleanGameRoles(client, guild)
    let member = guild.members.find(m => m.id === bot.User.id)
    let embed =
      {
        description: ':heartbeat: [**Preferences**](https://github.com/alex-taxiera/TuxedoMan)',
        thumbnail: {url: 'https://raw.githubusercontent.com/alex-taxiera/TuxedoMan/indev/images/tuxedoman.png'},
        'timestamp': moment(),
        color: 0x3498db,
        'footer': {
          'icon_url': 'https://raw.githubusercontent.com/alex-taxiera/TuxedoMan/indev/images/tuxedoman.png',
          'text': 'TuxedoMan'
        },
        fields: [{name: 'Default Text Channel', value: client.textChannel.name},
            {name: 'Default Voice Channel', value: client.voiceChannel.name},
            {name: 'VIP Role', value: vipRole},
            {name: 'Announce Now Playing', value: client.informNowPlaying, inline: true},
            {name: 'Announce Autoplay', value: client.informAutoPlaying, inline: true},
            {name: 'Autoplay', value: client.autoplay, inline: true},
            {name: 'Memes', value: client.meme, inline: true},
            {name: 'Music Volume', value: `${client.volume * 2}`, inline: true},
            {name: 'Game Roles', value: gameRoles}]
      }
    return {promise: msg.channel.sendMessage('', false, embed), content: '', delay: 25000, embed: embed}
  }
}
function getCleanVipRole (client, guild) {
  if (client.vip) {
    return guild.roles.find(r => r.id === client.vip).name
  } else {
    return 'None'
  }
}

function getCleanGameRoles (client, guild) {
  let gameRoles = ''
  if (client.gameRoles.active) {
    gameRoles += 'True\n'
  } else {
    gameRoles += 'False\n'
  }
  for (let i = 0; i < client.gameRoles.roles.length; i++) {
    let role = guild.roles.find(r => r.id === client.gameRoles.roles[i])
    if (role) {
      if (i) {
        gameRoles += ' '
      }
      gameRoles += `"${role.name}"`
    }
  }
  return gameRoles
}
