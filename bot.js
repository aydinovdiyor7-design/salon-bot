const { Telegraf, Markup, session } = require('telegraf');
const http = require('http');

// --- SOZLAMALAR (SHU 2 TA QATORNI O'ZGARTIRING) ---
const BOT_TOKEN = '9108569388:AAHc5bNnfenigclGxQzQEeHvZQJMhA7dJc4';
const ADMIN_ID = 7592158961; // O'zingizning Telegram ID raqamingiz (@userinfobot dan olasiz)

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- VAQTINCHALIK MA'LUMOTLAR BAZASI ---
let services = [
  { id: 's1', name: '✂️ Soch turmaklash', price: '150 000 so\'m' },
  { id: 's2', name: '💅 Manikyur + Gel', price: '120 000 so\'m' },
  { id: 's3', name: '💄 Kechki makiyaj', price: '250 000 so\'m' },
  { id: 's4', name: '🧖‍♀️ Yuz tozalash (Chistka)', price: '200 000 so\'m' }
];

let masters = ['👩‍🎨 Malika (Sartarosh)', '👩‍🎨 Madina (Manikyur)', '👩‍🎨 Nilufar (Vizajist)'];
let bookings = [];

// --- 1. ASOSIY MENYU ---
function getMainMenu(userId) {
  const buttons = [
    ['💇‍♀️ Xizmatlar va Narxlar', '👩‍🎨 Ustalarimiz'],
    ['📅 Onlayn navbatga yozilish'],
    ['📍 Manzil va Aloqa', '📸 Ishlarimiz (Portfolio)']
  ];
  if (userId === ADMIN_ID) {
    buttons.push(['⚙️ Admin Panel']);
  }
  return Markup.keyboard(buttons).resize();
}

// --- 2. ADMIN PANEL MENYUSI ---
const adminMenu = Markup.keyboard([
  ['📊 Buyurtmalar ro\'yxati', '📢 Barchaga xabar (Rassilka)'],
  ['🔙 Asosiy menyuga qaytish']
]).resize();

// --- /START BUYRUĞİ ---
bot.start((ctx) => {
  ctx.session = {};
  ctx.reply(
    `Assalomu alaykum, **${ctx.from.first_name}**! ✨\n\n` +
    `Go'zallik salonimizning rasmiy botiga xush kelibsiz. Quyidagi menyudan kerakli bo'limni tanlang:`,
    { parse_mode: 'Markdown', ...getMainMenu(ctx.from.id) }
  );
});

// --- MIJOZ BO'LIMLARI ---
bot.hears('💇‍♀️ Xizmatlar va Narxlar', (ctx) => {
  let text = '✨ **Bizning xizmatlar va narxlar:**\n\n';
  services.forEach((s, index) => {
    text += `${index + 1}. ${s.name} — **${s.price}**\n`;
  });
  text += '\nNavbatga yozilish uchun pastdagi tugmani bosing:';

  ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📅 Hoziroq navbatga yozilish', 'start_booking')]
    ])
  });
});

bot.hears('👩‍🎨 Ustalarimiz', (ctx) => {
  ctx.reply(
    '🌟 **Bizning tajribali ustalarimiz:**\n\n' +
    '1. **Malika** — 6 yillik tajribaga ega stilist-sartarosh\n' +
    '2. **Madina** — Tirnoq dizayni ustasi\n' +
    '3. **Nilufar** — Professional vizajist',
    { parse_mode: 'Markdown' }
  );
});

bot.hears('📍 Manzil va Aloqa', (ctx) => {
  ctx.reply(
    '📍 **Manzilimiz:** Samarqand shahri, Amir Temur ko\'chasi, 45-uy.\n' +
    '🕒 **Ish vaqti:** 09:00 dan 20:00 gacha (dam olish kunlarisiz)\n' +
    '📞 **Telefon:** +998 90 123 45 67',
    { parse_mode: 'Markdown' }
  );
});

bot.hears('📸 Ishlarimiz (Portfolio)', (ctx) => {
  ctx.reply('📸 Bizning eng so‘nggi ishlarimizni Instagram sahifamizda ko‘rishingiz mumkin:\n👉 https://instagram.com');
});

// --- ONLAYN NAVBATGA YOZILISH ---
bot.hears('📅 Onlayn navbatga yozilish', (ctx) => startBookingFlow(ctx));
bot.action('start_booking', (ctx) => {
  ctx.answerCbQuery();
  startBookingFlow(ctx);
});

function startBookingFlow(ctx) {
  ctx.session = {};
  const serviceButtons = services.map((s) => [
    Markup.button.callback(`${s.name} (${s.price})`, `book_srv_${s.id}`)
  ]);
  ctx.reply('1-bosqich: **Xizmat turini tanlang:**', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(serviceButtons)
  });
}

bot.action(/book_srv_(.+)/, (ctx) => {
  const srvId = ctx.match[1];
  const selected = services.find((s) => s.id === srvId);
  ctx.session = { service: selected.name, price: selected.price };

  const masterButtons = masters.map((m, idx) => [
    Markup.button.callback(m, `book_mst_${idx}`)
  ]);

  ctx.editMessageText(
    `✅ Tanlandi: **${selected.name}**\n\n2-bosqich: **Ustani tanlang:**`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(masterButtons) }
  );
});

bot.action(/book_mst_(.+)/, (ctx) => {
  const mstIdx = ctx.match[1];
  ctx.session.master = masters[mstIdx];

  const times = ['10:00', '12:00', '14:00', '16:00', '18:00'];
  const timeButtons = [
    times.map((t) => Markup.button.callback(`🕒 ${t}`, `book_time_${t}`))
  ];

  ctx.editMessageText(
    `✅ Xizmat: **${ctx.session.service}**\n✅ Usta: **${ctx.session.master}**\n\n3-bosqich: **Qulay vaqtni tanlang:**`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(timeButtons) }
  );
});

bot.action(/book_time_(.+)/, (ctx) => {
  ctx.session.time = ctx.match[1];
  ctx.answerCbQuery();
  ctx.reply(
    '4-bosqich: Tasdiqlash uchun **telefon raqamingizni yuboring** (pastdagi tugmani bosing):',
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
        ['❌ Bekor qilish']
      ]).resize()
    }
  );
});

bot.on('contact', (ctx) => {
  if (!ctx.session || !ctx.session.service) return;

  const phone = ctx.message.contact.phone_number;
  const order = {
    client: ctx.from.first_name,
    phone: phone,
    service: ctx.session.service,
    master: ctx.session.master,
    time: ctx.session.time
  };
  bookings.push(order);

  ctx.reply(
    `🎉 **Tabriklaymiz! Navbatingiz tasdiqlandi.**\n\n` +
    `💇‍♀️ Xizmat: ${order.service}\n` +
    `👩‍🎨 Usta: ${order.master}\n` +
    `🕒 Vaqt: Bugun soat ${order.time}\n` +
    `📞 Raqamingiz: ${order.phone}\n\n` +
    `Sizni salonimizda kutamiz! ✨`,
    { parse_mode: 'Markdown', ...getMainMenu(ctx.from.id) }
  );

  bot.telegram.sendMessage(
    ADMIN_ID,
    `🔔 **YANGI BUYURTMA!**\n\n` +
    `👤 Mijoz: ${order.client}\n` +
    `📞 Tel: ${order.phone}\n` +
    `💇‍♀️ Xizmat: ${order.service}\n` +
    `👩‍🎨 Usta: ${order.master}\n` +
    `🕒 Vaqt: ${order.time}`,
    { parse_mode: 'Markdown' }
  ).catch(() => {});

  ctx.session = {};
});

bot.hears('❌ Bekor qilish', (ctx) => {
  ctx.session = {};
  ctx.reply('Buyurtma bekor qilindi.', getMainMenu(ctx.from.id));
});

// --- ADMIN PANEL ---
bot.hears('⚙️ Admin Panel', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.reply('⚙️ **Admin boshqaruv paneliga xush kelibsiz!**', {
    parse_mode: 'Markdown',
    ...adminMenu
  });
});

bot.hears('📊 Buyurtmalar ro\'yxati', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  if (bookings.length === 0) {
    return ctx.reply('Hozircha yangi buyurtmalar yo‘q.');
  }
  let list = '📋 **Tushgan buyurtmalar:**\n\n';
  bookings.forEach((b, i) => {
    list += `${i + 1}. **${b.client}** (${b.phone}) — ${b.service} | ${b.master} | 🕒 ${b.time}\n`;
  });
  ctx.reply(list, { parse_mode: 'Markdown' });
});

bot.hears('📢 Barchaga xabar (Rassilka)', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.reply('Reklama yoki aksiya matnini yuborish uchun xabar oldiga `#reklama` so‘zini yozib yuboring.\nMasalan: `#reklama Bugun barcha xizmatlarga 20% chegirma!`');
});

bot.hears('🔙 Asosiy menyuga qaytish', (ctx) => {
  ctx.reply('Asosiy menyu:', getMainMenu(ctx.from.id));
});

// Render.com serveri uchun port ochish
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Salon bot ishlamoqda!');
}).listen(PORT);

bot.launch();
console.log('Go\'zallik saloni boti muvaffaqiyatli ishga tushdi!');
      
