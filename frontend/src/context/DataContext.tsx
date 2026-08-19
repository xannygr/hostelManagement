import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Hostel, Room, Guest, Payment } from '../types';
import { api, loadAll, fetchHostelStats, type HostelStatsData } from '../api';
import { useAuth } from './AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Toasts, type ToastItem } from '../components/Toasts';

interface DataContextType {
  hostels: Hostel[];
  rooms: Room[];
  guests: Guest[];
  payments: Payment[];
  stats: HostelStatsData | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  addHostel: (hostel: Omit<Hostel, 'id' | 'totalRooms' | 'totalBeds' | 'occupiedBeds' | 'monthlyRevenue'>, rooms?: Omit<Room, 'id' | 'hostelId' | 'occupiedBeds'>[]) => void;
  addGuest: (guest: Omit<Guest, 'id'> & { id?: string }) => void;
  addGuestWithPayment: (
    guest: Omit<Guest, 'id'> & { id?: string },
    payment: Omit<Payment, 'id' | 'guestId'> & { guestId?: string; id?: string }
  ) => Promise<{ guest: Guest; payment: Payment }>;
  updateGuest: (id: string, data: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
  addPayment: (payment: Omit<Payment, 'id'> & { id?: string }) => void;
  updateRoomPrices: (hostelId: string, type: Room['type'], price: number) => void;
  updateHostel: (id: string, data: Partial<Hostel>) => void;
  updateRoom: (id: string, data: Partial<Room>) => void;
  addRoom: (room: Omit<Room, 'id' | 'occupiedBeds'>) => void;
  updatePayment: (id: string, data: Partial<Payment>) => void;
}

const DataContext = createContext<DataContextType | null>(null);

const DATA_KEY = ['hostelhaven-data'] as const;
const STATS_KEY = ['hostelhaven-stats'] as const;

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const errMessage = (e: unknown): string => {
    if (e instanceof Error && e.message) return e.message;
    return t('Не удалось сохранить изменения');
  };

  const notify = (type: ToastItem['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  };

  const query = useQuery({
    queryKey: DATA_KEY,
    queryFn: loadAll,
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const statsQuery = useQuery({
    queryKey: STATS_KEY,
    queryFn: fetchHostelStats,
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!user) {
      queryClient.removeQueries({ queryKey: DATA_KEY });
      queryClient.removeQueries({ queryKey: STATS_KEY });
    }
  }, [user, queryClient]);

  useEffect(() => {
    const check = (err: unknown) => {
      const e = err as (Error & { status?: number }) | null;
      if (e?.status === 401) logout();
    };
    check(query.error);
    check(statsQuery.error);
  }, [query.error, statsQuery.error, logout]);

  const invalidateAll = () => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: DATA_KEY }),
      queryClient.invalidateQueries({ queryKey: STATS_KEY }),
    ]);
  };

  const fail = (e: unknown, action: string) => {
    notify('error', `${action}: ${errMessage(e)}`);
  };

  const addHostel = (
    hostel: Omit<Hostel, 'id' | 'totalRooms' | 'totalBeds' | 'occupiedBeds' | 'monthlyRevenue'>,
    rooms?: Omit<Room, 'id' | 'hostelId' | 'occupiedBeds'>[]
  ) => {
    api.addHostel(hostel, rooms || [])
      .then(() => { invalidateAll(); notify('success', t('Хостел создан')); })
      .catch((e) => fail(e, t('Не удалось создать хостел')));
  };

  const addGuest = (guest: Omit<Guest, 'id'> & { id?: string }) => {
    api.addGuest(guest)
      .then(() => { invalidateAll(); notify('success', t('Гость добавлен')); })
      .catch((e) => fail(e, t('Не удалось добавить гостя')));
  };

  const addGuestWithPayment = async (
    guest: Omit<Guest, 'id'> & { id?: string },
    payment: Omit<Payment, 'id' | 'guestId'> & { guestId?: string; id?: string }
  ) => {
    const result = await api.addGuestWithPayment(guest, payment);
    await invalidateAll();
    notify('success', t('Гость и платёж сохранены'));
    return result;
  };

  const updateGuest = (id: string, data: Partial<Guest>) => {
    api.updateGuest(id, data)
      .then(() => { invalidateAll(); notify('success', t('Гость обновлён')); })
      .catch((e) => fail(e, t('Не удалось обновить гостя')));
  };

  const deleteGuest = (id: string) => {
    api.deleteGuest(id)
      .then(() => { invalidateAll(); notify('success', t('Гость удалён')); })
      .catch((e) => fail(e, t('Не удалось удалить гостя')));
  };

  const addPayment = (payment: Omit<Payment, 'id'> & { id?: string }) => {
    api.addPayment(payment)
      .then(() => { invalidateAll(); notify('success', t('Платёж добавлен')); })
      .catch((e) => fail(e, t('Не удалось добавить платёж')));
  };

  const updateRoomPrices = (hostelId: string, type: Room['type'], price: number) => {
    api.updateRoomPrices(hostelId, type, price)
      .then(() => invalidateAll())
      .catch((e) => fail(e, t('Не удалось обновить цены')));
  };

  const updateHostel = (id: string, data: Partial<Hostel>) => {
    api.updateHostel(id, data)
      .then(() => { invalidateAll(); notify('success', t('Хостел обновлён')); })
      .catch((e) => fail(e, t('Не удалось обновить хостел')));
  };

  const updateRoom = (id: string, data: Partial<Room>) => {
    api.updateRoom(id, data)
      .then(() => { invalidateAll(); notify('success', t('Номер обновлён')); })
      .catch((e) => fail(e, t('Не удалось обновить номер')));
  };

  const addRoom = (room: Omit<Room, 'id' | 'occupiedBeds'>) => {
    api.addRoom(room)
      .then(() => { invalidateAll(); notify('success', t('Номер создан')); })
      .catch((e) => fail(e, t('Не удалось создать номер')));
  };

  const updatePayment = (id: string, data: Partial<Payment>) => {
    api.updatePayment(id, data)
      .then(() => invalidateAll())
      .catch((e) => fail(e, t('Не удалось обновить платёж')));
  };

  const data = query.data;

  return (
    <DataContext.Provider
      value={{
        hostels: data?.hostels ?? [],
        rooms: data?.rooms ?? [],
        guests: data?.guests ?? [],
        payments: data?.payments ?? [],
        stats: statsQuery.data,
        loading: query.isLoading,
        error: query.isError ? t('Не удалось загрузить данные с сервера. Проверьте, что бекенд запущен: npm run dev:backend') : null,
        refetch: () => {
          invalidateAll();
        },
        addHostel,
        addGuest,
        addGuestWithPayment,
        updateGuest,
        deleteGuest,
        addPayment,
        updateRoomPrices,
        updateHostel,
        updateRoom,
        addRoom,
        updatePayment,
      }}
    >
      {children}
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
