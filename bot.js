const mineflayer = require('mineflayer');

function createMinecraftBot(ip, port, username) {
    const bot = mineflayer.createBot({
        host: ip,
        port: port,
        username: username,
        version: '1.12.2',
        auth: 'offline',
        keepAlive: true,
        checkTimeoutInterval: 60000
    });

    bot.once('spawn', () => {
        console.log(`[MinecraftBot] ${username} تم تشغيله على ${ip}:${port}`);
    });

    bot.on('error', (err) => {
        console.error(`[MinecraftBot] ${username} حدث خطأ:`, err);
    });

    bot.on('kicked', (reason, loggedIn) => {
        console.log(`[MinecraftBot] ${username} تم طرده. السبب: ${reason}. كان مسجل الدخول: ${loggedIn}`);
    });

    bot.on('end', () => {
        console.log(`[MinecraftBot] ${username} تم فصله`);
        setupReconnect(bot, {
            name: username,
            ip: ip,
            port: port,
            instance: bot,
            status: 'disconnected'
        });
    });

    return bot;
}

function setupReconnect(mcBot, botInfo) {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 10000; // 10 ثوانٍ

    function attemptReconnect() {
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`[MinecraftBot] ${botInfo.name} محاولة إعادة الاتصال ${reconnectAttempts}/${maxReconnectAttempts}...`);
            botInfo.status = 'reconnecting';

            setTimeout(() => {
                const newBot = createMinecraftBot(botInfo.ip, botInfo.port, botInfo.name);
                botInfo.instance = newBot;
                
                newBot.once('spawn', () => {
                    console.log(`[MinecraftBot] ${botInfo.name} تم إعادة الاتصال بنجاح!`);
                    botInfo.status = 'connected';
                    reconnectAttempts = 0;
                });

                newBot.on('end', attemptReconnect);
            }, reconnectDelay);
        } else {
            console.log(`[MinecraftBot] ${botInfo.name} فشلت جميع محاولات إعادة الاتصال. توقف عن المحاولة.`);
            botInfo.status = 'failed';
        }
    }

    mcBot.on('end', attemptReconnect);
}

module.exports = createMinecraftBot;