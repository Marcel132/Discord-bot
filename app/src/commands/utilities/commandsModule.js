const fileSystem = require('fs')
const client = require('../config')
const path = require('path')

const prefixesFilePath = path.join(__dirname, '../../prefixes.json')
let guildPrefixes = {}


if(fileSystem.existsSync(prefixesFilePath)){
  try{
    guildPrefixes = JSON.parse(fileSystem.readFileSync(prefixesFilePath, 'utf-8'))
  } catch(error){
    console.log('Error: Filesystem not found: ', prefixesFilePath, error)
  }
}

client.on("messageCreate", async(message)=>{

  if(!message.guild){
    console.log('Message is not from a server')
    return
  }

  const guildID = message.guild.id
  let prefix = guildPrefixes[guildID] || "!"
  
  if(!message.content.startsWith(prefix)) { return console.log("Error: Wrong prefix: ", prefix)}
  
  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const command = args.shift().toLowerCase()

  // Send the command list 
  if(command === 'help'){
    if(!message.member.permissions.has("ModerateMembers") || !message.member.permissions.has("KickMembers") || !message.member.permissions.has("BanMembers")){
      message.reply(`
          Komendy bota
        `)
    }else {
      message.reply(`
          Komendy bota
          ${prefix}help - wypisuje wszystkie możliwe komendy do użycia
          ${prefix}del [1:100] - usuwa określoną ilość wiadomości 
          ${prefix}prefix [symbol] - ustawia prefix
          ${prefix}ban [@user] [powód] - banuje użytkownika, domyślny powód: "Brak powodu"
        `)
    }
  }

  // Set prefix for guild if admin
  if(command === 'prefix' && args.length > 0){
    if(!message.member.permissions.has("Administrator")){
      return message.reply("Nie masz uprawnień do tej komendy")
    }
    
    const newPrefix = args[0]
    guildPrefixes[guildID] = newPrefix

    fileSystem.writeFileSync(prefixesFilePath, JSON.stringify(guildPrefixes, null, 4)), (err) => {
      if(err){
        return console.log('Error: Could not save prefix')
      } else {
        console.log('Set a new prefix to', data)
      }
    }
    message.reply("Ustawiono prefix na " + newPrefix)
    setTimeout(() =>message.channel.bulkDelete(1, true), 3500 )
  }

  // Delete a message 
  if(command === 'del' && args.length > 0){
    if(!message.member.permissions.has("ManageMessages")){
      console.log("You are not allowed to use this command")
      return message.reply("Nie masz uprawnień do tej komendy")
    }

    const deleteCount = parseInt(args[0], 10)
    if(!deleteCount || deleteCount < 1 || deleteCount > 100){
      message.reply("**Argument musi mieć wartość 1:100**")
      setTimeout(() =>message.channel.bulkDelete(1, true), 3500 )
      return 
    }
    message.channel.bulkDelete(deleteCount, true)
    .then(deleted => message.channel.send(`**Usunięto ${deleted.size} wiadomości.**`),
    setTimeout(() =>message.channel.bulkDelete(1, true), 3500 ))
    .catch(error => {
      console.error(error);
      message.reply("Wystąpił błąd podczas usuwania wiadomości.");
    });
  }

  if(command === "ban" && args.length > 0){
    if(!message.member.permissions.has("BanMembers")){
      return message.reply("**Nie masz uprawnień do tej komendy")
    }

    const user = message.mentions.users.first()
    const member = message.guild.members.cache.get(user.id)
    try {
      await member.ban({reason: args.slice(1).join(' ')|| "Brak powodu"})
      message.reply(`**Zbanowano ${user.tag} został zbanowany**`)
    }catch(error){
      console.error(error);
      message.reply('Wystąpił błąd podczas próby zbanowania użytkownika.');
    }

  }
})
