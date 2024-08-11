const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { spawn } = require('child_process');
const fs = require('fs');
const createMinecraftBot = require('./bot.js');

const TOKEN = 'MTE4ODU3MTI2MjMzMTY1MDA1OA.GdegAI.VNCJND7aQWOx14tziNqF9W1SEILIb5N56JUtoQ';
const CLIENT_ID = '1188571262331650058';

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

const userBots = {};
const premiumUsers = new Set();

const commands = [
  new SlashCommandBuilder().setName('اضافة_بوت').setDescription('إضافة بوت جديد')
    .addStringOption(option => option.setName('ip').setDescription('عنوان IP للبوت').setRequired(true))
    .addIntegerOption(option => option.setName('port').setDescription('رقم المنفذ للبوت').setRequired(true)),
   
  new SlashCommandBuilder().setName('تعديل_اسم_بوت').setDescription('تغيير اسم البوت (للمستخدمين البريميوم فقط)')
    .addStringOption(option => option.setName('old_name').setDescription('الاسم القديم للبوت').setRequired(true))
    .addStringOption(option => option.setName('new_name').setDescription('الاسم الجديد للبوت').setRequired(true)),
  new SlashCommandBuilder().setName('تشغيل_بوت').setDescription('تشغيل أحد البوتات')
    .addStringOption(option => option.setName('name').setDescription('اسم البوت').setRequired(true)),
  new SlashCommandBuilder().setName('ايقاف_بوت').setDescription('إيقاف أحد البوتات قيد التشغيل')
    .addStringOption(option => option.setName('name').setDescription('اسم البوت').setRequired(true)),
  new SlashCommandBuilder().setName('حذف_بوت').setDescription('حذف أحد البوتات')
    .addStringOption(option => option.setName('name').setDescription('اسم البوت').setRequired(true)),
  new SlashCommandBuilder().setName('قائمة_بوتات').setDescription('عرض قائمة البوتات الخاصة بك'),
  new SlashCommandBuilder().setName('حصول_على_بريميوم').setDescription('معلومات حول الحصول على خدمة بريميوم'),
  new SlashCommandBuilder().setName('اضافة_بريميوم').setDescription('إضافة مستخدم إلى قائمة البريميوم (للمبرمج فقط)')
    .addStringOption(option => option.setName('user_id').setDescription('معرف المستخدم').setRequired(true)),
  new SlashCommandBuilder().setName('مساعدة').setDescription('عرض قائمة الأوامر المتاحة'),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function main() {
  try {
    console.log('بدء تسجيل أوامر التطبيقات (/).');

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );

    console.log('تم تسجيل أوامر التطبيقات (/) بنجاح.');
  } catch (error) {
    console.error('حدث خطأ أثناء تسجيل أوامر التطبيقات:', error);
  }

  client.login(TOKEN);
}

client.once('ready', () => {
    console.log('Discord bot is ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  switch (commandName) {
    case 'اضافة_بوت':
      await addBot(interaction);
      break;
    case 'تعديل_اسم_بوت':
      await changeBotName(interaction);
      break;
    case 'تشغيل_بوت':
      await startBot(interaction);
      break;
    case 'ايقاف_بوت':
      await stopBot(interaction);
      break;
    case 'حذف_بوت':
      await deleteBot(interaction);
      break;
    case 'قائمة_بوتات':
      await listBots(interaction);
      break;
    case 'حصول_على_بريميوم':
      await premiumInfo(interaction);
      break;
    case 'اضافة_بريميوم':
      await addPremium(interaction);
      break;
    case 'مساعدة':
      await showHelp(interaction);
      break;
    default:
      await interaction.reply('الأمر غير معروف.');
  }
});

async function addBot(interaction) {
  const ip = interaction.options.getString('ip');
  const port = interaction.options.getInteger('port') || 25565;
  let name = interaction.options.getString('name') || `بوت_${Date.now()}`; // تغيير const إلى let هنا

  if (!userBots[interaction.user.id]) {
    userBots[interaction.user.id] = [];
  }

  if (!premiumUsers.has(interaction.user.id) && userBots[interaction.user.id].length >= 2) {
    await interaction.reply('عذرًا، يمكنك إضافة بوتين فقط بدون اشتراك بريميوم.');
    return;
  }

  if (!premiumUsers.has(interaction.user.id)) {
    if (userBots[interaction.user.id].length === 0) {
      name = 'Sub_to_qMee';
    } else if (userBots[interaction.user.id].length === 1) {
      name = 'Bot_From_qMee';
    }
  }

  userBots[interaction.user.id].push({ ip, port, name, status: 'offline' });

  await interaction.reply(`تم إضافة البوت ${name} مع IP ${ip} و Port ${port}`);
}

async function changeBotName(interaction) {
  if (!premiumUsers.has(interaction.user.id)) {
    await interaction.reply('عذرًا، هذه الميزة متاحة فقط للمستخدمين البريميوم.');
    return;
  }

  const oldName = interaction.options.getString('old_name');
  const newName = interaction.options.getString('new_name');

  const userBotsList = userBots[interaction.user.id] || [];
  const bot = userBotsList.find(bot => bot.name === oldName);

  if (bot) {
    bot.name = newName;
    await interaction.reply(`تم تغيير اسم البوت من ${oldName} إلى ${newName}`);
  } else {
    await interaction.reply('لم يتم العثور على بوت بالاسم المحدد.');
  }
}

async function startBot(interaction) {
  const name = interaction.options.getString('name');
  const userBotsList = userBots[interaction.user.id] || [];
  const bot = userBotsList.find(bot => bot.name === name);

  if (bot) {
    if (bot.status === 'online') {
      await interaction.reply(`البوت ${name} قيد التشغيل بالفعل.`);
      return;
    }

    await interaction.deferReply();

    try {
      const mcBot = createMinecraftBot(bot.ip, bot.port, bot.name);
      
      mcBot.once('spawn', () => {
        bot.status = 'online';
        bot.instance = mcBot;
        interaction.editReply(`تم تشغيل البوت ${name} بنجاح وانضم إلى الخادم.`);
      });

      mcBot.on('error', (err) => {
        bot.status = 'error';
        interaction.editReply(`حدث خطأ أثناء تشغيل البوت ${name}: ${err.message}`);
      });

      // إضافة مهلة زمنية للاتصال
      setTimeout(() => {
        if (bot.status !== 'online') {
          mcBot.end();
          interaction.editReply(`فشل في الاتصال بالخادم للبوت ${name}. تأكد من صحة عنوان IP ورقم المنفذ.`);
        }
      }, 60000); // زيادة المهلة إلى 60 ثانية

    } catch (error) {
      await interaction.editRepy(`فشل في تشغيل البوت ${name}: ${error.message}`);
    }
  } else {
    await interaction.reply('لم يتم العثور على بوت بالاسم المحدد.');
  }
}
async function stopBot(interaction) {
  const name = interaction.options.getString('name');
  const userBotsList = userBots[interaction.user.id] || [];
  const bot = userBotsList.find(bot => bot.name === name);

  if (bot && bot.instance) {
    bot.instance.end();
    bot.status = 'offline';
    bot.instance = null;
    await interaction.reply(`تم إيقاف البوت ${name}.`);
  } else if (bot && bot.status === 'reconnecting') {
    bot.status = 'offline';
    await interaction.reply(`تم إيقاف محاولات إعادة اتصال البوت ${name}.`);
  } else {
    await interaction.reply('لم يتم العثور على بوت نشط بالاسم المحدد.');
  }
}

async function deleteBot(interaction) {
  const name = interaction.options.getString('name');
  const userBotsList = userBots[interaction.user.id] || [];
  const botIndex = userBotsList.findIndex(bot => bot.name === name);

  if (botIndex !== -1) {
    userBots[interaction.user.id].splice(botIndex, 1);
    await interaction.reply(`تم حذف البوت ${name}.`);
  } else {
    await interaction.reply('لم يتم العثور على بوت بالاسم المحدد.');
  }
}

async function listBots(interaction) {
  const bots = userBots[interaction.user.id] || [];
  if (bots.length === 0) {
    await interaction.reply('لا توجد بوتات مضافة.');
  } else {
    const botList = bots.map(bot => `- ${bot.name} (IP: ${bot.ip}, Port: ${bot.port}, الحالة: ${bot.status})`).join('\n');
    await interaction.reply(`قائمة البوتات الخاصة بك:\n${botList}`);
  }
}

async function premiumInfo(interaction) {
  await interaction.reply('للحصول على خدمة البريميوم، يرجى التواصل مع المبرمج (ID: 631741452367691778) وتحويل المبلغ المطلوب. تتيح لك الخدمة إضافة بوتات غير محدودة وتغيير أسماء البوتات.');
}

async function addPremium(interaction) {
  const userId = interaction.options.getString('user_id');
  if (interaction.user.id === '631741452367691778') {
    premiumUsers.add(userId);
    await interaction.reply(`تم إضافة المستخدم ${userId} إلى قائمة البريميوم.`);
  } else {
    await interaction.reply('ليس لديك الصلاحية لتنفيذ هذا الأمر.');
  }
}

async function showHelp(interaction) {
  await interaction.reply('قائمة الأوامر:\n/اضافة_بوت - إضافة بوت جديد\n/تعديل_اسم_بوت - تغيير اسم البوت (للبريميوم فقط)\n/تشغيل_بوت - تشغيل بوت\n/ايقاف_بوت - إيقاف بوت\n/حذف_بوت - حذف بوت\n/قائمة_بوتات - عرض قائمة البوتات\n/حصول_على_بريميوم - معلومات حول البريميوم\n/اضافة_بريميوم - إضافة مستخدم إلى قائمة البريميوم (للمبرمج فقط)\n/مساعدة - عرض قائمة الأوامر');
}

main();