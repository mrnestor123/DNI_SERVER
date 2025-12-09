const pkcs11js = require('pkcs11js');
const pkcs11 = new pkcs11js.PKCS11();


//pkcs11.load('/usr/lib/x86_64-linux-gnu/opensc-pkcs11.so');
pkcs11.load('/usr/lib/libpkcs11-dnie.so');


let attempt = 0;


function getDNI(){

    if(attempt == 0){ pkcs11.C_Initialize();}

    attempt++;

    // Getting info about PKCS11 Module
    var module_info = pkcs11.C_GetInfo();

    console.log('info', module_info)

    const slotList = pkcs11.C_GetSlotList(false);

    console.log('slotList', slotList)
    
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

        return {
            'dni':dni, 
            'name': name && name.trim(), 
            'surname': surname && surname.trim()
        }
    } else {
        throw Error()
    } 
}




function findPadron(dni, modelo = 1){

    
    const wsdlUrl = 'https://etributa.alcasser.es:8643/epadronws/services/CertificadoEmpadronamientoPort?wsdl';
    const soapRequest = `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.epadron.ival.com/">
            <soapenv:Header/>
            <soapenv:Body>
                <ws:getCertificado>
                <modelo>${modelo}</modelo>
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


let token = '';


// document could be DNI, NIE, PASSPORT
//
// encontrar padron desde digitalvalue
async function DVfindPadron(dni, modelo = 1, options={realm:'requena', document: 'DNI', birthDate: null}){
        
    let access_token = await getToken()
    
    if(!access_token){
        throw Error('Error obteniendo el token')
    }

    let apiOESIA = 'https://interpublicaapi.dival.es/api/padron' 

    let docTypes ={
        'DNI': 1,
        'Pasaporte': 5,
        'NIE': 4
    }

    let checkQueryString = encodeData({
        "filtros[0].Nombre": "NumDocumento",
        "filtros[0].Valor": dni, // cambiar otro nombre
        "filtros[1].Nombre": "FechaNacimiento",
        "filtros[1].Valor": options?.birthDate ? options.birthDate : '1997-09-15',
        "filtros[2].Nombre": "TipoDocumento",
        "filtros[2].Valor": docTypes[options?.document || 'DNI'],
    })

    await fetch(`${apiOESIA}/residenteempadronado?${checkQueryString}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${access_token}`,
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('DATA', data)

        if(data != 'True'){
            throw Error('No empadronado')
        }
    })
    

    
    // normal
    /*
    if(modelo == 1){
        apiURL += '/certificadoindemppdf'
        //query[] = 11
    }
    if(modelo == 2){
        apiURL += '/certificadocolectindpdf'
        query["filtros[1].Valor"] = 17
    } else if(modelo == 4){ // histórico
        apiURL += '/certificadohistindemppdf'
        query["filtros[1].Valor"] = 16
    }*/


    let queryString = encodeData({
        "filtros[0].Nombre": "NumDocumento",
        "filtros[0].Valor": dni, // cambiar otro nombre
        "filtros[1].Nombre": "TipoPlantillaPadron",
        "filtros[1].Valor": 11,
        "filtros[2].Nombre":"TipoDocumentoIne",
        "filtros[2].Valor": options?.document == 'Pasaporte'? 2 
            : options?.document == 'NIE' ? 12
            : 1,
    })

    let padron = await fetch(`${apiOESIA}/certificadoindemppdf?` + queryString, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${access_token}`,
        }
    })
    .then(response => response.arrayBuffer()) // Obtener como ArrayBuffer para datos binarios
    .then(buffer => {
        // Convertir ArrayBuffer a Base64
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary); // Convertir a Base64
    })
    .catch((error) => {
        console.error('Error:', error);
    });

    console.log('padron', padron)


    return padron;


}


async function getToken() {

    // se podría sacar solo una vez ??
    let res = await fetch(`https://interpublicaauthorization.dival.es/identity/connect/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: encodeData({
            "username": "RequenaDV",
            "password":"RequenaDVdm5F6]w5dx16",
            "grant_type":"password",
            "scope":"Interpublica",
            "client_id":"Interpublica",
            "client_secret":"C893EA72-CA50-475E-BC55-161D1557FE5F"
        }),
    })
    .then(response => response.json())
    .catch((error) => {
        console.error('Error:', error);
    });

    return res?.access_token;
}


function encodeData(data){

    return Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');

}


// debería de comprobar el token solo una vez?



module.exports = { getDNI, findPadron, DVfindPadron }


