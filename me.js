/**
 * @fileoverview Script الرئيسي لتشغيل self-bot متعدد الحسابات على Discord.
 * يقوم هذا السكريبت بإدارة عدة حسابات، والانضمام إلى قنوات صوتية، وتحديث الحالة تلقائيًا،
 * والاستجابة لأوامر محددة من مستخدم مسموح له.
 */

// =================================================================
// 1. استيراد المكتبات والإعدادات الأولية
// =================================================================

const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

// node-fetch v3+ هو ESM-only, لذلك نحتاج لاستيراده بشكل ديناميكي في بيئة CommonJS
let fetch;
import('node-fetch').then(nodeFetch => {
  fetch = nodeFetch.default;
});


// =================================================================
// 2. تحميل ملف التكوين (Configuration)
// =================================================================

/**
 * يقوم بتحميل إعدادات البوت من ملف config.json.
 * @returns {object} كائن يحتوي على إعدادات البوت.
 */
function loadConfig() {
  try {
    const configPath = path.resolve(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    console.log('تم تحميل ملف التكوين بنجاح.');
    return JSON.parse(configData);
  } catch (error) {
    console.error('خطأ فادح: لا يمكن تحميل ملف التكوين "config.json".', error);
    // إنهاء العملية إذا لم يتم العثور على ملف التكوين، لأن السكريبت لا يمكنه العمل بدونه.
    process.exit(1);
  }
}

const config = loadConfig();
const accounts = config.accounts || [];
const autoActivities = config.autoActivities || [];


// =================================================================
// 3. الدالة الرئيسية لإنشاء وإدارة كل عميل (Client)
// =================================================================

/**
 * يقوم بإنشاء وتهيئة عميل Discord جديد لكل حساب.
 * @param {object} account - معلومات الحساب (token, channelId, guildId, allowedUserId).
 */
function createClient(account) {
  const client = new Client({
    checkUpdate: false, // تعطيل التحقق من التحديثات لتجنب الرسائل غير المرغوب فيها
  });

  // متغيرات خاصة بكل عميل لإدارة حالته
  let voiceConnection = null;
  let autoActivityInterval = null;

  // --- دوال مساعدة ---

  /**
   * الانضمام إلى القناة الصوتية المحددة في الإعدادات.
   */
  async function joinVoice() {
    try {
      const channel = await client.channels.fetch(account.channelId);
      if (channel && channel.type === 'GUILD_VOICE') {
        voiceConnection = joinVoiceChannel({
          channelId: account.channelId,
          guildId: account.guildId,
          adapterCreator: channel.guild.voiceAdapterCreator,
          selfDeaf: true, // الانضمام مع كتم الصوت ذاتيًا
          selfMute: false, // الانضمام مع عدم كتم الميكروفون ذاتيًا
        });
        console.log(`[${client.user.tag}] تم الانضمام إلى القناة الصوتية: ${channel.name}`);
      } else {
        console.error(`[${client.user.tag}] القناة الصوتية المحددة (${account.channelId}) غير موجودة أو ليست قناة صوتية.`);
      }
    } catch (error) {
      console.error(`[${client.user.tag}] خطأ أثناء الانضمام للقناة الصوتية:`, error);
    }
  }

  /**
   * تحديث نشاط (الحالة) للحساب.
   * @param {string} name - اسم النشاط.
   * @param {number} type - نوع النشاط (e.g., 0: Playing, 3: Watching).
   */
  async function updateActivity(name, type = 0) {
    if (typeof name !== 'string' || name.length === 0 || name.length > 128) {
      console.error(`[${client.user?.tag}] اسم النشاط غير صالح.`);
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

  /**
   * بدء دورة تحديث النشاط التلقائي.
   * @param {number} intervalMs - الفترة الزمنية للتحديث بالمللي ثانية.
   */
  function startAutoActivity(intervalMs = 15000) {
    if (autoActivities.length === 0) return;
    if (autoActivityInterval) clearInterval(autoActivityInterval);

    let currentIndex = 0;
    const update = async () => {
      const activity = autoActivities[currentIndex];
      await updateActivity(activity.name, activity.type);
      currentIndex = (currentIndex + 1) % autoActivities.length;
    };

    autoActivityInterval = setInterval(update, intervalMs);
    update(); // للتحديث الفوري عند البدء
  }

  /**
   * إيقاف دورة تحديث النشاط التلقائي.
   */
  function stopAutoActivity() {
    if (autoActivityInterval) {
      clearInterval(autoActivityInterval);
      autoActivityInterval = null;
    }
  }

  // --- معالجات الأوامر ---

  const commands = {
    '!ping': (message) => {
      message.channel.send('Pong!');
      console.log(`[${client.user.tag}] تم الرد على أمر !ping.`);
    },
    '!activity': async (message, args) => {
      const activityText = args.join(' ');
      if (activityText.length === 0 || activityText.length > 128) {
        message.channel.send('نص النشاط غير صالح. يجب أن يكون بين 1 و 128 حرفًا.');
        return;
      }
      stopAutoActivity(); // إيقاف النشاط التلقائي عند تعيين نشاط يدوي
      await updateActivity(activityText, 3); // 3 = Watching
      message.channel.send(`تم تغيير النشاط إلى: ${activityText}`);
    },
    '!avatar': async (message, args) => {
      const url = args[0];
      if (!url || !/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(url)) {
        message.channel.send('رابط الصورة غير صالح. يجب أن يكون رابطًا مباشرًا لصورة.');
        return;
      }
      try {
        if (!fetch) {
          throw new Error('مكتبة node-fetch غير جاهزة بعد.');
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل في جلب الصورة من الرابط.');

        const buffer = await response.arrayBuffer();
        await client.user.setAvatar(Buffer.from(buffer));
        message.channel.send('تم تحديث صورة البروفايل بنجاح.');
        console.log(`[${client.user.tag}] تم تحديث صورة البروفايل.`);
      } catch (error) {
        console.error(`[${client.user.tag}] خطأ في تحديث صورة البروفايل:`, error);
        const errorMessage = error.message?.includes('CAPTCHA')
          ? 'لا يمكن تحديث الصورة تلقائياً بسبب متطلبات CAPTCHA. يرجى تغييرها يدوياً.'
          : 'حدث خطأ أثناء تحديث صورة البروفايل.';
        message.channel.send(errorMessage);
      }
    },
    '!autoactivity': (message, args) => {
      const state = args[0]?.toLowerCase();
      if (state === 'on') {
        startAutoActivity();
        message.channel.send('تم تفعيل تغيير النشاط التلقائي.');
      } else if (state === 'off') {
        stopAutoActivity();
        message.channel.send('تم إيقاف تغيير النشاط التلقائي.');
      } else {
        message.channel.send('استخدام غير صحيح. !autoactivity on/off');
      }
    },
  };

  // --- معالجات الأحداث (Event Handlers) ---

  /**
   * يتم تفعيله عندما يكون العميل جاهزًا.
   */
  async function onReady() {
    console.log(`تم تسجيل الدخول بنجاح كـ ${client.user.tag}!`);
    await client.user.setPresence({ status: 'online' });

    // الانضمام للقناة الصوتية وبدء النشاط التلقائي
    await joinVoice();
    startAutoActivity();
  }

  /**
   * يتم تفعيله عند تحديث حالة صوتية (مثل الانضمام أو مغادرة قناة).
   */
  function onVoiceStateUpdate(oldState, newState) {
    // إذا تم فصل البوت من القناة الصوتية، حاول إعادة الاتصال
    if (oldState.channelId && !newState.channelId && oldState.id === client.user.id) {
      console.log(`[${client.user.tag}] تم قطع الاتصال من القناة الصوتية. محاولة إعادة الاتصال...`);
      voiceConnection?.destroy(); // تدمير الاتصال القديم
      voiceConnection = null;
      setTimeout(joinVoice, 5000); // إعادة الاتصال بعد 5 ثوانٍ
    }
  }

  /**
   * يتم تفعيله عند وصول رسالة جديدة.
   */
  async function onMessageCreate(message) {
    // التحقق من أن الرسالة من المستخدم المسموح له وفي السيرفر والقناة المحددين
    if (
      message.author.id !== account.allowedUserId ||
      message.guild?.id !== account.guildId ||
      message.channel.id !== account.channelId
    ) {
      return;
    }

    const [commandName, ...args] = message.content.trim().split(/\s+/);
    const command = commands[commandName];

    if (command) {
      try {
        await command(message, args);
      } catch (error) {
        console.error(`[${client.user.tag}] خطأ أثناء تنفيذ الأمر "${commandName}":`, error);
        message.channel.send('حدث خطأ أثناء تنفيذ الأمر.');
      }
    }
  }

  // ربط المعالجات بالأحداث
  client.on('ready', onReady);
  client.on('voiceStateUpdate', onVoiceStateUpdate);
  client.on('messageCreate', onMessageCreate);

  // --- تسجيل الدخول ومعالجة إغلاق العملية ---

  /**
   * تسجيل الدخول باستخدام توكن الحساب.
   */
  function login() {
    if (!account.token) {
      console.error(`[Account ${account.allowedUserId}] خطأ: التوكن غير موجود. يرجى التحقق من ملف .env`);
      return;
    }
    client.login(account.token).catch(error => {
      console.error(`[Account ${account.allowedUserId}] فشل تسجيل الدخول:`, error.message);
    });
  }

  process.on('SIGINT', () => {
    console.log(`[${client.user?.tag || 'Client'}] جاري إغلاق الاتصال...`);
    client.destroy();
    process.exit();
  });

  login();
}


// =================================================================
// 4. بدء تشغيل السكريبت
// =================================================================

if (accounts.length === 0) {
  console.warn('لا توجد حسابات معرفة في ملف config.json. لن يتم تشغيل أي بوت.');
} else {
  console.log(`تم العثور على ${accounts.length} حساب. بدء تشغيل العملاء...`);
  // استخراج التوكنات من متغيرات البيئة وإضافتها إلى كائنات الحسابات
  const configuredAccounts = accounts.map((acc, index) => ({
    ...acc,
    token: process.env[`DISCORD_TOKEN_${index + 1}`],
  }));

  for (const account of configuredAccounts) {
    createClient(account);
  }
}
