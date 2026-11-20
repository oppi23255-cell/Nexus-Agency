export type Language = 'ar' | 'en';

export type RoutePath =
  | '/deposits'
  | '/deposits/disputes'
  | '/withdrawals'
  | '/withdrawals/my'
  | '/statistics'
  | '/requisite'
  | '/automatic'
  | '/automatic/telegram'
  | '/automatic/api'
  | '/messages'
  | '/profile'
  | '/referrals';

export type DepositStatus = 'pending' | 'completed' | 'disputed' | 'cancelled' | 'expired';
export type DisputeStatus = 'open' | 'reviewing' | 'resolved_approve' | 'resolved_reject';
export type WithdrawalStatus = 'available' | 'accepted' | 'completed' | 'cancelled' | 'expired';
export type RequisiteType = 'card' | 'wallet' | 'iban' | 'instapay';
export type NotificationPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface AccountDesk {
  account_id: string;
  uuid: string;
  username: string;
  countryCode: 'SA' | 'EG' | 'AE' | 'KG';
  label: string;
  labelEn: string;
  currency: 'EGP' | 'SAR' | 'KGS' | 'AED';
  balanceUsdt: number;
  frozenUsdt: number;
  insuranceAmount: number | null;
  rate: number; // 1 USD = X local currency
  canTrade: boolean;
  depositFeePct: number;
  withdrawalFeePct: number;
}

export interface Requisite {
  id: string;
  accountId: string;
  bankName: string;
  ownerName: string;
  accountNumber: string;
  type: RequisiteType;
  minOrder: number;
  maxOrder: number;
  dailyLimit: number;
  dailyUsed: number;
  bidRate: number;
  active: boolean;
  deviceId?: string;
  createdAt: string;
}

export interface DepositOrder {
  id: string;
  orderId: string;
  accountId: string;
  amountLocal: number;
  amountUsdt: number;
  incomeUsdt: number;
  rate: number;
  requisiteId: string;
  bankName: string;
  ownerName: string;
  requisiteNumber: string;
  status: DepositStatus;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string;
  customerNote?: string;
}

export interface DisputeItem {
  id: string;
  depositId: string;
  orderId: string;
  accountId: string;
  claimedAmountLocal: number;
  originalAmountLocal: number;
  amountUsdt: number;
  bankName: string;
  requisiteNumber: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  slaMinutesLeft: number;
  receiptRef: string;
  resolutionNote?: string;
}

export interface WithdrawalOrder {
  id: string;
  orderId: string;
  accountId: string;
  amountLocal: number;
  amountUsdt: number;
  incomeUsdt: number;
  rate: number;
  destinationMethod: string;
  requisiteNumber: string;
  recipientName: string;
  status: WithdrawalStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  completedAt?: string;
  receiptFiles: Array<{ name: string; size: string; uploadedAt: string }>;
}

export interface AndroidDevice {
  id: string;
  name: string;
  model: string;
  osVersion: string;
  appVersion: string;
  pairingToken: string;
  linkedRequisiteId?: string;
  batteryPct: number;
  online: boolean;
  lastPingAt: string;
  capturedCount: number;
}

export interface TelegramBotConfig {
  id: string;
  name: string;
  botUsername: string;
  chatId: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface ApiKeyConfig {
  id: string;
  label: string;
  keyPrefix: string;
  fullKey: string;
  webhookUrl: string;
  permissions: string[];
  active: boolean;
  lastUsedAt: string;
  createdAt: string;
}

export interface SmsMessage {
  id: string;
  deviceId: string;
  deviceName: string;
  sender: string;
  body: string;
  parsedAmount: number | null;
  currency: string;
  matchedDepositId: string | null;
  matchedOrderId: string | null;
  status: 'matched' | 'unmatched' | 'ignored';
  receivedAt: string;
}

export interface TopUpRecord {
  id: string;
  txHash: string;
  network: 'TRC-20' | 'BEP-20' | 'TON';
  amountUsdt: number;
  status: 'credited' | 'confirming';
  createdAt: string;
}

export interface ReferralPartner {
  id: string;
  partnerCode: string;
  joinedAt: string;
  volumeUsdt: number;
  earnedUsdt: number;
  status: 'active' | 'inactive';
}

export interface UserProfile {
  traderId: string;
  displayName: string;
  email: string;
  telegramHandle: string;
  twoFactorEnabled: boolean;
  referralCode: string;
  referralRatePct: number;
  trc20Address: string;
}

export interface AppSettings {
  lang: Language;
  tzOffset: number;
  dateFormat: 'DD.MM.YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  clockFormat: '24h' | '12h';
  compactTables: boolean;
  mirrorHeader: boolean;
  compactCards: boolean;
  hideRowNumbers: boolean;
  fullRowTint: boolean;
  tableZoom: number;
  sidebarCollapsedDesktop: boolean;
  notificationPosition: NotificationPosition;
  skipConfirm: boolean;
  defaultLanding: RoutePath;
}

export interface PlatformState {
  profile: UserProfile;
  currentAccountId: string;
  accounts: AccountDesk[];
  requisites: Requisite[];
  deposits: DepositOrder[];
  disputes: DisputeItem[];
  withdrawals: WithdrawalOrder[];
  androidDevices: AndroidDevice[];
  telegramBots: TelegramBotConfig[];
  apiKeys: ApiKeyConfig[];
  messages: SmsMessage[];
  topUps: TopUpRecord[];
  referrals: ReferralPartner[];
  settings: AppSettings;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
}
