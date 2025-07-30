require('dotenv').config();
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
// Added fetch for avatar update

// مصفوفة الحسابات مع التوكن، معرف الروم، معرف السيرفر، ومعرف المستخدم المسموح
const accounts = [
  {
    token: process.env.DISCORD_TOKEN_1,
    channelId: '1382350050478395522', // روم صوتي للحساب الأول
    guildId: '1299014062121685054',
    allowedUserId: '1353209547375775765',
  },
  // يمكن إضافة حسابات أخرى هنا بنفس الشكل
  // {
  //   token: process.env.DISCORD_TOKEN_2,
  //   channelId: 'روم_الحساب_الثاني',
  //   guildId: 'سيرفر_الحساب_الثاني',
  //   allowedUserId: 'معرف_المستخدم_المسموح_للحساب_الثاني',
  // },
];

// تخزين العملاء (clients) لكل حساب
const clients = [];

// قائمة حالات متغيرة تلقائياً لكل حساب
const autoActivities = [
  { name: 'Watching ss77', type: 3 },
];

// دالة لإنشاء عميل جديد لكل حساب وضبط الأحداث
function createClient(account) {
  const client = new Client({
    checkUpdate: false,
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
    ],
  });

  let voiceConnection = null;
  let autoActivityIndex = 0;
  let autoActivityInterval = null;
  let currentVoiceChannel = null;

  async function updateActivity(name, type = 0) {
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
        console.log(`[${client.user.tag}] تم تعيين النشاط تلقائياً: ${activity.name}`);
      } catch (error) {
        console.error(`[${client.user.tag}] خطأ في تعيين النشاط التلقائي:`, error);
      }
      autoActivityIndex = (autoActivityIndex + 1) % autoActivities.length;
    }, intervalMs);
  }

  async function setDefaultActivity() {
    try {
      await client.user.setPresence({
        activities: [{ name: 'Watching ss77', type: 3 }],
      });
      console.log(`[${client.user.tag}] تم تحديث النشاط إلى Watching ss77.`);
    } catch (error) {
      console.error(`[${client.user.tag}] خطأ في تحديث النشاط:`, error);
    }
  }

  async function setDefaultAvatar() {
    try {
      // يمكن تعيين صورة افتراضية هنا إذا رغبت
      console.log(`[${client.user.tag}] لم يتم تعيين صورة بروفايل افتراضية.`);
    } catch (error) {
      console.error(`[${client.user.tag}] خطأ في تعيين صورة البروفايل الافتراضية:`, error);
    }
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
      const activityText = message.content.slice('!activity '.length);
      await updateActivity(activityText, 3);
    }

    if (message.content.startsWith('!avatar ')) {
      const url = message.content.slice('!avatar '.length).trim();
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

  client.login(account.token).catch((error) => {
    console.error(`فشل تسجيل الدخول للحساب ${account.token.substring(0, 10)}...:`, error);
  });

  return client;
}

// إنشاء العملاء لكل حساب
for (const account of accounts) {
  const client = createClient(account);
  clients.push(client);
}
