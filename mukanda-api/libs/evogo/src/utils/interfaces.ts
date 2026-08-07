
export interface EvoGoInstance {
  id: string;
  name: string;
  token: string;
  webhook: string;
  rabbitmqEnable: string;
  websocketEnable: string;
  natsEnable: string;
  jid: string;
  qrcode: string;
  connected: boolean;
  expiration: number;
  disconnect_reason: string;
  events: string;
  os_name: string;
  proxy: string;
  client_name: string;
  createdAt: string;
  alwaysOnline: boolean;
  rejectCall: boolean;
  msgRejectCall: string;
  readMessages: boolean;
  ignoreGroups: boolean;
  ignoreStatus: boolean;
}

export interface EvoGoConnectInstance {
    eventString: string
    jid: string
    webhookUrl: string
}

export interface EvoGoPairCode {
    PairingCode: string
}

export interface EvoGoQrPairCode {
    qrcode: string
    Code: string
}

export interface EvoGoQrCode {
    qrcode: string
}

export interface EvoGoResponse<T> {
    data: T;
    message: string;
}

export interface evoGoError {
    error: string
}

export interface EvoGoInstanceStatus {
    Connected: boolean,
    Logged: boolean,
    Name: string
}