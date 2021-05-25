const Discord = require('discord.js');
const config = require('./config');
const auth = require('./auth');
const bot = new Discord.Client();

const prefix = '$';
const emoteFilter = reaction => reaction.emoji.id == config.good_emote || reaction.emoji.id == config.bad_emote;
let database;

bot.once('ready', () => {
    console.log(`${bot.user.tag} has logged in.`);
    bot.user.setActivity(`He's right you know`);
});

bot.on('guildCreate', guild => {
   console.log(`${bot.user.tag} has joined ${guild.name}.`);
});

bot.on('guildDelete', guild => {
    console.log(`${bot.user.tag} has left ${guild.name}.`);
});

bot.on('message', async message => {

    if(message.author.bot) return;

    message.awaitReactions(emoteFilter, {time: config.timeout})
        .then(collected => {
            
        }).catch(console.error);

    if(message.content.indexOf(prefix) !== 0) return;

    //The regex in this case will remove many consecutive spaces, instead of just one
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if(command === 'ping') {
        message.reply(`He's ponging you know. ${Math.round(message.client.ping)} ms`);
    }

    if(command === 'help') {
        const helpMessage = new Discord.RichEmbed()
            .setColor('#00FF22')
            .setTitle('List of commands')
            .setDescription('Morgan Freeman Exclusives')
            .addField('Ping', 'Get bot latency.')
            .addField('Help', 'Pretty much how you got this embed lol.');
            message.channel.send(helpMessage);
    }

    if(command === "stats" ) {

    }
});

bot.on('disconnect', event => {
    console.log('Disconnecting...');
});

bot.login(auth.token);
