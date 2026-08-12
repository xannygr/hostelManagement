import { useState } from 'react';
import { User, Building2, Bell, Lock, Save, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import { changePassword } from '../api';
import PasswordInput from '../components/PasswordInput';

type Tab = 'profile' | 'hostels' | 'notifications' | 'security';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'profile', icon: <User size={18} />, label: 'Профиль' },
    { key: 'hostels', icon: <Building2 size={18} />, label: 'Хостелы' },
    { key: 'notifications', icon: <Bell size={18} />, label: 'Уведомления' },
    { key: 'security', icon: <Lock size={18} />, label: 'Безопасность' },
  ];

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
          <p className="text-gray-500 mt-1">Управление аккаунтом и настройками</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saved ? 'Сохранено!' : 'Сохранить изменения'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-56 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'hostels' && <HostelsTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const [name, setName] = useState('Admin Kowalski');
  const [email, setEmail] = useState('admin@hostelman.pl');
  const [phone, setPhone] = useState('+48 500 100 200');
  const [company, setCompany] = useState('Kowalski Hostels Sp. z o.o.');
  const [nip, setNip] = useState('PL 1234567890');

  return (
    <div className="space-y-6">
      <Card title="Личные данные" subtitle="Основная информация">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
            AK
          </div>
          <div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              Изменить фото
            </button>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG. Макс. 2МБ</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Имя и фамилия" value={name} onChange={setName} />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Телефон" value={phone} onChange={setPhone} type="tel" />
          <Field label="Компания" value={company} onChange={setCompany} />
        </div>
        <div className="mt-4">
          <Field label="NIP" value={nip} onChange={setNip} />
        </div>
      </Card>

      <Card title="Валюта" subtitle="Настройки валюты в системе">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Валюта</label>
            <select defaultValue="PLN" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="PLN">PLN - Польский злотый</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Американский доллар</option>
              <option value="CZK">CZK - Чешская крона</option>
              <option value="GBP">GBP - Британский фунт</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Формат цены</label>
            <select defaultValue="symbol_after" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="symbol_after">120 zl</option>
              <option value="symbol_before">zl 120</option>
              <option value="space">120 zl</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}

function HostelsTab() {
  const { hostels, rooms, updateRoomPrices } = useData();
  const [expandedHostel, setExpandedHostel] = useState<string | null>(hostels[0]?.id || null);
  const [localPrices, setLocalPrices] = useState<Record<string, Record<string, number>>>(() => {
    const prices: Record<string, Record<string, number>> = {};
    hostels.forEach(h => {
      prices[h.id] = {};
      const hostelRooms = rooms.filter(r => r.hostelId === h.id);
      (['standard', 'economy', 'vip'] as const).forEach(type => {
        const roomOfType = hostelRooms.find(r => r.type === type);
        if (roomOfType) prices[h.id][type] = roomOfType.pricePerBed;
      });
    });
    return prices;
  });
  const [savedHostel, setSavedHostel] = useState<string | null>(null);

  const handlePriceChange = (hostelId: string, type: string, value: string) => {
    const num = parseInt(value) || 0;
    setLocalPrices(prev => ({
      ...prev,
      [hostelId]: { ...prev[hostelId], [type]: num },
    }));
  };

  const savePrices = (hostelId: string, type: string) => {
    const price = localPrices[hostelId]?.[type] || 0;
    updateRoomPrices(hostelId, type as any, price);
    setSavedHostel(`${hostelId}-${type}`);
    setTimeout(() => setSavedHostel(null), 1500);
  };

  const typeLabels: Record<string, string> = { standard: 'Standard', economy: 'Economy', vip: 'VIP' };
  const typeColors: Record<string, string> = { standard: 'bg-indigo-100 text-indigo-700', economy: 'bg-gray-100 text-gray-600', vip: 'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-6">
      <Card title="Цены номеров по хостелам" subtitle="Установите цены за кровать для каждого хостела и типа номера">
        <div className="space-y-3">
          {hostels.map(h => {
            const isOpen = expandedHostel === h.id;
            const hostelRooms = rooms.filter(r => r.hostelId === h.id);
            const roomCount = hostelRooms.length;
            const types = [...new Set(hostelRooms.map(r => r.type))];

            return (
              <div key={h.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedHostel(isOpen ? null : h.id)}
                  className="w-full flex items-center justify-between gap-3 flex-wrap p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Building2 size={18} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{h.name}</p>
                      <p className="text-sm text-gray-400">{h.address} · {roomCount} номеров</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      {types.map(t => (
                        <span key={t} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${typeColors[t]}`}>
                          {t} {localPrices[h.id]?.[t] || 0} zl
                        </span>
                      ))}
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {types.map(type => {
                        const roomsOfType = hostelRooms.filter(r => r.type === type);
                        const minPrice = Math.min(...roomsOfType.map(r => r.pricePerBed));
                        const maxPrice = Math.max(...roomsOfType.map(r => r.pricePerBed));
                        const isSaved = savedHostel === `${h.id}-${type}`;

                        return (
                          <div key={type} className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${typeColors[type]}`}>{typeLabels[type]}</span>
                              <span className="text-xs text-gray-400">{roomsOfType.length} номеров</span>
                            </div>
                            <div className="mb-3">
                              <p className="text-xs text-gray-400">Текущий диапазон</p>
                              <p className="text-sm font-medium text-gray-700">{minPrice === maxPrice ? `${minPrice} зл/кровать` : `${minPrice}–${maxPrice} зл/кровать`}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Новая цена (зл/кровать)</label>
                              <input
                                type="number"
                                value={localPrices[h.id]?.[type] || ''}
                                onChange={e => handlePriceChange(h.id, type, e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums mb-2"
                              />
                              <button
                                onClick={() => savePrices(h.id, type)}
                                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${isSaved ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                              >
                                {isSaved ? <Check size={16} className="mx-auto" /> : 'Сохранить'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Сводка цен" subtitle="Краткий обзор текущих тарифов">
        <div className="overflow-x-auto">
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-400">Хостел</th>
                <th className="px-4 py-3 font-medium text-gray-400">Standard</th>
                <th className="px-4 py-3 font-medium text-gray-400">Economy</th>
                <th className="px-4 py-3 font-medium text-gray-400">VIP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {hostels.map(h => {
                const hostelRooms = rooms.filter(r => r.hostelId === h.id);
                const getAvg = (type: string) => {
                  const filtered = hostelRooms.filter(r => r.type === type);
                  if (filtered.length === 0) return '-';
                  const avg = Math.round(filtered.reduce((s, r) => s + r.pricePerBed, 0) / filtered.length);
                  return `${avg} zl`;
                };
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{h.name}</td>
                    <td className="px-4 py-3 text-gray-600">{getAvg('standard')}</td>
                    <td className="px-4 py-3 text-gray-600">{getAvg('economy')}</td>
                    <td className="px-4 py-3 text-gray-600">{getAvg('vip')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [debtAlert, setDebtAlert] = useState(true);
  const [checkoutAlert, setCheckoutAlert] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState(true);

  return (
    <div className="space-y-6">
      <Card title="Каналы уведомлений" subtitle="Выберите способ получения уведомлений">
        <div className="space-y-4">
          <Toggle label="Уведомления по email" description="Получайте уведомления на адрес электронной почты" checked={emailNotif} onChange={setEmailNotif} />
          <Toggle label="SMS уведомления" description="Получайте SMS о важных событиях" checked={smsNotif} onChange={setSmsNotif} />
        </div>
      </Card>

      <Card title="Оповещения" subtitle="Что вы хотите отслеживать">
        <div className="space-y-4">
          <Toggle label="Оповещения о долгах" description="Уведомление, когда гость имеет неоплаченный долг" checked={debtAlert} onChange={setDebtAlert} />
          <Toggle label="Напоминания о выезде" description="Уведомление за 24 часа до planned checkout" checked={checkoutAlert} onChange={setCheckoutAlert} />
        </div>
      </Card>

      <Card title="Отчёты" subtitle="Автоматические отчёты">
        <div className="space-y-4">
          <Toggle label="Еженедельный отчёт" description="Сводка каждый понедельник утром" checked={weeklyReport} onChange={setWeeklyReport} />
          <Toggle label="Ежемесячный отчёт" description="Полный отчёт 1-го числа каждого месяца" checked={monthlyReport} onChange={setMonthlyReport} />
        </div>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordChange = async () => {
    setStatus(null);
    if (newPassword.length < 8) {
      setStatus({ type: 'error', text: 'Новый пароль должен быть не короче 8 символов' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', text: 'Пароли не совпадают' });
      return;
    }
    if (!currentPassword) {
      setStatus({ type: 'error', text: 'Введите текущий пароль' });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setStatus({ type: 'ok', text: 'Пароль успешно изменён' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof Error ? err.message : 'Не удалось изменить пароль' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Изменение пароля" subtitle="Обновите пароль от аккаунта">
        <div className="space-y-4 max-w-md">
          <Field label="Текущий пароль" value={currentPassword} onChange={setCurrentPassword} type="password" autoComplete="current-password" />
          <Field label="Новый пароль" value={newPassword} onChange={setNewPassword} type="password" autoComplete="new-password" />
          <Field label="Подтвердите новый пароль" value={confirmPassword} onChange={setConfirmPassword} type="password" autoComplete="new-password" />
          {status && (
            <p className={`text-sm px-3 py-2 rounded-lg ${status.type === 'ok' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>{status.text}</p>
          )}
          <button
            onClick={handlePasswordChange}
            disabled={submitting}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Сохранение...' : 'Изменить пароль'}
          </button>
        </div>
      </Card>

      <Card title="Двухфакторная аутентификация" subtitle="Добавьте дополнительную защиту аккаунта">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">Мобильная авторизация</p>
            <p className="text-sm text-gray-400">Используйте приложение Google Authenticator или Authy</p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            Включить
          </button>
        </div>
      </Card>

      <Card title="Активные сессии" subtitle="Управляйте устройствами, вошедшими в аккаунт">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
                MB
              </div>
              <div>
                <p className="font-medium text-gray-900">MacBook Pro</p>
                <p className="text-sm text-gray-400">Краков, Польша · Активна сейчас</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Текущая</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">
                IP
              </div>
              <div>
                <p className="font-medium text-gray-900">iPhone 15</p>
                <p className="text-sm text-gray-400">Гданьск, Польша · 2 дня назад</p>
              </div>
            </div>
            <button className="text-sm text-red-500 hover:text-red-600 font-medium">Выйти</button>
          </div>
        </div>
      </Card>

      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
        <h3 className="font-semibold text-red-700 mb-1">Опасная зона</h3>
        <p className="text-sm text-red-500 mb-3">Эти операции необратимы.</p>
        <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
          Удалить аккаунт
        </button>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-0.5">{title}</h3>
      <p className="text-sm text-gray-400 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', autoComplete }: { label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string }) {
  const baseClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {type === 'password' ? (
        <PasswordInput value={value} onChange={onChange} autoComplete={autoComplete} className={baseClass} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={baseClass}
        />
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );
}
