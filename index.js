
// hola
const express = require('express');
const app = express();
const { getDNI, findPadron } = require('./dni');

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
    }catch(e){

        console.log('ERROR', e.toString())

        res.status(400).json(
            {error:'no se ha encontrado el dni'}
        )
    }
})


app.get('/dni/search/:dni', async (req,res)=>{
    try {
        
        let padron = await findPadron(req.params.dni)
        res.status(200).json(padron)
    }catch(e){
        res.status(400).json(
            {error: e.toString() || 'no se ha encontrado el padron con este dni'}
        )
    }
})

app.listen(PORT, ()=>{
    console.log('Server is running on port ' + PORT);
})

// basic 
