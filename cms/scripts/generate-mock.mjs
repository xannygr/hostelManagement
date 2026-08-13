#!/usr/bin/env node
/**
 * Генератор mock-данных для cms/data/mock.json.
 *
 * Проблема, которую он чинит: в старом mock.json у каждого гостя был ровно
 * один платёж независимо от длительности проживания (гость жил 5-10 месяцев,
 * но «заплатил» один раз). Здесь на каждый месяц проживания создаётся отдельный
 * платёж с суммой pricePerBed × число ночей, прожитых в этом месяце.
 *
 * Запуск: node cms/scripts/generate-mock.mjs  (перезапишет mock.json)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_PATH = path.join(__dirname, '..', 'data', 'mock.json');

// Эталонная дата «сегодня», от которой зависят статусы платежей.
const TODAY = '2026-08-13';

const data = JSON.parse(readFileSync(MOCK_PATH, 'utf8'));

const roomsById = new Map(data.rooms.map((r) => [r.id, r]));
const guestById = new Map(data.guests.map((g) => [g.id, g]));

function pad(n) {
  return String(n).padStart(2, '0');
}

// Дата `year-month-day`.
function date(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

// Сколько ночей из [checkIn, checkOut) попадает в календарный месяц.
function nightsInMonth(checkIn, checkOut, year, month) {
  const first = parseDate(checkIn);
  const last = parseDate(checkOut);
  const monthStartUtc = Date.UTC(year, month - 1, 1);
  const monthEndExclusiveUtc = Date.UTC(year, month, 1);
  const start = Math.max(Date.UTC(first.y, first.m - 1, first.d), monthStartUtc);
  const end = Math.min(Date.UTC(last.y, last.m - 1, last.d), monthEndExclusiveUtc);
  return Math.max(0, (end - start) / 86400000);
}

// День месяца, на который падает оплата (день заезда; в коротких месяцах — последний день).
function dueDay(year, month, checkInDay) {
  return Math.min(checkInDay, daysInMonth(year, month));
}

// Детерминированный «должник»: часть активных гостей с просроченным последним месяцем.
function hashId(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const types = ['card', 'cash', 'transfer'];
const payments = [];
let idSeq = 1;

for (const guest of data.guests) {
  const { checkIn, checkOut, status } = guest;
  const room = roomsById.get(guest.roomId);
  if (!room) continue;
  const price = room.pricePerBed;

  const ci = parseDate(checkIn);
  const co = parseDate(checkOut);

  let year = ci.y;
  let month = ci.m;

  const guestPayments = [];
  const isDebtor = status === 'active' && hashId(guest.id) % 37 === 0;
  while (year < co.y || (year === co.y && month <= co.m)) {
    const nights = nightsInMonth(checkIn, checkOut, year, month);
    if (nights <= 0) {
      if (year === co.y && month === co.m) break;
      year = month === 12 ? year + 1 : year;
      month = month === 12 ? 1 : month + 1;
      continue;
    }
    const amount = price * nights;
    // День оплаты — день заезда; в коротких месяцах — последний день месяца,
    // а в месяце выезда платёж приходится не позже даты выезда.
    const isCheckoutMonth = year === co.y && month === co.m;
    const due = isCheckoutMonth
      ? checkOut
      : date(year, month, dueDay(year, month, ci.d));

    let payStatus;
    if (status === 'checked_out' || status === 'reserved') {
      // Выселённые оплатили весь срок; забронированные ещё не заселились.
      payStatus = status === 'checked_out' ? 'paid' : 'pending';
    } else if (due <= TODAY) {
      payStatus = 'paid';
    } else {
      payStatus = 'pending';
    }

    const paidDate = payStatus === 'paid' ? due : null;

    guestPayments.push({
      id: String(idSeq++),
      guestId: guest.id,
      guestName: guest.name,
      roomId: guest.roomId,
      amount,
      dueDate: due,
      paidDate,
      type: types[hashId(`${guest.id}-${year}-${month}`) % 3],
      status: payStatus,
      smsSent: false,
    });

    year = month === 12 ? year + 1 : year;
    month = month === 12 ? 1 : month + 1;
  }

  // Небольшая детерминированная доля активных гостей — должники:
  // самый последний из уже наступивших месяцев просрочен.
  if (isDebtor) {
    for (let i = guestPayments.length - 1; i >= 0; i--) {
      if (guestPayments[i].status === 'paid') {
        guestPayments[i].status = 'overdue';
        guestPayments[i].paidDate = null;
        break;
      }
    }
  }

  payments.push(...guestPayments);

  const paid = guestPayments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0);
  const dueTotal = guestPayments
    .filter((p) => p.status === 'overdue' || (p.status === 'pending' && p.dueDate <= TODAY))
    .reduce((s, p) => s + p.amount, 0);
  guest.totalPaid = paid;
  guest.totalDue = dueTotal;
}

data.payments = payments;

writeFileSync(MOCK_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

const byStatus = payments.reduce((acc, p) => {
  acc[p.status] = (acc[p.status] ?? 0) + 1;
  return acc;
}, {});
const byGuestCount = payments.reduce((acc, p) => {
  acc[p.guestId] = (acc[p.guestId] ?? 0) + 1;
  return acc;
}, {});
const perGuest = Object.values(byGuestCount);
const min = Math.min(...perGuest);
const max = Math.max(...perGuest);
const mean = perGuest.reduce((s, n) => s + n, 0) / perGuest.length;

console.log(`mock.json regenerated`);
console.log(`  payments: ${payments.length} (was 530), by status: ${JSON.stringify(byStatus)}`);
console.log(`  payments per guest: min=${min} max=${max} mean=${mean.toFixed(2)}`);
console.log(`  guests: ${data.guests.length}`);
