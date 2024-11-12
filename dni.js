//const pkcs11js = require('pkcs11js');
//const pkcs11 = new pkcs11js.PKCS11();


function initDni(){


    //pkcs11.load('/usr/lib/x86_64-linux-gnu/opensc-pkcs11.so');
    //pkcs11.load('/System/Volumes/Data/Library/Libpkcs11-dnie/lib/libpkcs11-dnie.so');
}

function getDni(){
    pkcs11.C_Initialize();

    const slotList = pkcs11.C_GetSlotList(true);
    const session = pkcs11.C_OpenSession(slotList[0], pkcs11js.CKF_SERIAL_SESSION);

    pkcs11.C_FindObjectsInit(session, [{ type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_CERTIFICATE }]);


    const hObject = pkcs11.C_FindObjects(session);
    //pkcs11.C_FindObjectsFinal(session);
    pkcs11.C_CloseSession(session);
    pkcs11.C_Finalize();

    if (hObject) {
        const attrs = pkcs11.C_GetAttributeValue(session, hObject, [
            { type: pkcs11js.CKA_SUBJECT },
        ]);

        const dni = attrs[0].value;
        
        return dni
        console.log(`${subject}`);

    } else throw Error()
    

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

    fetch(wsdlUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            //'SOAPAction': 'http://ws.epadron.ival.com//NombreDelMétodo',
        },
        body: soapRequest,
    })
    .then(response => response.text())
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}



module.exports = {initDni,getDni, findPadron}


