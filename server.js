// server.js
//SECCION DE MANEJO DE LIBRERIAS Y VARIABLES

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const uri = 'mongodb+srv://al20020726:jSBbGIiES0zXb9vC@clusterisic8s.hdwmx2j.mongodb.net/userdb?retryWrites=true&w=majority&appName=ClusterISIC8S';

mongoose.connect(uri).
then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch(err => console.error(err));


//SECION PARA MANEJO DE USUARIOS
{
const UserSchema = new mongoose.Schema({
  user: String,
  passw: String,
  role: String
});

const User = mongoose.model('users', UserSchema);


app.post('/api/login', async (req, res) => {
  const { user, passw } = req.body;
  
  try {
    // Retrieve user from database
    const userf = await User.findOne({ user });

    // Check if user exists
    if (!userf) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Compare hashed password with the provided password
    const isPasswordValid = await bcrypt.compare(passw, userf.passw);

    /*console.log('normal:'+passw)
    console.log('hash:'+userf.passw)*/

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    //console.log(userf.role);
    

    return res.status(200).json({ message: 'Login exitoso',rol: userf.role, username: userf.user, token: generadorToken()});
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Error logging in' });
  }
});

// Obtener todos los usuarios
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, { _id: 0, __v: 0 }); // Excluir el _id y __v de la respuesta

    // Verificar si se encontraron usuarios
    if (users.length === 0) {
      return res.status(404).json({ message: 'No se encontraron usuarios' });
    }

    // Devolver la lista de usuarios
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

//buscador de pibes
app.get('/searchuser/:user', async (req, res) => {
  try {
    const userSeek  = req.params.user;
    //console.log('user:' +userSeek)
    // Verificar si se proporcionó un nombre en la consulta
    if (!userSeek) {
      return res.status(400).json({ message: 'Debe proporcionar un nombre para buscar usuarios' });
    }

      // Create a regular expression to match usernames containing 'admin'
      const buscaUsuario = new RegExp(userSeek, 'i'); // 'i' makes it case-insensitive

    //Se utiliza la expresion regular para buscar cualquier dato
    //que coincida con el nombre de usuario proporcionado
    // Buscar usuarios que coincidan con el nombre
    const users = await User.find({ 'user' :  { $regex: buscaUsuario } }, { _id: 0, __v: 0 });

    //console.log(users);

    // Verificar si se encontraron usuarios
    if (users.length === 0) {
      console.log(users);
      return res.status(404).json({message:'No se encontraron usuarios con el nombre proporcionado'});
    }

    // Devolver la lista de usuarios que coinciden con el nombre
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});





// Eliminar usuario por nombre de usuario
app.delete('/deluser/:user', async (req, res) => {
  const username = req.params.user;

  try {
    const deletedUser = await User.findOneAndDelete({ user: username});
    //console.log('usuario es:'+username)
    if (deletedUser) {
      return res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    } else {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Handle POST request
app.post('/insertUser', async (req, res) => {
  const newData = req.body;
  const client = new MongoClient(uri);
  //primero se verifica si el cliente ya existe
  // Verificar si el usuario ya existe
  const { user } = req.body;

  // Verificar si el usuario ya existe
  const existingUser = await User.findOne({ user });
  if (existingUser) {
    return res.sendStatus(201)
  }
  
  try {
      await client.connect(); // Connect to MongoDB cluster

      const database = client.db(); // Get the database
      const collection = database.collection('users'); // Get the collection

      // Insert data
      const result = await collection.insertOne(newData);
      res.send("Data inserted successfully");

  } catch (err) {
      console.error("Error:", err.message);
      res.status(500).send("Error inserting data");
  } finally {
      client.close(); // Close the connection
  }
});

// Route to update a user
app.put('/updateUser/:olduser', async (req, res) => {

  const oldusername = req.params.olduser;
  const newUser = req.body.user;
  const newPassw = req.body.passw; 
  const choosenRole = req.body.role;
  //const userNewData = req.body;

  try {
      const filter = { user: oldusername };
      const   updateDoc = { 'user':newUser,'passw':newPassw, 'role':choosenRole };
      
      // Update the document in the collection
      const result = await User.updateOne(filter, updateDoc);

      if (result.modifiedCount === 1) {
          res.status(200).json({ message: 'User updated successfully'});
      } else {
          res.status(404).json({ message: 'User not found'});
      }
  } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Internal server error'});
  }
});
}

{
//SECCION PARA MANEJO DE PEDIDOS
const SchemaPedidos = new mongoose.Schema({
  //este tipo de dato es para obtener y eliminar registros a traves de su ObjectID
  _id : mongoose.Schema.Types.ObjectId,
  selects_cuantos : Array,
  selects_tipo : Array,
  datosUsuario: Object,
  estado: String
});

const Pedidos = mongoose.model('pedidos', SchemaPedidos);

//SchemaPedidos es el nuevo modelo

// Handle POST request
app.post('/insertPedido', async (req, res) => {
  const newData = req.body;
  const client = new MongoClient(uri);
  //primero se verifica si el cliente ya existe
  // Verificar si el usuario ya existe
  try {
      await client.connect(); // Connect to MongoDB cluster

      const database = client.db(); // Get the database
      const collection = database.collection('pedidos'); // Get the collection

      // Insert data
      const result = await collection.insertOne(newData);
      res.send("Data inserted successfully");

  } catch (err) {
      console.error("Error:", err.message);
      res.status(500).send("Error inserting data");
  } finally {
      client.close(); // Close the connection
  }
});


//obtener datos de pedidos
app.get('/pedidos', async (req, res) => {
  try {
    const pedidos = await Pedidos.find().select('-__v'); // Excluding the __v field from the response

    // Verificar si se encontraron pedidos
    if (pedidos.length === 0) {
      return res.status(404).json({ message: 'No se encontraron pedidos' });
    }

    // Devolver la lista de pedidos
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Eliminar pedido utilizando su ID
app.delete('/delpedido/:id_pedido', async (req, res) => {
  const id_pedido = req.params.id_pedido;
  //console.log(id_pedido);
  try {
    const deletedUser = await Pedidos.findOneAndDelete({ _id: id_pedido});
    //console.log('usuario es:'+username)
    if (deletedUser) {
      return res.status(200).json({ message: 'Pedido eliminado exitosamente' });
    } else {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Actuaizar un pedido
app.put('/updatePedidoCompletado/:id_pedido', async (req, res) => {

  const id_pedido = req.params.id_pedido;

  try {
      const filter = { _id: id_pedido };
      const updateDoc = { 'estado' : 'entregado'};
      
      // Update the document in the collection
      const result = await Pedidos.updateOne(filter, updateDoc);

      if (result.modifiedCount === 1) {
          res.status(200).json({ message: 'Pedido actualizado'});
      } else {
          res.status(404).json({ message: 'No se encontro pedido'});
      }
  } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Internal server error'});
  }
});

}



//function to generate a Token

var generadorLetras = function() {
  return Math.random().toString(36).substr(2); // remove `0.`
};

var generadorToken = function() {
  return generadorLetras() + generadorLetras(); // to make it longer
};

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

