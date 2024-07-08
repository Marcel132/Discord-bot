const client = require('./src/commands/config');
const { token } = require('./src/config.json');



console.log("Starting...");
console.log("Finding a token...")

if(token){
  console.log("Completed")
  client.login(token);
  require('./src/commands/utilities/commandsModule')
} else {
  console.log("Token not found")
  return 0
}



