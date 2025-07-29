require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client({
    checkUpdate: false
});

const CHANNEL_ID = '1382350050478395522'; // معرف القناة الجديدة لبوت التذاكر
const GUILD_ID = '1299014062121685054'; // معرف السيرفر المحدد

// معرف الحساب المسموح له بتنفيذ الأوامر
const ALLOWED_USER_ID = '1353209547375775765';

// عند تسجيل الدخول
client.on('ready', async () => {
    console.log(`تم تسجيل الدخول كـ ${client.user.tag}!`);
    try {
        await client.user.setPresence({
            status: 'online',
            activities: [{ name: 'متصل', type: 0 }],
        });
        console.log('تم تحديث حالة العضو (presence).');
    } catch (error) {
        console.error('خطأ في تحديث حالة العضو:', error);
    }
    await setDefaultAvatar();
    await setDefaultActivity();
    startAutoActivity(15000); // تغيير الحالة كل 15 ثانية
});

// دالة لتحديث النشاط (Activity) بشكل ديناميكي
async function updateActivity(name, type = 0) {
    try {
        await client.user.setPresence({
            activities: [{ name, type }],
        });
        console.log(`تم تحديث النشاط إلى: ${name}`);
    } catch (error) {
        console.error('خطأ في تحديث النشاط:', error);
    }
}

// مثال على استخدام الأمر لتغيير النشاط عبر رسالة في القناة
client.on('messageCreate', async (message) => {
    if (message.guild?.id !== GUILD_ID) return;
    if (message.channel.id !== CHANNEL_ID) return;
    if (message.author.id !== ALLOWED_USER_ID) return;

    if (message.content === '!ping') {
        try {
            await message.channel.send('Pong!');
            console.log('تم الرد على أمر !ping');
        } catch (error) {
            console.error('خطأ في الرد على الرسالة:', error);
        }
    }

    // أمر لتغيير النشاط، مثلاً: !activity Watching a movie
    if (message.content.startsWith('!activity ')) {
        const activityText = message.content.slice('!activity '.length);
        await updateActivity(activityText, 3); // 3 = Watching
    }

    // أمر لتغيير صورة البروفايل، مثلاً: !avatar <url>
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
            console.log('تم تحديث صورة البروفايل.');
        } catch (error) {
            console.error('خطأ في تحديث صورة البروفايل:', error);
            if (error.message && error.message.includes('CAPTCHA')) {
                await message.channel.send('لا يمكن تحديث صورة البروفايل تلقائياً بسبب متطلبات CAPTCHA من Discord. يرجى تغيير الصورة يدوياً.');
            } else {
                await message.channel.send('حدث خطأ أثناء تحديث صورة البروفايل.');
            }
        }
    }

    // أمر لإيقاف أو تشغيل التغيير التلقائي عبر رسالة
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

// قائمة حالات متغيرة تلقائياً
const autoActivities = [
    { name: 'Watching ss77', type: 3 },
];

let autoActivityIndex = 0;
let autoActivityInterval = null;

function startAutoActivity(intervalMs = 10000) {
    if (autoActivityInterval) clearInterval(autoActivityInterval);
    autoActivityInterval = setInterval(async () => {
        const activity = autoActivities[autoActivityIndex];
        try {
            await client.user.setPresence({
                activities: [activity],
            });
            console.log(`تم تعيين النشاط تلقائياً: ${activity.name}`);
        } catch (error) {
            console.error('خطأ في تعيين النشاط التلقائي:', error);
        }
        autoActivityIndex = (autoActivityIndex + 1) % autoActivities.length;
    }, intervalMs);
}

// أمر لتغيير النشاط (Activity) إلى Watching مع نص افتراضي
async function setDefaultActivity() {
    try {
        await client.user.setPresence({
            activities: [{ name: 'Watching ss77', type: 3 }], // 3 = Watching
        });
        console.log('تم تحديث النشاط إلى Watching ss77.');
    } catch (error) {
        console.error('خطأ في تحديث النشاط:', error);
    }
}

// تسجيل الدخول باستخدام التوكن الخاص بك
client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);

async function setDefaultAvatar() {
    try {
        // يمكن تعيين صورة افتراضية هنا إذا رغبت، مثلاً رابط لصورة
        // مثال: await client.user.setAvatar('https://example.com/default-avatar.png');
        console.log('لم يتم تعيين صورة بروفايل افتراضية.');
    } catch (error) {
        console.error('خطأ في تعيين صورة البروفايل الافتراضية:', error);
    }
}

client.on('ready', async () => {
    await setDefaultAvatar();
    await setDefaultActivity();
    startAutoActivity(15000); // تغيير الحالة كل 15 ثانية
});

// إدارة الموارد عند إيقاف السكربت
process.on('SIGINT', () => {
    console.log('جاري إغلاق الاتصال...');
    process.exit();
});
