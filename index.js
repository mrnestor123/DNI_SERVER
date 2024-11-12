
// hola
const express = require('express');
const app = express();
const { dniCheck, initDni, findPadron } = require('./dni');

const PORT = 8080

app.get('/dni/check', (req,res)=>{
    try {
    // la función en dni.js

        let dni = dniCheck()

        res.status(200).json({
            'dni':dni
        })
    }catch(e){
        res.status(400).json(
            {error:'no se ha encontrado el dni'}
        )
    }
})


app.get('/dni/find', async (req,res)=>{
    try {
        let padron = await findPadron('26748186Z')

        
    }catch(e){
        res.status(400).json(
            {error:'no se ha encontrado el dni'}
        )
    }
})

app.get('/dni/initialize', (req,res)=>{
    initDni()
})

app.listen(PORT, ()=>{
    console.log('Server is running on port ' + PORT);
})

// basic 
