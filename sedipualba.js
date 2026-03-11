const { createHash } = require('crypto');

const { DEFAULT_USER, DEFAULT_PASSWORD, usersByRealm } = require('./config');



function getSegPass(realm) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timestamp =
        now.getUTCFullYear() +
        pad(now.getUTCMonth() + 1) +
        pad(now.getUTCDate()) +
        pad(now.getUTCHours()) +
        pad(now.getUTCMinutes()) +
        pad(now.getUTCSeconds());
    const hash = createHash('sha256')
        .update(timestamp + (usersByRealm[realm]?.password || DEFAULT_PASSWORD), 'utf8')
        .digest('base64');
    return timestamp + hash;
}


function getUser(realm){
    return usersByRealm[realm]?.user || DEFAULT_USER
}


function uploadSedipuAlba(base64, {realm} = {}){

    const url = 'https://pre.sedipualba.es/sefycu/wssefycu.asmx';
    let segUser = getUser(realm)
    let segPass = getSegPass(realm)

    const soapRequest= `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
    <NuevoDocuFirmaV2 xmlns="https://eadmin.dipualba.es/sefycu/wssefycu.asmx">
        <wsSegUser>${segUser}</wsSegUser>
        <wsSegPass>${segPass}</wsSegPass>
        <idEntidad>46003</idEntidad>
        <idNodoContenedor>72225</idNodoContenedor>
        <descripcion>certificado del padrón nuevo</descripcion>
        <idPlantilla>-1</idPlantilla>
        <firmarPorOrden>false</firmarPorOrden>
        <formato>ConvencionalConEncabezado</formato>
        <mostrarNotificadosAFirmantes>false</mostrarNotificadosAFirmantes>
    </NuevoDocuFirmaV2>
    </soap:Body>
    </soap:Envelope>`

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8'
        },
        body: soapRequest,
    })
    .then(response => response.text())
    .then(data => {
        console.log('DATA', data)
        let match = data.match(/<NuevoDocuFirmaV2Result>(\d+)<\/NuevoDocuFirmaV2Result>/)
        if (!match) throw new Error('No se pudo obtener el idDocuFirma: ' + data)
        return parseInt(match[1])
    })
    .catch(e=>{
        console.log('E',e)
        throw e
    })
}


function setDocuFirmaPdfBase64(idDocuFirma, base64, { realm } = {}){

    const url = 'https://pre.sedipualba.es/sefycu/wssefycu.asmx';
    let segUser = getUser(realm)
    let segPass = getSegPass(realm)

    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
    <SetDocuFirmaPdfBase64 xmlns="https://eadmin.dipualba.es/sefycu/wssefycu.asmx">
        <wsSegUser>${segUser}</wsSegUser>
        <wsSegPass>${segPass}</wsSegPass>
        <idEntidad>46003</idEntidad>
        <pkDocuFirma>${idDocuFirma}</pkDocuFirma>
        <b64>${base64}</b64>
    </SetDocuFirmaPdfBase64>
    </soap:Body>
    </soap:Envelope>`

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8'
        },
        body: soapRequest,
    })
    .then(response => response.text())
    .then(data => {
        console.log('SetDocuFirmaPdfBase64 DATA', data)
        if (data.match('faultcode')) {
            let error = data.match(/<faultstring>(.*?)<\/faultstring>/s)
            throw new Error(error ? error[1] : data)
        }
        return true
    })
    .catch(e => {
        console.log('E', e)
        throw e
    })
}


function nuevoFirmanteServidor(idDocuFirma, { realm } = {}){

    const url = 'https://pre.sedipualba.es/sefycu/wssefycu.asmx';
    let segUser = getUser(realm)
    let segPass = getSegPass(realm)

    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
    <NuevoFirmanteServidor xmlns="https://eadmin.dipualba.es/sefycu/wssefycu.asmx">
        <wsSegUser>${segUser}</wsSegUser>
        <wsSegPass>${segPass}</wsSegPass>
        <idEntidad>46003</idEntidad>
        <pkDocuFirma>${idDocuFirma}</pkDocuFirma>
        <descripcion>Sello del servidor</descripcion>
        <textoFirma>Firmado automáticamente</textoFirma>
    </NuevoFirmanteServidor>
    </soap:Body>
    </soap:Envelope>`

    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: soapRequest,
    })
    .then(response => response.text())
    .then(data => {
        console.log('NuevoFirmanteServidor DATA', data)
        if (data.match('faultcode')) {
            let error = data.match(/<faultstring>(.*?)<\/faultstring>/s)
            throw new Error(error ? error[1] : data)
        }
        let match = data.match(/<NuevoFirmanteServidorResult>(\d+)<\/NuevoFirmanteServidorResult>/)
        if (!match) throw new Error('No se pudo obtener el idFirmante: ' + data)
        return parseInt(match[1])
    })
    .catch(e => {
        console.log('E', e)
        throw e
    })
}


function enviarDocufirmaAFirmar(idDocuFirma, { realm } = {}){

    const url = 'https://pre.sedipualba.es/sefycu/wssefycu.asmx';
    let segUser = getUser(realm)
    let segPass = getSegPass(realm)

    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
    <EnviarDocufirmaAFirmar xmlns="https://eadmin.dipualba.es/sefycu/wssefycu.asmx">
        <wsSegUser>${segUser}</wsSegUser>
        <wsSegPass>${segPass}</wsSegPass>
        <idEntidad>46003</idEntidad>
        <pkDocuFirma>${idDocuFirma}</pkDocuFirma>
    </EnviarDocufirmaAFirmar>
    </soap:Body>
    </soap:Envelope>`

    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: soapRequest,
    })
    .then(response => response.text())
    .then(data => {
        console.log('EnviarDocufirmaAFirmar DATA', data)
        if (data.match('faultcode')) {
            let error = data.match(/<faultstring>(.*?)<\/faultstring>/s)
            throw new Error(error ? error[1] : data)
        }
        return true
    })
    .catch(e => {
        console.log('E', e)
        throw e
    })
}


function obtenerEstadoDocuFirma(idDocuFirma, { realm } = {}){

    const url = 'https://pre.sedipualba.es/sefycu/wssefycu.asmx';
    let segUser = getUser(realm)
    let segPass = getSegPass(realm)

    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
    <ObtenerEstadoDocuFirma xmlns="https://eadmin.dipualba.es/sefycu/wssefycu.asmx">
        <wsSegUser>${segUser}</wsSegUser>
        <wsSegPass>${segPass}</wsSegPass>
        <idEntidad>46003</idEntidad>
        <pkDocuFirma>${idDocuFirma}</pkDocuFirma>
    </ObtenerEstadoDocuFirma>
    </soap:Body>
    </soap:Envelope>`

    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: soapRequest,
    })
    .then(response => response.text())
    .then(data => {
        if (data.match('faultcode')) {
            let error = data.match(/<faultstring>(.*?)<\/faultstring>/s)
            throw new Error(error ? error[1] : data)
        }
        let match = data.match(/<ObtenerEstadoDocuFirmaResult>(-?\d+)<\/ObtenerEstadoDocuFirmaResult>/)
        if (!match) throw new Error('No se pudo obtener el estado: ' + data)
        return parseInt(match[1]) // 0=Borrador 1=Firma 2=EnvioNotif 3=Completado -1=Rechazado
    })
}


function obtenerUrlDocuFirma(idDocuFirma, { realm } = {}){

    const url = 'https://pre.sedipualba.es/sefycu/wssefycu.asmx';
    let segUser = getUser(realm)
    let segPass = getSegPass(realm)

    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
    <ObtenerUrlDocuFirma xmlns="https://eadmin.dipualba.es/sefycu/wssefycu.asmx">
        <wsSegUser>${segUser}</wsSegUser>
        <wsSegPass>${segPass}</wsSegPass>
        <idEntidad>46003</idEntidad>
        <pkDocuFirma>${idDocuFirma}</pkDocuFirma>
        <tipo>PdfAccesoPublico</tipo>
    </ObtenerUrlDocuFirma>
    </soap:Body>
    </soap:Envelope>`

    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: soapRequest,
    })
    .then(response => response.text())
    .then(data => {
        console.log('ObtenerUrlDocuFirma DATA', data)
        if (data.match('faultcode')) {
            let error = data.match(/<faultstring>(.*?)<\/faultstring>/s)
            throw new Error(error ? error[1] : data)
        }
        let match = data.match(/<ObtenerUrlDocuFirmaResult>(.*?)<\/ObtenerUrlDocuFirmaResult>/)
        if (!match) throw new Error('No se pudo obtener la URL: ' + data)
        const resultUrl = match[1].replaceAll('&amp;', '&')
        if (!resultUrl.startsWith('http')) throw new Error('SEFYCU devolvió error en lugar de URL: ' + resultUrl)
        return resultUrl
    })
}


async function waitAndGetSignedUrl(idDocuFirma, { maxRetries = 20, intervalMs = 500, realm } = {}) {
    for (let i = 0; i < maxRetries; i++) {
        const estado = await obtenerEstadoDocuFirma(idDocuFirma, { realm })
        console.log(`Estado docufirma ${idDocuFirma}: ${estado}`)
        if (estado === 3) {
            const pdfUrl = await obtenerUrlDocuFirma(idDocuFirma, { realm })
            console.log('PDF URL:', pdfUrl)
            return pdfUrl
        }
        if (estado === -1) throw new Error('El docufirma fue rechazado')
        await new Promise(r => setTimeout(r, intervalMs))
    }
    throw new Error('Timeout esperando la firma del documento')
}

async function waitAndGetSignedBase64(idDocuFirma, { maxRetries = 10, intervalMs = 1500, realm } = {}) {
    const pdfUrl = await waitAndGetSignedUrl(idDocuFirma, { maxRetries, intervalMs, realm })
    const buffer = await fetch(pdfUrl).then(r => r.arrayBuffer())
    return Buffer.from(buffer).toString('base64')
}


module.exports = {
    uploadSedipuAlba,
    setDocuFirmaPdfBase64,
    nuevoFirmanteServidor,
    enviarDocufirmaAFirmar,
    obtenerEstadoDocuFirma,
    obtenerUrlDocuFirma,
    waitAndGetSignedUrl,
    waitAndGetSignedBase64,
}
