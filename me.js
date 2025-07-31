/*
  تم تعديل الاستيراد لاستخدام مكتبة discord.js-selfbot-v13
  التي تدعم توكن الحساب الشخصي (selfbot)
*/
const { Client } = require('discord.js-selfbot-v13');
// GatewayIntentBits غير متوفر في discord.js-selfbot-v13 لذلك نستخدم القيم الرقمية مباشرة
const GatewayIntentBits = {
  Guilds: 1,
  GuildMembers: 2,
  GuildVoiceStates: 128,
  GuildMessages: 512,
  GuildMessageReactions: 1024,
};

const { joinVoiceChannel } = require('@discordjs/voice');
let fetch;
(async () => {
  fetch = (await import('node-fetch')).default;
})();

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Load config from external JSON file
let config = {};
try {
  const configPath = path.resolve(__dirname, 'config.json');
  const configData = fs.readFileSync(configPath, 'utf-8');
  config = JSON.parse(configData);
  console.log('تم تحميل ملف التكوين بنجاح.');
} catch (error) {
  console.error('خطأ في تحميل ملف التكوين:', error);
}
// Added fetch for avatar update

const accounts = config.accounts.map((acc, index) => ({
  token: process.env[`DISCORD_TOKEN_${index + 1}`],
  channelId: acc.channelId,
  guildId: acc.guildId,
  allowedUserId: acc.allowedUserId,
}));

// تخزين العملاء (clients) لكل حساب
const clients = [];

// قائمة حالات متغيرة تلقائياً لكل حساب
const autoActivities = config.autoActivities || [];

// دالة لإنشاء عميل جديد لكل حساب وضبط الأحداث
function createClient(account) {
  const client = new Client({
    checkUpdate: false,
    intents: 0, // Disable intents to avoid deprecation warning in discord.js-selfbot-v13
  });

  let voiceConnection = null;
  let autoActivityIndex = 0;
  let autoActivityInterval = null;
  let currentVoiceChannel = null;

  async function updateActivity(name, type = 0) {
    if (typeof name !== 'string' || name.length === 0 || name.length > 128) {
      console.error(`[${client.user?.tag || 'Unknown'}] نشاط غير صالح: يجب أن يكون نص النشاط نصًا غير فارغ وأقل من 128 حرفًا.`);
      return;
    }
    try {
      await client.user.setPresence({
        activities: [{ name, type }],
      });
      console.log(`[${client.user.tag}] تم تحديث النشاط إلى: ${name}`);
    } catch (error) {
      console.error(`[${client.user.tag}] خطأ في تحديث النشاط:`, error);
    }
  }

  function startAutoActivity(intervalMs = 10000) {
    if (autoActivityInterval) clearInterval(autoActivityInterval);
    autoActivityInterval = setInterval(async () => {
      const activity = autoActivities[autoActivityIndex];
      try {
        await client.user.setPresence({
          activities: [activity],
        });
      } catch (error) {
        console.error(`[${client.user.tag}] خطأ في تعيين النشاط التلقائي:`, error);
      }
      autoActivityIndex = (autoActivityIndex + 1) % autoActivities.length;
    }, intervalMs);
  }

  async function setDefaultActivity() {
    try {
      if (autoActivities.length > 0) {
        await client.user.setPresence({
          activities: [autoActivities[0]],
        });
        console.log(`[${client.user.tag}] تم تحديث النشاط إلى ${autoActivities[0].name}.`);
      }
    } catch (error) {
      console.error(`[${client.user.tag}] خطأ في تحديث النشاط:`, error);
    }
  }

  // تم تعطيل تعيين صورة البروفايل لمنع تغيير الصورة
  async function setDefaultAvatar() {
    console.log(`[${client.user?.tag || 'Unknown'}] تم تعطيل تغيير صورة البروفايل بناءً على طلب المستخدم.`);
  }

  client.on('ready', async () => {
    console.log(`تم تسجيل الدخول كـ ${client.user.tag}!`);
    try {
      await client.user.setPresence({
        status: 'online',
        activities: [{ name: 'متصل', type: 0 }],
      });
      console.log(`[${client.user.tag}] تم تحديث حالة العضو (presence).`);
    } catch (error) {
      console.error(`[${client.user.tag}] خطأ في تحديث حالة العضو:`, error);
    }

    await setDefaultAvatar();
    await setDefaultActivity();
    startAutoActivity(15000);

    // الانضمام التلقائي للروم الصوتي
    try {
      if (voiceConnection && voiceConnection.state.status === 'ready') {
        console.log(`[${client.user.tag}] متصل بالفعل بالروم الصوتي.`);
        return;
      }
      const channel = await client.channels.fetch(account.channelId);
      if (channel && channel.type === 'GUILD_VOICE') {
        const connection = joinVoiceChannel({
          channelId: account.channelId,
          guildId: account.guildId,
          adapterCreator: channel.guild.voiceAdapterCreator,
        });
        voiceConnection = connection;
        console.log(`[${client.user.tag}] تم الانضمام تلقائياً إلى الروم الصوتي.`);
      } else {
        console.error(`[${client.user.tag}] القناة غير موجودة أو ليست روم صوتي.`);
      }
    } catch (error) {
      console.error(`[${client.user.tag}] خطأ أثناء الانضمام التلقائي للروم الصوتي:`, error);
    }
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.channelId && !newState.channelId && oldState.id === client.user.id) {
      console.log(`[${client.user.tag}] تم قطع الاتصال من الروم الصوتي.`);
      currentVoiceChannel = null;
      console.log(`[${client.user.tag}] محاولة إعادة الاتصال بالروم الصوتي بعد الانقطاع...`);
      try {
        const channel = await client.channels.fetch(account.channelId);
        if (channel && channel.type === 'GUILD_VOICE') {
          const connection = joinVoiceChannel({
            channelId: account.channelId,
            guildId: account.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
          });
          voiceConnection = connection;
          console.log(`[${client.user.tag}] تم إعادة الاتصال تلقائياً بالروم الصوتي.`);
        } else {
          console.error(`[${client.user.tag}] القناة غير موجودة أو ليست روم صوتي.`);
        }
      } catch (error) {
        console.error(`[${client.user.tag}] خطأ أثناء محاولة إعادة الاتصال بالروم الصوتي:`, error);
      }
    }
    if (newState.channelId && newState.id === client.user.id) {
      currentVoiceChannel = newState.channelId;
      console.log(`[${client.user.tag}] تم الانضمام إلى الروم الصوتي: ${currentVoiceChannel}`);
    }
  });

  client.on('messageCreate', async (message) => {
    if (message.guild?.id !== account.guildId) return;
    if (message.channel.id !== account.channelId) return;
    if (message.author.id !== account.allowedUserId) return;

    if (message.content === '!ping') {
      try {
        await message.channel.send('Pong!');
        console.log(`[${client.user.tag}] تم الرد على أمر !ping`);
      } catch (error) {
        console.error(`[${client.user.tag}] خطأ في الرد على الرسالة:`, error);
      }
    }

    if (message.content.startsWith('!activity ')) {
      const activityText = message.content.slice('!activity '.length).trim();
      if (activityText.length === 0 || activityText.length > 128) {
        await message.channel.send('نص النشاط غير صالح. يجب أن يكون بين 1 و 128 حرفًا.');
        return;
      }
      await updateActivity(activityText, 3);
    }

    if (message.content.startsWith('!avatar ')) {
      const url = message.content.slice('!avatar '.length).trim();
      if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(url)) {
        await message.channel.send('رابط الصورة غير صالح. يجب أن يكون رابطًا مباشرًا لصورة (jpg, jpeg, png, gif).');
        return;
      }
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('فشل في جلب الصورة من الرابط.');
        }
        const buffer = await response.arrayBuffer();
        await client.user.setAvatar(Buffer.from(buffer));
        await message.channel.send('تم تحديث صورة البروفايل بنجاح.');
        console.log(`[${client.user.tag}] تم تحديث صورة البروفايل.`);
      } catch (error) {
        console.error(`[${client.user.tag}] خطأ في تحديث صورة البروفايل:`, error);
        if (error.message && error.message.includes('CAPTCHA')) {
          await message.channel.send('لا يمكن تحديث صورة البروفايل تلقائياً بسبب متطلبات CAPTCHA من Discord. يرجى تغيير الصورة يدوياً.');
        } else {
          await message.channel.send('حدث خطأ أثناء تحديث صورة البروفايل.');
        }
      }
    }

    if (message.content === '!autoactivity off') {
      if (autoActivityInterval) {
        clearInterval(autoActivityInterval);
        autoActivityInterval = null;
        await message.channel.send('تم إيقاف تغيير النشاط التلقائي.');
      }
    }
    if (message.content === '!autoactivity on') {
      if (!autoActivityInterval) {
        startAutoActivity(15000);
        await message.channel.send('تم تفعيل تغيير النشاط التلقائي.');
      }
    }
  });

  process.on('SIGINT', () => {
    console.log(`[${client.user.tag}] جاري إغلاق الاتصال...`);
    process.exit();
  });

  if (!account.token) {
    console.error(`توكن الحساب غير معرف. يرجى التحقق من متغيرات البيئة.`);
  } else {
    client.login(account.token).catch((error) => {
      console.error(`فشل تسجيل الدخول للحساب ${account.token.substring(0, 10)}...:`, error);
    });
  }

  return client;
}

// إنشاء العملاء لكل حساب
for (const account of accounts) {
  const client = createClient(account);
  clients.push(client);
}
