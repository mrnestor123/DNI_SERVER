const pkcs11js = require('pkcs11js');
const pkcs11 = new pkcs11js.PKCS11();


pkcs11.load('/usr/lib/x86_64-linux-gnu/opensc-pkcs11.so');


let attempt = 0;

function getDNI(){

    if(attempt == 0){ pkcs11.C_Initialize();}

    attempt++;

    const slotList = pkcs11.C_GetSlotList(true);
    const session = pkcs11.C_OpenSession(slotList[0], pkcs11js.CKF_SERIAL_SESSION);
    
    pkcs11.C_FindObjectsInit(session, [{ type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_CERTIFICATE }]);


    const hObject = pkcs11.C_FindObjects(session);


    if (hObject) {
        const attrs = pkcs11.C_GetAttributeValue(session, hObject, [
            { type: pkcs11js.CKA_SUBJECT },
        ]);

        // esto solo será para dni español !!!
        let buffer = (Buffer.from(attrs[0].value).toString())
        let dni = buffer.match(`[0-9]{8}[A-Z]`)[0];
        let start = buffer.indexOf('$') != -1 ? buffer.indexOf('$'): buffer.indexOf('-') == -1 ? buffer.indexOf(',') : buffer.indexOf('-')
        let end = buffer.indexOf('(')
        let fullName = buffer.slice(start,end)

        let name = fullName.slice(1).split(',')[1]
        let surname = fullName.slice(1).split(',')[0]

        
        pkcs11.C_CloseSession(session);
        pkcs11.C_Finalize();
        attempt = 0;

        return {'dni':dni, 'name': name && name.trim(), 'surname': surname && surname.trim()}
    } else {
        throw Error()
    } 
}

function findPadron(dni){
    
    const wsdlUrl = 'https://etributa.alcasser.es:8643/epadronws/services/CertificadoEmpadronamientoPort?wsdl';
    const soapRequest = `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.epadron.ival.com/">
            <soapenv:Header/>
            <soapenv:Body>
                <ws:getCertificado>
                <modelo>1</modelo>
                <dni>${dni}</dni>
                </ws:getCertificado>
            </soapenv:Body>
        </soapenv:Envelope>`;


    return fetch(wsdlUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            //'SOAPAction': 'http://ws.epadron.ival.com//NombreDelMétodo',
        },
        body: soapRequest,
    })
    .then(response => response.text())
    .then(data => {
        if(data.match('faultcode')){
            //console.log('FAULTCODE')
            let error = data.match(/<faultstring>(.*?)<\/faultstring>/);
            throw Error(error[1])
        } else {
            let base64 = data.match(/<return>(.*?)<\/return>/)[1];
            return base64;
        }
    })
}

module.exports = {getDNI, findPadron}


