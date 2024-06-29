const fileSystem = require('fs')
const client = require('../config')
const path = require('path')

const prefixesFilePath = path.join(__dirname, '../../prefixes.json')
let guildPrefixes = {}
const defaultPrefix = "!"

function checkGuildPrefix(){
  if(fileSystem.existsSync(prefixesFilePath)){
    try{
      guildPrefixes = JSON.parse(fileSystem.readFileSync(prefixesFilePath, 'utf-8'))
      console.log(guildPrefixes)
    } catch(error){
      console.log('Error: Filesystem not found: ', prefixesFilePath, error)
    }
  }
}
function savePrefixes(){
  console.log("SAVE PREFIXES")

  fileSystem.writeFileSync(prefixesFilePath, JSON.stringify(guildPrefixes, null, 4)), (err) => {
    if(err){
      console.log('Error: Could not save prefix')
      return
    } else console.log('Set a new prefix to', data)
  }
}

checkGuildPrefix()
// Set default prefix for guild
client.on("messageCreate", (message)=>{

  if(!message.guild){
    console.log('Message is not from a server')
    return
  }

  const guildID = message.guild.id
  let prefix = guildPrefixes[guildID] || defaultPrefix
  
  if(!message.content.startsWith(prefix)){
    console.log("Brak prefixu", prefix) 
    return
  }
  
  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const command = args.shift().toLowerCase()
  console.log(args, command)

  if(command == 'pref' && args.length > 0){
    const newPrefix = args[0]

    guildPrefixes[guildID] = newPrefix

    savePrefixes()
    message.reply("Ustawiono prefix na " + newPrefix)
  }
})
