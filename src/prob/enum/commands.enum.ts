export enum commands {
    getModuleInfo = 'ATI\r\n',
    getSimIMSI = 'AT+CIMI\r\n',
    getModuleIMEI = 'AT+CGSN\r\n',
    getSimStatus = 'AT+CPIN?\r\n',
    enableGPS = 'AT+QGPS=1\r\n',
    disableGPS = 'AT+QGPSEND\r\n',
    getCurrentLoc = 'AT+QGPSLOC=2\r\n',
    lockGSM = 'AT+QCFG="nwscanmode",1\r\n',
    lockWCDMA = 'AT+QCFG="nwscanmode",2\r\n',
    lockLTE = 'AT+QCFG="nwscanmode",3\r\n',
    allTech = 'AT+QCFG="nwscanmode",0\r\n',
    callMCI = 'ATD04151003609\r\n',
    callMTN = 'ATD04151003609\r\n',
    callRTL = 'ATD04151003609\r\n',
    getNetworkParameters = 'AT+QENG="servingcell";\r\n'
}