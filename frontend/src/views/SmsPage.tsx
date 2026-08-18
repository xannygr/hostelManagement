import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Send, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Trash2, Eye, EyeOff, Bell, ArrowLeft, X, RotateCcw
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { paymentStatus, guestLanguageLabel } from '../utils/helpers';

interface SmsRule {
  id: string;
  name: string;
  timing: string;
  timingDescription: string;
  enabled: boolean;
  template: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const defaultRules: SmsRule[] = [
  {
    id: '3days',
    name: 'Напоминание за 3 дня',
    timing: '3 дня до срока',
    timingDescription: 'Сообщение будет отправлено за 3 дня до даты оплаты',
    enabled: true,
    template: 'Уважаемый/ая {imie}, напоминаем об оплате в размере {kwota} зл, срок которой {data}. Хостел {hostel}.',
    icon: <Clock size={18} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: '1day',
    name: 'Напоминание за 1 день',
    timing: '1 день до срока',
    timingDescription: 'Сообщение будет отправлено за 1 день до даты оплаты',
    enabled: true,
    template: 'Уважаемый/ая {imie}, завтра истекает срок оплаты {kwota} зл за проживание в хостеле {hostel}. Просим произвести оплату.',
    icon: <Bell size={18} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'oday',
    name: 'В день оплаты',
    timing: 'В день срока',
    timingDescription: 'Сообщение будет отправлено в день оплаты',
    enabled: true,
    template: 'Уважаемый/ая {imie}, сегодня истекает срок оплаты {kwota} зл. Хостел {hostel}. Отсутствие оплаты может повлечь начисление пени.',
    icon: <AlertTriangle size={18} />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'after1',
    name: '1 день после срока',
    timing: '1 день после срока',
    timingDescription: 'Сообщение будет отправлено через 1 день после просрочки',
    enabled: true,
    template: 'Уважаемый/ая {imie}, срок оплаты {kwota} зл превышен. Хостел {hostel}. Просим произвести оплату.',
    icon: <AlertTriangle size={18} />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    id: 'after3',
    name: '3 дня после срока',
    timing: '3 дня после срока',
    timingDescription: 'Сообщение будет отправлено через 3 дня после просрочки',
    enabled: false,
    template: 'Уважаемый/ая {imie}, ваша оплата в размере {kwota} зл не оплачена уже 3 дня. Хостел {hostel}. Просим произвести оплату немедленно, чтобы избежать дальнейших мер.',
    icon: <AlertTriangle size={18} />,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
];

const placeholders = [
  { key: '{imie}', description: 'Имя гостя' },
  { key: '{kwota}', description: 'Сумма платежа (зл)' },
  { key: '{data}', description: 'Дата срока оплаты' },
  { key: '{hostel}', description: 'Название хостела' },
  { key: '{pokoj}', description: 'Номер комнаты' },
];

export default function SmsPage() {
  const { guests, payments, hostels, rooms, updatePayment } = useData();
  const [rules, setRules] = useState<SmsRule[]>(defaultRules);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [editingTemplates, setEditingTemplates] = useState<Record<string, string>>({});
  const [resentIds, setResentIds] = useState<Set<string>>(new Set());
  const [smsPreview, setSmsPreview] = useState<{ payment: any; text: string } | null>(null);

  const activeRulesCount = rules.filter(r => r.enabled).length;
  const overduePayments = payments.filter(p => paymentStatus(p) === 'overdue');
  const pendingPayments = payments.filter(p => paymentStatus(p) === 'pending');
  const smsSentPayments = payments.filter(p => paymentStatus(p) === 'overdue' || p.smsSent || resentIds.has(p.id));

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const startEditingTemplate = (id: string, currentTemplate: string) => {
    setEditingTemplates(prev => ({ ...prev, [id]: currentTemplate }));
    setExpandedRule(id);
  };

  const cancelEditingTemplate = (id: string) => {
    setEditingTemplates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setExpandedRule(null);
  };

  const saveTemplate = (id: string) => {
    const edited = editingTemplates[id];
    if (edited !== undefined) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, template: edited } : r));
      setEditingTemplates(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setExpandedRule(null);
  };

  const updateEditingTemplate = (id: string, template: string) => {
    setEditingTemplates(prev => ({ ...prev, [id]: template }));
  };

  const insertPlaceholder = (ruleId: string, placeholder: string) => {
    const current = editingTemplates[ruleId] ?? rules.find(r => r.id === ruleId)?.template ?? '';
    const textarea = document.querySelector(`#template-${ruleId}`) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = current.substring(0, start) + placeholder + current.substring(end);
      updateEditingTemplate(ruleId, newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      updateEditingTemplate(ruleId, current + placeholder);
    }
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    if (expandedRule === id) setExpandedRule(null);
    setEditingTemplates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const resendSms = (paymentId: string) => {
    setResentIds(prev => {
      const next = new Set(prev);
      next.add(paymentId);
      return next;
    });
    updatePayment(paymentId, { smsSent: true });
  };

  const buildSmsText = (p: any) => {
    const room = rooms.find(r => r.id === p.roomId);
    const hostel = guests.find(g => g.id === p.guestId)
      ? hostels.find(h => h.id === guests.find(g => g.id === p.guestId)?.hostelId)
      : null;
    const overdueDays = Math.ceil((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const rule = paymentStatus(p) === 'overdue'
      ? (overdueDays > 3 ? rules.find(r => r.id === 'after3') : rules.find(r => r.id === 'after1'))
      : rules.find(r => r.id === '3days');
    const template = rule?.template || defaultRules[0].template;
    return template
      .replace(/{imie}/g, p.guestName.split(' ')[0])
      .replace(/{kwota}/g, String(p.amount))
      .replace(/{data}/g, p.dueDate)
      .replace(/{hostel}/g, hostel?.name ?? '')
      .replace(/{pokoj}/g, room?.number ?? '');
  };

  const openSmsPreview = (p: any) => {
    setSmsPreview({ payment: p, text: buildSmsText(p) });
  };

  const confirmSend = () => {
    if (!smsPreview) return;
    resendSms(smsPreview.payment.id);
    setSmsPreview(null);
  };

  const renderPreview = (template: string) => {
    return template
      .replace(/{imie}/g, 'Jan Kowalski')
      .replace(/{kwota}/g, '960')
      .replace(/{data}/g, '2026-07-25')
      .replace(/{hostel}/g, 'Hostel Stare Miasto')
      .replace(/{pokoj}/g, '101');
  };

  return (
    <div className="p-4 sm:p-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft size={16} />
        Вернуться на главную
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SMS Напоминания</h1>
        <p className="text-gray-500 mt-1">Управление правилами и шаблонами SMS</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center"><MessageSquare size={16} /></div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Активные правила</p>
          <p className="text-2xl font-bold text-gray-900">{activeRulesCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Clock size={16} /></div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Ожидающие</p>
          <p className="text-2xl font-bold text-amber-600">{pendingPayments.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><AlertTriangle size={16} /></div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Просрочки</p>
          <p className="text-2xl font-bold text-red-600">{overduePayments.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Send size={16} /></div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Отправленные SMS</p>
          <p className="text-2xl font-bold text-blue-600">{smsSentPayments.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Правила отправки</h2>
            </div>

            <div className="divide-y divide-gray-50">
              {rules.map(rule => {
                const isEditing = expandedRule === rule.id;
                const editValue = editingTemplates[rule.id] ?? rule.template;
                return (
                <div key={rule.id} className={`${rule.enabled ? '' : 'opacity-50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${rule.bgColor} ${rule.color}`}>
                      {rule.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{rule.name}</p>
                        {rule.enabled ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-600 bg-emerald-50">АКТИВНА</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-400 bg-gray-100">ОТКЛЮЧЕНА</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{rule.timing} — {rule.timingDescription}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setShowPreview(showPreview === rule.id ? null : rule.id)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors" title="Просмотр">
                        {showPreview === rule.id ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => {
                        if (isEditing) {
                          cancelEditingTemplate(rule.id);
                        } else {
                          startEditingTemplate(rule.id, rule.template);
                        }
                      }} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors" title={isEditing ? 'Закрыть редактирование' : 'Редактировать шаблон'}>
                        {isEditing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => toggleRule(rule.id)} className={`relative w-11 h-6 rounded-full transition-colors ${rule.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} title={rule.enabled ? 'Выключить' : 'Включить'}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${rule.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <button onClick={() => deleteRule(rule.id)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors" title="Удалить">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {showPreview === rule.id && (
                    <div className="px-5 pb-4">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Предпросмотр сообщения</p>
                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <MessageSquare size={14} />
                            </div>
                            <div>
                              <p className="text-sm text-gray-900 leading-relaxed">{renderPreview(rule.template)}</p>
                              <p className="text-[10px] text-gray-400 mt-2">+48 501 234 567 · {rule.timing}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="px-5 pb-4">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Шаблон сообщения</p>
                          <div className="flex flex-wrap gap-1">
                            {placeholders.map(ph => (
                              <button key={ph.key} onClick={() => insertPlaceholder(rule.id, ph.key)} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors" title={ph.description}>
                                {ph.key}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          id={`template-${rule.id}`}
                          value={editValue}
                          onChange={e => updateEditingTemplate(rule.id, e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                        <p className="text-[10px] text-gray-400 mt-1.5">{editValue.length} / 160 символов</p>
                        <div className="flex items-center gap-2 mt-3">
                          <button type="button" onClick={() => saveTemplate(rule.id)} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                            Сохранить шаблон
                          </button>
                          <button type="button" onClick={() => cancelEditingTemplate(rule.id)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                            <X size={13} />
                            Отмена
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">История SMS</h2>
                <p className="text-xs text-gray-400 mt-0.5">{smsSentPayments.length} сообщений в истории</p>
              </div>
            </div>
            {smsSentPayments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Send size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">Нет отправленных SMS</p>
                <p className="text-xs text-gray-300 mt-1">Сообщения появятся здесь после отправки</p>
              </div>
            ) : (
              <>
              <div className="block lg:hidden space-y-2 px-4 pb-4">
                {smsSentPayments.map(p => {
                  const guest = guests.find(g => g.id === p.guestId);
                  const room = rooms.find(r => r.id === p.roomId);
                  const hostel = guest ? hostels.find(h => h.id === guest.hostelId) : null;
                  const status = paymentStatus(p);
                  const statusStyles: Record<string, string> = { paid: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700' };
                  const statusLabels: Record<string, string> = { paid: 'Оплачено', pending: 'Ожидает', overdue: 'Просрочено' };
                  return (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                          {p.guestName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{p.guestName}</p>
                          <p className="text-xs text-gray-400 truncate">{hostel?.name} · Ном. {room?.number}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyles[status]}`}>{statusLabels[status]}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        <div>
                          <p className="font-semibold text-gray-900">{p.amount.toLocaleString()} zl</p>
                          <p className="text-xs text-gray-400">Срок {p.dueDate}{status === 'overdue' ? ` · просрочка ${Math.ceil((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))} дн.` : ''}</p>
                        </div>
                        <div className="ml-auto">
                          {resentIds.has(p.id) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium">
                              <Send size={12} /> Отправлено
                            </span>
                          ) : (
                            <button
                              onClick={() => openSmsPreview(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                              title={p.smsSent ? "Отправить повторно" : "Отправить SMS"}
                            >
                              {p.smsSent ? <RotateCcw size={12} /> : <Send size={12} />}
                              {p.smsSent ? 'Повторить' : 'Отправить'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-400">Гость</th>
                      <th className="px-4 py-3 font-medium text-gray-400">Номер</th>
                      <th className="px-4 py-3 font-medium text-gray-400">Сумма</th>
                      <th className="px-4 py-3 font-medium text-gray-400">Срок</th>
                      <th className="px-4 py-3 font-medium text-gray-400">Статус оплаты</th>
                      <th className="px-4 py-3 font-medium text-gray-400">Просрочка</th>
                      <th className="px-4 py-3 font-medium text-gray-400 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {smsSentPayments.map(p => {
                      const guest = guests.find(g => g.id === p.guestId);
                      const room = rooms.find(r => r.id === p.roomId);
                      const hostel = guest ? hostels.find(h => h.id === guest.hostelId) : null;
                      const status = paymentStatus(p);
                      const statusStyles: Record<string, string> = {
                        paid: 'bg-emerald-100 text-emerald-700',
                        pending: 'bg-amber-100 text-amber-700',
                        overdue: 'bg-red-100 text-red-700',
                      };
                      const statusLabels: Record<string, string> = {
                        paid: 'Оплачено',
                        pending: 'Ожидает',
                        overdue: 'Просрочено',
                      };
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                                {p.guestName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 truncate">{p.guestName}</p>
                                {hostel && <p className="text-[10px] text-gray-400">{hostel.name}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">Ном. {room?.number}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{p.amount.toLocaleString()} zl</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{p.dueDate}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>{statusLabels[status]}</span>
                          </td>
                          <td className="px-4 py-3">
                            {status === 'overdue' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                {Math.ceil((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))} дн.
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {resentIds.has(p.id) ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium">
                                <Send size={12} />
                                Отправлено
                              </span>
                            ) : (
                              <button
                                onClick={() => openSmsPreview(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                                title={p.smsSent ? "Отправить повторно" : "Отправить SMS"}
                              >
                                {p.smsSent ? <RotateCcw size={12} /> : <Send size={12} />}
                                {p.smsSent ? 'Отправить повторно' : 'Отправить'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>

      </div>

      {smsPreview && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSmsPreview(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Предпросмотр SMS</h3>
              <button onClick={() => setSmsPreview(null)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-400 mb-2">
                Получатель: {smsPreview.payment.guestName} ({guests.find(g => g.id === smsPreview.payment.guestId)?.phone})
                {(() => {
                  const lang = guests.find(g => g.id === smsPreview.payment.guestId)?.language;
                  return lang ? ` · Язык: ${guestLanguageLabel(lang)}` : '';
                })()}
              </p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare size={14} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 leading-relaxed">{smsPreview.text}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{smsPreview.text.length} символов</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setSmsPreview(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                Отмена
              </button>
              <button onClick={confirmSend} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                <Send size={14} />
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
