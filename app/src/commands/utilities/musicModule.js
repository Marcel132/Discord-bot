// ! Reapir a music

const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const sodium = require('libsodium-wrappers');
const { OpusEncoder } = require('@discordjs/opus');

const queue = new Map();

async function execute(message, serverQueue) {
  const args = message.content.split(' ');
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
      return message.channel.send('Musisz być na kanale głosowym, aby puszczać muzykę!');
  }
  
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.channel.send('Potrzebuję uprawnień do dołączenia i mówienia w Twoim kanale głosowym!');
  }

  const songUrl = args[1];
  if (!ytdl.validateURL(songUrl)) {
      return message.channel.send('Proszę podać poprawny URL YouTube!');
  }

  try {
      const songInfo = await ytdl.getInfo(songUrl);
      const song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
      };

      if (!serverQueue) {
          const queueContruct = {
              textChannel: message.channel,
              voiceChannel: voiceChannel,
              connection: null,
              songs: [],
              player: createAudioPlayer(),
          };

          queue.set(message.guild.id, queueContruct);
          queueContruct.songs.push(song);

          try {
              const connection = joinVoiceChannel({
                  channelId: voiceChannel.id,
                  guildId: message.guild.id,
                  adapterCreator: message.guild.voiceAdapterCreator,
              });
              queueContruct.connection = connection;

              connection.on(VoiceConnectionStatus.Ready, () => {
                  console.log('Połączenie głosowe gotowe!');
                  play(message.guild, queueContruct.songs[0]);
              });

              connection.on('error', (error) => {
                  console.error('Błąd połączenia głosowego:', error);
                  queue.delete(message.guild.id);
                  return message.channel.send('Wystąpił błąd z połączeniem głosowym!');
              });

          } catch (err) {
              console.error(err);
              queue.delete(message.guild.id);
              return message.channel.send('Wystąpił błąd podczas dołączania do kanału głosowego!');
          }
      } else {
          serverQueue.songs.push(song);
          return message.channel.send(`${song.title} został dodany do kolejki!`);
      }
  } catch (error) {
      console.error('Błąd podczas pobierania informacji o utworze:', error);
      return message.channel.send('Wystąpił błąd podczas próby dodania utworu!');
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel) {
      return message.channel.send('Musisz być na kanale głosowym, aby pominąć utwór!');
  }
  if (!serverQueue) {
      return message.channel.send('Nie ma żadnej piosenki do pominięcia!');
  }
  serverQueue.player.stop();
  message.channel.send('Pominięto bieżący utwór!');
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel) {
      return message.channel.send('Musisz być na kanale głosowym, aby zatrzymać muzykę!');
  }
  if (!serverQueue) {
      return message.channel.send('Nie ma żadnej piosenki do zatrzymania!');
  }
  serverQueue.songs = [];
  serverQueue.player.stop();
  serverQueue.connection.destroy();
  queue.delete(message.guild.id);
  message.channel.send('Muzyka została zatrzymana i bot opuścił kanał!');
}

async function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
      serverQueue.connection.destroy();
      queue.delete(guild.id);
      return;
  }

  console.log('Próba odtworzenia:', song.title);

  try {
      const stream = ytdl(song.url, { 
          filter: 'audioonly', 
          quality: 'highestaudio',
          highWaterMark: 1 << 25
      });

      stream.on('error', error => {
          console.error('Błąd strumienia ytdl:', error);
          serverQueue.textChannel.send('Wystąpił błąd podczas strumieniowania audio.');
          serverQueue.songs.shift();
          play(guild, serverQueue.songs[0]);
      });

      const resource = createAudioResource(stream, { 
          inputType: StreamType.Arbitrary,
          inlineVolume: true 
      });

      serverQueue.player.play(resource);

      serverQueue.player.on(AudioPlayerStatus.Playing, () => {
          console.log('Odtwarzanie rozpoczęte');
          serverQueue.textChannel.send(`Zaczynamy grać: **${song.title}**`);
      });

      serverQueue.player.on(AudioPlayerStatus.Idle, () => {
          console.log('Odtwarzacz bezczynny, przechodzę do następnej piosenki');
          serverQueue.songs.shift();
          play(guild, serverQueue.songs[0]);
      });

      serverQueue.player.on('error', error => {
          console.error('Błąd odtwarzacza:', error);
          serverQueue.textChannel.send('Wystąpił błąd podczas odtwarzania.');
          serverQueue.songs.shift();
          play(guild, serverQueue.songs[0]);
      });

      serverQueue.connection.subscribe(serverQueue.player);
  } catch (error) {
      console.error('Błąd podczas odtwarzania:', error);
      serverQueue.textChannel.send('Wystąpił błąd podczas próby odtworzenia muzyki.');
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
  }
}

module.exports = {
  execute,
  skip,
  stop,
  queue
};
