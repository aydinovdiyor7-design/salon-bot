const { Telegraf, Markup, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- SOZLAMALAR (FAQAT SHU 2 TA QATORNI O'ZGARTIRING) ---
const BOT_TOKEN = '9108569388:AAHc5bNnfenigclGxQzQEeHvZQJMhA7dJc4';
const ADMIN_ID = 7592158961; // O'zingizning Telegram ID raqamingiz

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- MA'LUMOTLAR BAZASI (database.json) ---
const DB_FILE = './database.json';

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      services: [
        { id: 's1', name: '✂️ Soch turmaklash', price: '150 000 so\'m' },
        { id: 's2', name: '💅 Manikyur + Gel', price: '120 000 so\'m' },
        { id: 's3', name: '💄 Kechki makiyaj', price: '250 000 so\'m' },
        { id: 's4', name: '🧖‍♀️ Yuz tozalash (Chistka)', price: '200 000 so\'m' }
      ],
      masters: ['👩‍🎨 Malika (Sartarosh)', '👩‍🎨 Madina (Manikyur)', '👩‍🎨 Nilufar (Vizajist)'],
      bookings: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- MENYULAR ---
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

const adminMenu = Markup.keyboard([
  ['📊 Buyurtmalar', '👥 Statistika'],
  ['➕ Xizmat qo\'shish', '🗑 Xizmatni o\'chirish'],
  ['📢 Rassilka (Barchaga xabar)'],
  ['🔙 Asosiy menyuga qaytish']
]).resize();

// --- /START ---
bot.start((ctx) => {
  ctx.session = {};
  const db = loadDB();
  if (!db.users.includes(ctx.from.id)) {
    db.users.push(ctx.from.id);
    saveDB(db);
  }

  ctx.reply(
    `Assalomu alaykum, **${ctx.from.first_name}**! ✨\n\n` +
    `Go'zallik salonimizning rasmiy botiga xush kelibsiz. Quyidagi menyudan kerakli bo'limni tanlang:`,
    { parse_mode: 'Markdown', ...getMainMenu(ctx.from.id) }
  );
});

// --- MIJOZ BO'LIMLARI ---
bot.hears('💇‍♀️ Xizmatlar va Narxlar', (ctx) => {
  const db = loadDB();
  if (db.services.length === 0) {
    return ctx.reply('Hozircha xizmatlar ro‘yxati bo‘sh.');
  }
  let text = '✨ **Bizning xizmatlar va narxlar:**\n\n';
  db.services.forEach((s, index) => {
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
  const db = loadDB();
  let text = '🌟 **Bizning tajribali ustalarimiz:**\n\n';
  db.masters.forEach((m, i) => {
    text += `${i + 1}. ${m}\n`;
  });
  ctx.reply(text, { parse_mode: 'Markdown' });
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
  ctx.reply('📸 Eng so‘nggi ishlarimizni Instagram sahifamizda ko‘ring:\n👉 https://instagram.com');
});
// --- ONLAYN NAVBATGA YOZILISH ---
bot.hears('📅 Onlayn navbatga yozilish', (ctx) => startBookingFlow(ctx));
bot.action('start_booking', (ctx) => {
  ctx.answerCbQuery();
  startBookingFlow(ctx);
});

function startBookingFlow(ctx) {
  ctx.session = {};
  const db = loadDB();
  if (db.services.length === 0) {
    return ctx.reply('Hozircha band qilish uchun xizmatlar mavjud emas.');
  }
  const serviceButtons = db.services.map((s) => [
    Markup.button.callback(`${s.name} (${s.price})`, `book_srv_${s.id}`)
  ]);
  ctx.reply('1-bosqich: **Xizmat turini tanlang:**', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(serviceButtons)
  });
}

bot.action(/book_srv_(.+)/, (ctx) => {
  const db = loadDB();
  const srvId = ctx.match[1];
  const selected = db.services.find((s) => s.id === srvId);
  if (!selected) return ctx.answerCbQuery('Xizmat topilmadi');

  ctx.session = { service: selected.name, price: selected.price };
  const masterButtons = db.masters.map((m, idx) => [
    Markup.button.callback(m, `book_mst_${idx}`)
  ]);

  ctx.editMessageText(
    `✅ Tanlandi: **${selected.name}**\n\n2-bosqich: **Ustani tanlang:**`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(masterButtons) }
  );
});

bot.action(/book_mst_(.+)/, (ctx) => {
  const db = loadDB();
  const mstIdx = ctx.match[1];
  ctx.session.master = db.masters[mstIdx];

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

  const db = loadDB();
  const phone = ctx.message.contact.phone_number;
  const order = {
    client: ctx.from.first_name,
    phone: phone,
    service: ctx.session.service,
    master: ctx.session.master,
    time: ctx.session.time,
    date: new Date().toLocaleDateString('uz-UZ')
  };
  db.bookings.push(order);
  saveDB(db);

  ctx.reply(
    `🎉 **Tabriklaymiz! Navbatingiz tasdiqlandi.**\n\n` +
    `💇‍♀️ Xizmat: ${order.service}\n` +
    `👩‍🎨 Usta: ${order.master}\n` +
    `🕒 Vaqt: Soat ${order.time}\n` +
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
  ctx.reply('Amal bekor qilindi.', getMainMenu(ctx.from.id));
});

// --- ADMIN PANEL FUNKSIYALARI ---
bot.hears('⚙️ Admin Panel', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.session = {};
  ctx.reply('⚙️ **Admin boshqaruv paneliga xush kelibsiz!**', {
    parse_mode: 'Markdown',
    ...adminMenu
  });
});

bot.hears('📊 Buyurtmalar', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const db = loadDB();
  if (db.bookings.length === 0) {
    return ctx.reply('Hozircha buyurtmalar yo‘q.');
  }
  let list = '📋 **Oxirgi buyurtmalar:**\n\n';
  db.bookings.slice(-15).forEach((b, i) => {
    list += `${i + 1}. **${b.client}** (${b.phone})\n   └ ${b.service} | ${b.master} | 🕒 ${b.time}\n`;
  });
  ctx.reply(list, { parse_mode: 'Markdown' });
});

bot.hears('👥 Statistika', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const db = loadDB();
  ctx.reply(
    `📊 **Bot statistikasi:**\n\n` +
    `👤 Jami foydalanuvchilar: **${db.users.length} ta**\n` +
    `📅 Jami buyurtmalar: **${db.bookings.length} ta**\n` +
    `💇‍♀️ Faol xizmatlar: **${db.services.length} ta**`,
    { parse_mode: 'Markdown' }
  );
});

bot.hears('➕ Xizmat qo\'shish', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.session = { adminStep: 'add_service' };
  ctx.reply(
    'Yangi xizmat nomi va narxini **`Nomi - Narxi`** ko‘rinishida yuboring.\n\n' +
    'Masalan: `💅 Pedikyur - 140 000 so\'m`',
    { parse_mode: 'Markdown' }
  );
});

bot.hears('🗑 Xizmatni o\'chirish', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const db = loadDB();
  if (db.services.length === 0) return ctx.reply('O‘chirish uchun xizmat yo‘q.');

  const delButtons = db.services.map((s) => [
    Markup.button.callback(`❌ ${s.name} (${s.price})`, `del_srv_${s.id}`)
  ]);
  ctx.reply('O‘chirmoqchi bo‘lgan xizmatni tanlang:', Markup.inlineKeyboard(delButtons));
});

bot.action(/del_srv_(.+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const db = loadDB();
  const srvId = ctx.match[1];
  db.services = db.services.filter((s) => s.id !== srvId);
  saveDB(db);
  ctx.editMessageText('✅ Xizmat muvaffaqiyatli o‘chirildi!');
});

bot.hears('📢 Rassilka (Barchaga xabar)', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.session = { adminStep: 'broadcast' };
  ctx.reply('Barcha mijozlarga yuboriladigan xabar matnini yozib yuboring (bekor qilish uchun /start bosing):');
});

bot.hears('🔙 Asosiy menyuga qaytish', (ctx) => {
  ctx.session = {};
  ctx.reply('Asosiy menyu:', getMainMenu(ctx.from.id));
});

bot.on('text', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID || !ctx.session || !ctx.session.adminStep) return;

  const db = loadDB();

  if (ctx.session.adminStep === 'add_service') {
    const parts = ctx.message.text.split('-');
    if (parts.length < 2) {
      return ctx.reply('❌ Xato format! Iltimos, chiziqcha bilan yozing.\nMasalan: `💅 Pedikyur - 140 000 so\'m`', { parse_mode: 'Markdown' });
    }
    const name = parts[0].trim();
    const price = parts.slice(1).join('-').trim();
    db.services.push({ id: 's' + Date.now(), name, price });
    saveDB(db);
    ctx.session = {};
    return ctx.reply(`✅ Yangi xizmat qo‘shildi:\n**${name}** — ${price}`, { parse_mode: 'Markdown', ...adminMenu });
  }

  if (ctx.session.adminStep === 'broadcast') {
    const msg = ctx.message.text;
    ctx.session = {};
    let sentCount = 0;

    await ctx.reply(`⏳ Xabar ${db.users.length} ta foydalanuvchiga yuborilmoqda...`);
    for (const uid of db.users) {
      try {
        await bot.telegram.sendMessage(uid, `📢 **YANGILIK / AKSIYA!**\n\n${msg}`, { parse_mode: 'Markdown' });
        sentCount++;
      } catch (e) {}
    }
    return ctx.reply(`✅ Xabar **${sentCount} ta** mijozga muvaffaqiyatli yetkazildi!`, { parse_mode: 'Markdown', ...adminMenu });
  }
});

// Server porti
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Salon bot 24/7 ishlamoqda!');
}).listen(PORT);

bot.launch();
console.log('Mukammal Go\'zallik saloni boti ishga tushdi!');
    
