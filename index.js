const express = require("express");
const app = express();
const PORT = 8080;
const mysql = require("mysql");
const crypto = require('crypto'); 
const jwt = require('jsonwebtoken')

var bodyParser = require("body-parser")

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json()) 
app.use( express.json() )

function isValidUserData(body) {
  return body && body.username 
}  

function hash(data) {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex')
};


var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "restapi"
});

 

app.listen(
  PORT,
  () => console.log(`It's alive on http://localhost:${PORT}`)
)


app.get('/info', function(req, res) {
  //kod här för att hantera anrop…
  let Kommandon = {
    "(get) info": "Information om kommandon",
    "(get) users": "Hämtar alla users (Kräver inlogg)",
    "(get) users/id": "Hämtar en specifik user efter id (Kräver inlogg)",
    "(push) users": "Skapar en profil i databasen med JSON objekt inehållande: username, first_name, last_name, password",
    "(push) login": "låter användare logga in med JSON objekt inehållande: username, password",
    "(put) users/id": "Redigerar en existerande användare med JSON objekt inehållande: username, password, first_name, Last_name, password (kräver inlogg)"
  }
  res.send(Kommandon)
});






app.get('/users', function(req, res) {

  let authHeader = req.headers['authorization']
  if (authHeader === undefined) {
    res.sendStatus(403).send('Du saknar token i din authorization-header')
  }
  let token = authHeader.slice(7) // tar bort "BEARER " från headern.
  let decoded
  try {
    decoded = jwt.verify(token, 'Hemlis')
  } catch (err) {
    console.log(err)
    res.status(401).send('Din token är stämmer ej eller har gått ut för sessionen')
  }

    console.log("Hämtar users")
    var sql = "SELECT * FROM users"
    con.query(sql, function(err, result, fields) {
        console.log("Efter databasen är klar")
      if (err) {
        throw err
      }
      res.json(result)
    });
});



app.get('/users/:id', function(req, res) {
  
  let authHeader = req.headers['authorization']
  if (authHeader === undefined) {
    res.sendStatus(403).send('Du saknar token i din authorization-header')
  }
  let token = authHeader.slice(7)
  let decoded
  try {
    decoded = jwt.verify(token, 'Hemlis')
  } catch (err) {
    console.log(err)
    res.status(401).send('Din token är stämmer ej eller har gått ut för sessionen')
  }

  console.log("Hämtar users")
  var sql = "SELECT id, first_name, last_name, username FROM users WHERE id = " + req.params.id
  con.query(sql, function(err, result, fields) {
      console.log("Efter databasen är klar")
    if (err) {
      throw err
    }
    if (result[0] == null) {
      res.status(404).end()
    }
    else {
      let user = result[0]
      delete user.password
    res.json(result[0])
    }

  });
});


app.post('/users', function(req, res) {
    //data ligger i req.body. Kontrollera att det är korrekt.
    if (isValidUserData(req.body)) {
        let sql = `INSERT INTO users (username, first_name, last_name, password)
        VALUES ('${req.body.username}', '${req.body.first_name}', '${req.body.last_name}', '${req.body.password}')`
      
        con.query(sql, function(err, result, fields) {
          if (err) throw err
            res.send(result)
        })

    } else {
      res.sendStatus(422)
    }
});
  

app.put('/users/:id', function(req, res) {

  let authHeader = req.headers['authorization']
  if (authHeader === undefined) {
    res.sendStatus(403).send('Du saknar token i din authorization-header')
  }
  let token = authHeader.slice(7)
  // nu finns den inskickade token i variabeln token
  let decoded
  try {
    decoded = jwt.verify(token, 'Hemlis')


  } catch (err) {
    console.log(err)
    res.status(401).send('Din token är stämmer ej eller har gått ut för sessionen')
  }



  let sql = `UPDATE users 
  SET username = '${req.body.username}', first_name = '${req.body.first_name}', last_name = '${req.body.last_name}', password = '${req.body.password}'
  WHERE id = ${req.params.id}`
 
  con.query(sql, function(err, result, fields) {
    if (err) throw err
      res.send(result)
  });
 }); 


app.post('/login', function(req, res) {
  let sql = `SELECT * FROM users WHERE username='${req.body.username}'`
  let sqlPassword = `SELECT password FROM users WHERE password='${req.body.password}'`

  console.log(sql)
  console.log("Försöker logga in...")
 
  con.query(sql, function(err, result, fields) {
    if (err) throw err
      //inskickade lösenordet och jämför med lösenordet från databasen
      let passwordHash = hash(req.body.password)
      if (passwordHash == hash(result[0].password)){
        //Genererar en token
        let payload = {
          sub: result[0].id,                                     
          exp: Date.now()/1000 + 120
          //Håller i 120 sekunder!
        }
        let token = jwt.sign(payload, 'Hemlis')

        let Response = {
        "Svar": "Du är nu inloggad, här under är din token som du använder för att nå åtkomst till admin-behörigheter!",
        "Token": token
        }
        res.send(Response)
      }
      else{
        res.send("Fel lösen, Du är INTE inloggad!")
        res.sendStatus(401)
      }

  });
});
 


