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
  | '/referrals'
  | '/admin.php';

export type DepositStatus = 'pending' | 'completed' | 'disputed' | 'cancelled' | 'expired';
export type DisputeStatus = 'open' | 'reviewing' | 'resolved_approve' | 'resolved_reject';
export type WithdrawalStatus =
  | 'available'
  | 'accepted'
  | 'awaiting_confirmation'
  | 'completed'
  | 'cancelled'
  | 'expired';
export type RequisiteType = 'card' | 'wallet' | 'iban' | 'instapay';
export type NotificationPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface PlatformConfig {
  platformName: string;
  countryCode: 'EG' | 'SA' | 'AE' | 'KG';
  currencyCode: 'EGP' | 'SAR' | 'AED' | 'KGS';
  usdRate: number;
  adminPassword: string;
}

export interface ManagedUser {
  id: string;
  uuid: string;
  username: string;
  displayName: string;
  email: string;
  password: string;
  telegramHandle: string;
  balanceEgp: number;
  frozenEgp: number;
  insuranceEgp: number | null;
  canTrade: boolean;
  active: boolean;
  depositFeePct: number;
  withdrawalFeePct: number;
  referralCode: string;
  referralRatePct: number;
  twoFactorEnabled: boolean;
  trc20Address: string;
  createdAt: string;
  lastSeenAt?: string;
}

export interface OnlinePresenceEntry {
  visitorId: string;
  userId?: string | null;
  userName?: string | null;
  email?: string | null;
  route: string;
  lastPingAt: string;
}

export interface AccountDesk {
  account_id: string;
  userId?: string;
  uuid: string;
  username: string;
  countryCode: 'SA' | 'EG' | 'AE' | 'KG';
  label: string;
  labelEn: string;
  currency: 'EGP' | 'SAR' | 'KGS' | 'AED';
  balanceUsdt: number; // Stores active desk balance in EGP for Egyptian desk
  frozenUsdt: number;
  insuranceAmount: number | null;
  rate: number; // 1 USD = X EGP
  canTrade: boolean;
  depositFeePct: number;
  withdrawalFeePct: number;
}

export interface Requisite {
  id: string;
  userId?: string;
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
  userId?: string;
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
  userId?: string;
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
  userId?: string;
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
  adminCreated?: boolean;
  receiptFiles: Array<{ name: string; size: string; uploadedAt: string }>;
}

export interface AndroidDevice {
  id: string;
  userId?: string;
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
  userId?: string;
  name: string;
  botUsername: string;
  chatId: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface ApiKeyConfig {
  id: string;
  userId?: string;
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
  userId?: string;
  deviceId: string;
  deviceName: string;
  sender: string;
  body: string;
  parsedAmount: number | null;
  currency: string;
  matchedDepositId: string | null;
  matchedOrderId: string | null;
  withdrawalId?: string | null;
  withdrawalAmountEgp?: number;
  withdrawalDestination?: string;
  withdrawalRecipient?: string;
  withdrawalActionStatus?: 'pending_confirmation' | 'confirmed' | 'rejected';
  status: 'matched' | 'unmatched' | 'ignored';
  receivedAt: string;
}

export interface TopUpRecord {
  id: string;
  userId?: string;
  txHash: string;
  network: 'TRC-20' | 'BEP-20' | 'TON';
  amountUsdt: number;
  status: 'credited' | 'confirming';
  createdAt: string;
}

export interface ReferralPartner {
  id: string;
  userId?: string;
  partnerCode: string;
  joinedAt: string;
  volumeUsdt: number;
  earnedUsdt: number;
  status: 'active' | 'inactive';
}

export interface UserProfile {
  userId?: string;
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
  config: PlatformConfig;
  authenticated?: boolean;
  activeUserId?: string | null;
  users?: ManagedUser[];
  onlinePresence?: OnlinePresenceEntry[];
  onlineCount?: number;
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
