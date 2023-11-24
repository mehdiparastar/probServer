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
    callMCI = 'ATD02181713999;\r\n',
    callMTN = 'ATD712;\r\n',
    callMCI_ = 'ATD02181713999;\r\n',
    callMTN_ = 'ATD712;\r\n',
    callRTL = 'ATD159;\r\n',
    getGSMNetworkParameters = 'AT+QENG="servingcell";\r\n',
    getWCDMANetworkParameters = 'AT+QENG="servingcell";\r\n',
    getLTENetworkParameters = 'AT+QENG="servingcell";\r\n',
    getAllTechNetworkParameters = 'AT+QENG="servingcell";\r\n',
    hangUpCall = "ATH\r\n",
    getCallStatus = "AT+CPAS\r\n",
    setMCIAPN = 'AT+QICSGP=1,1,"mcinet","","",1\r\n',
    setMTNAPN = 'AT+QICSGP=1,1,"mtnirancell","","",1\r\n',
    turnOnData = 'AT+QIACT=1\r\n',
    turnOffData = 'AT+QIDEACT=1\r\n',
    getDataConnectivityStatus = 'AT+QIACT?\r\n',
    setFTPContext = 'AT+QFTPCFG="contextid",1\r\n',
    setMCIFTPAccount = 'AT+QFTPCFG="account","mci","SIM!mci2020"\r\n',
    setMTNFTPAccount = 'AT+QFTPCFG="account","ftpuser","irancell$123!@#"\r\n',
    setFTPGETFILETYPE = 'AT+QFTPCFG="filetype",1\r\n',
    setFTPGETFILETRANSFERMODE = 'AT+QFTPCFG="transmode",1\r\n',
    setFTPGETTIMEOUT = 'AT+QFTPCFG="rsptimeout",90\r\n',
    openMCIFTPConnection = 'AT+QFTPOPEN="10.176.85.73",21\r\n',
    openMTNFTPConnection = 'AT+QFTPOPEN="172.17.17.14",21\r\n',
    setMCIFTPGETCURRENTDIRECTORY_ = 'AT+QFTPCWD="/home/mci"\r\n',
    setMCIFTPGETCURRENTDIRECTORY = 'AT+QFTPCWD="/home/amir/downloads"\r\n',

    getMCIFTPFile = 'AT+QFTPGET="Autodesk.Maya.2020.4.x64.rar?1612964196","UFS:mehdiparastar.rar",0,60000000\r\n',
    getMCIFTPFile_ = 'AT+QFTPGET="./Upload/QuectelMSDocs.zip","UFS:QuectelMSDocs.zip"\r\n',
    getMCIFTPFile1 = 'AT+QFTPGET="../amir/downloads/Autodesk.Maya.2020.4.x64.rar?1612964196","COM:test.zip"\r\n',
    getMCIFTPDownloadedFileSize = 'AT+QFLST="UFS:QuectelMSDocs.zip"\r\n',

    getCurrentAPN = 'AT+CGDCONT?\r\n',
    getFtpStat = 'AT+QFTPSTAT\r\n',
    closeFtpConn = 'AT+QFTPCLOSE\r\n',
    getFTPCurrentDirectory = 'AT+QFTPPWD\r\n',
    clearUFSStorage = 'AT+QFDEL="*"\r\n'

}