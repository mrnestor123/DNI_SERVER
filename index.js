
// hola
const express = require('express');
const app = express();
const { getDNI, findPadron } = require('./dni');

const {
    getCompletedQueue,
    getNotCompletedQueue,
    getPrinterNames,
    getPrinterOptions,
    getAllPrinterOptions,
    printBuffer,
    printFile,
    cancelAllJobs,
    cancelJob,
} = require("node-cups");

var fs = require('fs');
const cors = require('cors');

const PORT = 8080

// enable cors to the server
const corsOpt = {
    origin: ['http://localhost:5500', 'localhost:5500', '127.0.1.1:5500', 'https://public.digitalvalue.es'], 
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'] 
};
    
app.use(cors(corsOpt)); // cors for all the routes of the application
app.options('*', cors(corsOpt)); 
      


app.get('/dni/check', (req,res)=>{
    try {
        // la función en dni.js
        let data = getDNI()
        res.status(200).json(data)
    } catch(e){
        logError(e && e.toString())
        res.status(400).json(
            {error:'no se ha encontrado el dni'}
        )
    }
})


app.get('/dni/search/:dni', async (req,res)=>{
    try {
        let padron = await findPadron(req.params.dni)
        res.status(200).json(padron)
    } catch(e){
        logError(e && e.toString)
        res.status(400).json({error: 'No se ha encontrado el padron con este dni'})
    }
})

function isNow(date){
    return (new Date().getTime()-new Date(date).getTime())/60000 < 5
}

app.get('/print/check', async (req,res)=>{
    try {
        // COMPROBAMOS SI HAY ALGÚN TRABAJO EN COLA DE HACE 5 MINUTOS
        let printerNames = await getPrinterNames();

        let error = '';

        if(printerNames && printerNames.length > 0 ){
            let notCompleted = await getNotCompletedQueue();
            

            if(!notCompleted || !notCompleted.length || notCompleted.filter((f)=>isNow(f.date)).length == 0){
               res.status(400).json({'error': 'No se ha enviado ningún documento a la impresora'}) 
            } else {
                // TO do: SI SE HA IMPRESO BIEN !
                let completed = await getCompletedQueue() 
                    
                if(!completed || !completed.length || completed.filter((f)=>isNow(f.date)).length == 0){
                    res.status(200).json({message: 'Imprimiendo...'})
                } else {
                    res.status(200).json({ok:true})
                }
            }

            console.log(printerOptions);
        } else {
            // no conectada
            res.status(400).json({error: 'La impresora no está conectada', offline:true})
        }
    } catch(e){
        logError(e && e.toString)
        res.status(400).json({error: 'Error inesperado'})
    }
})


app.get('/print/cancel', async (req,res)=>{
    try {
        console.log('CANCELLING')
        let cancel = await cancelAllJobs()
        console.log('jobs canceled', cancel)

        res.status(200).json({ok:true})
    }catch(e){
        res.status(400).json({error:'Error'})
    }
})

app.get('/print/list', async (req,res)=>{
    try {
        let printerNames = await getPrinterNames();
        return res.status(200).json(printerNames);
    } catch(e){
        console.log(e.toString())
        logError(e && e.toString)
        res.status(400).json({error: 'No se ha encontrado impresoras'})
    }
})

app.get('/print/options', async (req,res)=>{
    try {
        let printerNames = await getPrinterNames();
        let printerOptions = await getPrinterOptions(printerNames[0]);
        console.log(printerOptions);

    } catch(e){
        logError(e && e.toString)
        res.status(400).json({error: 'No se ha encontrado impresoras'})
    }
})

function logError(error) {
    if(error){
        fs.appendFile('info_server.txt', 
            new Date().toISOString() + '  ' + error + '\n', 
            function (err) {
            if (err) throw err;
            console.log('Saved!');
        });
    }
}


app.listen(PORT, ()=>{
    console.log('Server is running on port ' + PORT);
})

// basic 
