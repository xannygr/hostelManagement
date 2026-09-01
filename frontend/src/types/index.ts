export interface Hostel {
  id: string;
  name: string;
  address: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  monthlyRevenue: number;
  image?: string;
  floors?: number;
  kitchens?: number;
  parking?: string;
  showers?: number;
  toilets?: number;
  rent?: number;
}

export type RoomPricePeriod = 'day' | 'week' | 'month';
export type PricingPer = 'bed' | 'room';

export interface Room {
  id: string;
  hostelId: string;
  number: string;
  floor: number;
  beds: number;
  occupiedBeds: number;
  type: 'standard' | 'economy' | 'vip';
  pricePerBed: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  pricingPer?: PricingPer;
  photos?: string[];
  hasBalcony?: boolean;
  hasPrivateBathroom?: boolean;
}

export type GuestLanguage = 'ru' | 'uk' | 'pl' | 'en' | 'de' | 'es' | 'fr' | 'other';

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  passport: string;
  language?: GuestLanguage;
  roomId: string;
  hostelId: string;
  checkIn: string;
  checkOut?: string;
  paymentPeriod?: RoomPricePeriod;
  status: 'active' | 'checked_out' | 'reserved';
  totalPaid: number;
  totalDue: number;
}

export interface Payment {
  id: string;
  guestId: string;
  guestName: string;
  roomId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  type: 'cash' | 'card' | 'transfer';
  status: 'paid' | 'pending' | 'overdue';
  smsSent: boolean;
}

export type ExpenseCategory = 'gas' | 'lights' | 'internet' | 'water';

export interface Expense {
  id: string;
  hostelId: string;
  month: string;
  rentPaid: number;
  gasDue: number;
  gasPaid: number;
  lightsDue: number;
  lightsPaid: number;
  internetDue: number;
  internetPaid: number;
  waterDue: number;
  waterPaid: number;
}
