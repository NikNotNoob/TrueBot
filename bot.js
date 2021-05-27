const Discord = require('discord.js');
const config = require('./config');
const auth = require('./auth');
const mongoose = require('mongoose');
const Ratio = require('./Ratio');
const bot = new Discord.Client();

const prefix = '$';

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

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

bot.on('message', message => {

    if(message.author.bot) return;

    const emoteFilter = reaction => reaction.emoji.id == config.good_emote || reaction.emoji.id == config.bad_emote;
    message.awaitReactions(emoteFilter, {time: config.timeout})
        .then(async collected => {
            let goods = collected.get(config.good_emote);
            let bads = collected.get(config.bad_emote);

            let good_count = 0;
            let bad_count = 0;

            if(goods) {
                good_count = goods.count;
                if(goods.users.has(message.author.id)) good_count--;
            }

            if(bads) {
                bad_count = bads.count;
                if(bads.users.has(message.author.id)) bad_count--;
            }

            /*
            console.log(`Message : ${message.content}`);
            console.log(`Good count: ${good_count}`);
            console.log(`Bad count: ${bad_count}`);
            */

            if(good_count || bad_count) {
                const filter = { user_id: message.author.id };
                const update = { $inc : {
                    good_reacts: good_count,
                    bad_reacts: bad_count
                }};
                const opts = { new: true, upsert: true }
                let ratio = await Ratio.findOneAndUpdate(filter, update, opts);
            }
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
            .addField('Help', 'Pretty much how you got this embed lol.')
            .addField('Invite', 'Invite the bot (Nik exclusive)')
            .addField('IP', 'Doxxes you (trolled)')
            .addField('Stats', 'Gives your ratio of trues to sadspheres')
            .addField('Rank', 'https://tenor.com/view/rank-funny-face-black-man-gif-18421232');
            message.channel.send(helpMessage);
    }

    if(command === "rank") {
        message.channel.send(`To be implemented...`);
    }

    if(command === "invite") {
        message.reply(config.invite_link);
    }

    if(command === "ip") {
        let user = message.mentions.users.first();
        if(!user) user = message.author;
        message.channel.send(`ip de ${user.username}: ${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`)
    }

    if(command === "stats" ) {

        let user = message.mentions.users.first();
        if(!user) user = message.author;

        Ratio.findOne({ user_id: user.id }).then(ratio => {

            let good_count = (ratio == null || ratio.good_reacts === undefined) ? 0 : ratio.good_reacts;
            let bad_count = (ratio == null || ratio.bad_reacts === undefined) ? 0 : ratio.bad_reacts;
            let totalRatio = good_count / Math.max(1, bad_count) * 100;

            const statsMessage = new Discord.RichEmbed()
            .setColor('#00FF22')
            .setTitle(`${user.username}'s stats`)
            .addField('True reacts', good_count)
            .addField('Sadsphere reacts', bad_count)
            .addField('Ratio', `${Math.trunc(totalRatio)}%`);
            message.channel.send(statsMessage);
        })
    }
});

bot.on('disconnect', event => {
    console.log('Disconnecting...');
});

mongoose.connect(auth.database_url, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
    .then(() => {
        console.log("Connected to the Mongodb database.");
    }).catch((err) => {
        console.log("Unable to connect to the Mongodb database. Error:"+err);
    });

bot.login(auth.token);
