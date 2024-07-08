const fileSystem = require('fs')
const client = require('../config')
const path = require('path')
const { GuildMember, ChannelType } = require('discord.js')

const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const musicModule = require('./musicModule')

const { generateDependencyReport } = require('@discordjs/voice');

console.log(generateDependencyReport());



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

  function deleteAfter(time){
    setTimeout(()=> message.channel.bulkDelete(1, true), time)
  }

  if(!message.guild){
    console.log('Message is not from a server')
    return
  }

  const guildID = message.guild.id
  let prefix = guildPrefixes[guildID] || "!"
  
  if(!message.content.startsWith(prefix)) { return console.log("Error: Wrong prefix: ", prefix)}
  
  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const command = args.shift().toLowerCase()

  console.log(command)

  // Send the command list 
  if(command === 'help'){
    if(!message.member.permissions.has("ModerateMembers") || !message.member.permissions.has("Administrator") || !message.member.permissions.has("ManageChannels")){
      message.reply(`
          Komendy bota
          ${prefix}help - wypisuje wszystkie możliwe komendy do użycia
          ${prefix}
          ${prefix}
          ${prefix}
          ${prefix}
        `)
    }else {
      message.reply(`
          Komendy bota
          **${prefix}help** - wypisuje wszystkie możliwe komendy do użycia
          **${prefix}del [1:100]** - usuwa określoną ilość wiadomości 
          **${prefix}prefix [symbol]** - ustawia prefix
          **${prefix}ban [@user] [powód]** - banuje użytkownika, domyślny powód: "Brak powodu"
          **${prefix}kick [@user] [powód]** - wyrzuca użytkownika, domyślny powód: "Brak powodu"
          **${prefix}mute [@user]** - wycisza użytkownika za pomocą roli mute. 
              Uwaga, jeśli nie ma takiej roli na serwerze, rola zostanie stworzona. 
              Uwaga, komedna może powodować lag serwera
          **${prefix}unmute [@user]** - usuwa wyciszenie użytkownika
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
    await message.reply("Ustawiono prefix na " + newPrefix)
    deleteAfter(2000)
  }

  // Delete a message 
  if(command === 'del' && args.length > 0){
    if(!message.member.permissions.has("ManageMessages")){
      console.log(`You are not allowed to use this command \n${command}`)
      return message.reply("Nie masz uprawnień do tej komendy")
    }

    const deleteCount = parseInt(args[0], 10)
    if(!deleteCount || deleteCount < 1 || deleteCount > 100){
      message.reply("**Argument musi mieć wartość 1:100**")
      deleteAfter(2500)
      return 
    }
    message.channel.bulkDelete(deleteCount, true)
    .then(deleted => message.channel.send(`**Usunięto ${deleted.size} wiadomości.**`),
    deleteAfter(2500))
    .catch(error => {
      console.error(error)
      message.reply("Wystąpił błąd podczas usuwania wiadomości.")
    })
  }

  function checkUser(message){
    const user = message.mentions.users.first()
    if(!user){
      return message.reply("Proszę oznaczyć użytkownika")
    }
    const member = message.guild.members.cache.get(user.id)
    if (!member) {
      return message.reply("Nie można znaleźć użytkownika na serwerze.")
    }
    return {member: member, user: user}
  }
  // Ban a user from the server
  if(command === "ban" && args.length > 0){
    if(!message.member.permissions.has("BanMembers")){ 
      console.log(`You are not allowed to use this command \n${command}`)
      return message.reply("**Nie masz uprawnień do tej komendy") 
    }
    const {member, user} = checkUser(message)

    try {
      await member.ban({reason: args.slice(1).join(' ')|| "Brak powodu"})
      message.reply(`**Zbanowano ${user.tag}, powód: ${args.slice(1).join(' ')}**`)
      deleteAfter(5000)
    }catch(error){
      console.error(error)
      message.reply('Wystąpił błąd podczas próby zbanowania użytkownika.')
    }
  }
  // Kick a user from the server
  if(command === 'kick' && args.length > 0) {

    if(!message.member.permissions.has("KickMembers")){ 
      console.log(`You are not allowed to use this command \n${command}`)
      return message.reply("**Nie masz dostępu do tej komendy**")
    }

    const {member, user} = checkUser(message)
    
    try {
      await member.kick({reason: args.slice(1).join(' ') || "Brak powodu"})
      message.reply(`**Wyrzucono ${user.tag}, powód: ${args.slice(1).join(' ')}**`)
      deleteAfter(5000)
    }catch(error){
      console.error(error)
      message.reply('Wystąpił błąd podczas próby wyrzucenia użytkownika.')
    }
  }

  if(command === 'mute' && args.length > 0){
    if(!message.member.permissions.has("ModerateMembers") || !message.member.permissions.has("ManageRoles")){
      console.log(`You are not allowed to use this command \n${command}`)
      return message.reply("**Nie masz dostępu do tej komendy**")
    }
    const muteRoleName = 'mute';
    let role = message.guild.roles.cache.find(r => r.name === muteRoleName);

    if(!role){
      role = await message.guild.roles.create({
        name: "mute",
        color: 'Red',
        mentionable: true,
        permissions: []
      })
    }
    
    try {
      const updatePromises = message.guild.channels.cache.map(async (channel) => {
          if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
              try {
                  await channel.permissionOverwrites.edit(role, {
                      SendMessages: false,
                      AddReactions: false,
                      Stream: false,
                      ReadMessageHistory: true,
                      Speak: false,
                      Connect: true,
                      CreateEvents: false,
                      CreatePrivateThreads: false,
                      CreatePublicThreads: false,
                      SendMessagesInThreads: false

                  });
              } catch (error) {
                  console.error(`Error: Cannot change permission in ${channel.name}:`, error);
              }
          }
      });
      await Promise.all(updatePromises);
      console.log("All channels updated");
  } catch (error) {
      console.error("Error: Cannot update channels:", error);
  }

    const {member, user} = checkUser(message)

    try{
      await member.roles.add(role)
      message.reply(`**Wyciszono użytkownika ${user.tag} nadając mu rolę ${role.name}**`)
      deleteAfter(3500)
    }catch(error){
      console.log(error)
      message.reply(`Nie można wyciszyć użytkownika`)
      deleteAfter(3500)
    }
  }
  if(command === "unmute" && args.length > 0){
    if(!message.member.permissions.has("ModerateMembers")){
      console.log(`You are not allowed to use this command \n${command}`)
      return message.reply("**Nie masz dostępu do tej komendy**")
    }
    const muteRoleName = 'mute';
    let role = message.guild.roles.cache.find(r => r.name === muteRoleName);

    const {member, user} = checkUser(message)

    try {
      await member.roles.remove(role)
      message.reply(`Usunięto wyciszenie dla gracza ${user.tag}`)
      deleteAfter(3000)
    }catch(error){
      console.log(error)
      message.reply("Nie można odciszyć użytkownika")
    }
  }

  // Channels commands
  if(command === 'join'){
    const voiceChannel = message.member.voice.channel

    if(!voiceChannel){
      return message.reply("Musisz być na kanale głosowym, aby bot mógł działać")
    }
    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator
      })

      const player = createAudioPlayer();
      connection.subscribe(player);   
    } catch(error){
      console.error(error)
    }
  }
  if(command === 'leave'){
    const voiceChannel = getVoiceConnection(message.guild.id)

    if(voiceChannel){
      voiceChannel.destroy()
    }
  
  }
  const serverQueue = musicModule.queue ? musicModule.queue.get(message.guild.id) : null;

  if(command === 'play') {
    musicModule.execute(message, serverQueue);
    return;
} else if(command === 'skip') {
    if (serverQueue) {
        musicModule.skip(message, serverQueue);
    } else {
        message.channel.send('There is no song playing to skip.');
    }
    return;
} else if(command === 'stop') {
    if (serverQueue) {
        musicModule.stop(message, serverQueue);
    } else {
        message.channel.send('There is no song playing to stop.');
    }
    return;
}
})
