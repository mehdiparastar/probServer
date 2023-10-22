export enum commands {
    getModuleInfo = 'ATI\r\n',
    getSimIMSI = 'AT+CIMI\r\n',
    getModuleIMEI = 'AT+CGSN\r\n',
    getSimStatus = 'AT+CPIN?\r\n',
    enableGPS = 'AT+QGPS=1\r\n',
    getCurrentLoc = 'AT+QGPSLOC=2\r\n'
}