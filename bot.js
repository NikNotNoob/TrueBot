const Discord = require('discord.js');
const config = require('./config');
const auth = require('./auth');
const mongoose = require('mongoose');
const Ratio = require('./Ratio');
const Canvas = require('canvas');
const bot = new Discord.Client({disableEveryone: true});

const prefix = '$';

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

// Standard Normal variate using Box-Muller transform.
function randn_bm() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return randn_bm() // resample between 0 and 1
    return num
  }

function randomIntNormalDistribution(min, max) {
    return Math.floor(randn_bm() * (max - min + 1) + min)
}

bot.once('ready', () => {
    console.log(`${bot.user.tag} has logged in.`);
    bot.user.setActivity(`He's right you know`, {type: `CUSTOM_STATUS`});
});

bot.on('guildCreate', guild => {
   console.log(`${bot.user.tag} has joined ${guild.name}.`);
});

bot.on('guildDelete', guild => {
    console.log(`${bot.user.tag} has left ${guild.name}.`);
});

bot.on('message', message => {

    if(message.author.bot) return;

    const emoteFilter = reaction => config.good_emotes.includes(reaction.emoji.id) || config.bad_emotes.includes(reaction.emoji.id);
    message.awaitReactions(emoteFilter, {time: config.timeout})
        .then(async collected => {

            let good_count = 0;
            let bad_count = 0;

            config.good_emotes.forEach(emojiId => {
                let goods = collected.get(emojiId);

                if(goods) {
                    good_count += goods.count;
                    if(goods.users.has(message.author.id)) good_count--;
                }
            });

            config.bad_emotes.forEach(emojiId => {
                let bads = collected.get(emojiId);

                if(bads) {
                    bad_count += bads.count;
                    if(bads.users.has(message.author.id)) bad_count--;
                }
            });

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

    if(command === 'resetbadcount') {
        message.channel.send(`My PayPal : paypal.me/niknotnoob`);
    }

    if(command === 'resetgoodcount') {
        message.channel.send(`why?`);
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
            .addField('IQ', 'Tells you how retarded you are')
            .addField('Stats', 'Gives your ratio of trues to sadspheres')
            .addField('Rank', 'Gets your global ratio rank (too lazy to make it server only)')
            .addField('Leaderboard', `Gets global top ${config.leaderboard_count} people`)
            .addField('ResetBadCount', `Resets your bad reaction count`)
            .addField('ResetGoodCount', `Resets your good reaction count`);
            message.channel.send(helpMessage);
    }

    if(command === "rank") {
        Ratio.aggregate([
            {
                $project: {
                    score: {
                        $divide: ["$good_reacts", {$max: [1, "$bad_reacts"]}]
                    }, 
                    good_reacts: 1,
                    bad_reacts: 1,
                    user_id: 1
                }
            },
            { $sort: {score: -1, good_reacts: -1, bad_reacts: 1}}
            ]).exec(async (err, ratios) => {
                if(err) {
                    console.log(err);
                    message.channel.send(`An error occured... <@${config.owner_id}> lol fix me`);
                } else {
                    let rank = 1;
                    ratios.every(ratio => {
                        if(ratio.user_id == message.author.id) {
                            return false;
                        }
                        rank++;
                        return true;
                    });

                    const rankImage = './rank.png';

                    const background = await Canvas.loadImage(rankImage);
                    const canvas = Canvas.createCanvas(background.width, background.height);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(background, 0, 0, background.width, background.height);

                    ctx.font = '48px sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(rank, canvas.width / 1.43, canvas.height / 2.8);

                    ctx.font = '32px sans-serif';
                    ctx.fillText(message.author.username, canvas.width / 3.34, canvas.height / 1.7);

                    ctx.font = '20px sans-serif';
                    ctx.fillStyle = '#828282';
                    ctx.fillText(`#${message.author.discriminator}`, canvas.width / 2.65, canvas.height / 1.7);

                    const attachment = new Discord.Attachment(canvas.toBuffer(), 'rank.png');
                    message.channel.send(attachment);
                }
            });
    }

    if(command === "leaderboard") {
        Ratio.aggregate([
        {
            $project: {
                score: {
                    $divide: ["$good_reacts", {$max: [1, "$bad_reacts"]}]
                }, 
                good_reacts: 1,
                bad_reacts: 1,
                user_id: 1
            }
        },
        { $sort: {score: -1, good_reacts: -1, bad_reacts: 1}}, 
        { $limit: config.leaderboard_count }
        ]).exec((err, ratios) => {
            if(err) {
                console.log(err);
                message.channel.send(`An error occured... <@${config.owner_id}> lol fix me`);
            } else {
                let rank = 1;
                let ratioPromises = [];
                ratios.forEach(ratio => {
                    const userPromise = new Promise((resolve, reject) => {
                        bot.fetchUser(ratio.user_id).then(user => {
                            ratio.user = user;
                            resolve(ratio);
                        })
                    });
                    ratioPromises.push(userPromise);
                });
                Promise.all(ratioPromises).then(ratios => {
                    const leaderboardMessage = new Discord.RichEmbed()
                        .setColor('#00FF22')
                        .setTitle(`Ratio leaderboard`);
                    ratios.forEach(ratio => {
                        leaderboardMessage.addField(`#${rank++} - ${ratio.user.username}`, `${ratio.good_reacts} : ${ratio.bad_reacts} => ${ratio.score.toFixed(2)}`);
                    });
                    message.channel.send(leaderboardMessage);
                });
            }
        });
    }

    if(command === "invite") {
        message.reply(config.invite_link);
    }

    if(command === "ip") {

        if(message.content.includes('@')) {
            message.channel.send(`I ain't tagging fuck you`);
            return;
        }

        let username;
        let user = message.mentions.users.first();
        username = user ? user.username : args.join(' ');
        if(!username) username = message.author.username;

        if(username.toLowerCase() === "ez nuts") {
            message.channel.send(`lol no`);
            return;
        }

        if(username.toLowerCase() === "truebot") {
            message.channel.send(`can't dox me... ip de ${message.author.username}: ${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`);
            return;
        }

        if(username.toLowerCase() === "[ppg]rusty" || username.toLowerCase() === "rusty") {
            message.channel.send(`ip de rusty: new york`);
            return;
        }

        message.channel.send(`ip de ${username}: ${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`)
    }

    if(command === "iq") {

        if(message.content.includes('@')) {
            message.channel.send(`I ain't tagging fuck you`);
            return;
        }

        let username;
        let user = message.mentions.users.first();
        username = user ? user.username : args.join(' ');
        if(!username) username = message.author.username;

        if(username.toLowerCase() === "nik" || username.toLowerCase().includes(" nik ")) {
            message.channel.send(`iq de ${username}: 180`);
            return;
        }

        if(username.toLowerCase() === "candy" || username.toLowerCase().includes(" candy ")) {
            message.channel.send(`iq de ${username}: 3`);
            return;
        }

        message.channel.send(`iq de ${username}: ${randomIntNormalDistribution(56, 145)}`)
    }

    if(command === "stats" ) {

        let user = message.mentions.users.first();
        if(!user) user = message.author;

        Ratio.findOne({ user_id: user.id }).then(ratio => {

            let good_count = (ratio == null || ratio.good_reacts === undefined) ? 0 : ratio.good_reacts;
            let bad_count = (ratio == null || ratio.bad_reacts === undefined) ? 0 : ratio.bad_reacts;
            let totalRatio = good_count / Math.max(1, bad_count + good_count) * 100;

            const statsMessage = new Discord.RichEmbed()
            .setColor('#00FF22')
            .setTitle(`${user.username}'s stats`)
            .addField('True reacts', good_count)
            .addField('Sadsphere reacts', bad_count)
            .addField('Ratio', `${Math.trunc(totalRatio)}%`);
            message.channel.send(statsMessage);
        })
    }

    if(command == "shutdown" && message.member.hasPermission('ADMINISTRATOR')) {
        bot.destroy();
        console.log(`Shutting down...`);
        message.channel.send('Shutting down');
        process.exit();
    }
});

bot.on('error', err => {
    console.error(err);
})

mongoose.connect(auth.database_url, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
    .then(() => {
        console.log("Connected to the Mongodb database.");
    }).catch((err) => {
        console.log("Unable to connect to the Mongodb database. Error:"+err);
    });

bot.login(auth.token);
