const func = require('./common.js')
const main = require('../TuxedoMan.js')
const commands = require('./commands/')

module.exports = {
  handleCommand: function (msg, text, meme) {
    let command = ''
    if (!meme) {
      let client = func.getClient(msg.guild.id)
      let params = text.split(' ')
      command = commands[params[0]]

      if (command) {
        if (params.length - 1 < command.parameters.length) {
          return msg.reply('Insufficient parameters!').then((m) => {
            setTimeout(function () { m.delete() }, 10000)
          })
        } else {
          if (rank(msg) >= command.rank) {
            params.splice(0, 1)
            if (command.command === 'help') {
              params = commands
            }
            // console.log(command.execute(msg, params), client)
            func.messageHandler(command.execute(msg, params), client)
          } else if (rank(msg) < command.rank) {
            func.messageHandler(denyRank(msg, command.rank))
          }
          return true
        }
      }
    } else {
      command = searchCommand('memes')
      return command.execute(msg, text)
    }
  }
}

function searchCommand (commandName) {
  return (commands.find(cmd => cmd.command === commandName.toLowerCase()))
}

function denyRank (msg, rank) {
  let str = ''
  switch (rank) {
    case 1:
      str = `Must be in voice chat with ${main.bot().User.username}`
      return {promise: msg.reply(str), content: str}
    case 2:
      str = 'Must be VIP!'
      return {promise: msg.reply(str), content: str}
    case 3:
      str = 'Must be guild owner!'
      return {promise: msg.reply(str), content: str}
    case 4:
      str = 'Must be a boss!'
      return {promise: msg.reply(str), content: str}
  }
}

function rank (msg) {
  let client = func.getClient(msg.guild.id)
  if (msg.member.id === main.config().admin) {
    return 4
  } else if (msg.guild.isOwner(msg.member)) {
    return 3
  } else if (client.vip && msg.member.hasRole(client.vip)) {
    return 2
  } else if (main.bot().User.getVoiceChannel(client.guild.id).members
  .findIndex(m => m.id === msg.member.id) !== -1) {
    return 1
  } else {
    return 0
  }
}
