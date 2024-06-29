const Discord = require('discord.js')
const { GatewayIntentBits } = require('discord.js');

const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]}
)

module.exports = client