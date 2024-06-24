// server.js
//SECCION DE MANEJO DE LIBRERIAS Y VARIABLES

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const uri = process.env.MONGODB_URI_TAQUERIA;

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
    // Obtiene la lista de usuarios
    const userf = await User.findOne({ user });

    // Revisa si el usuario existe
    if (!userf) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Compara las contraseñas encryptadas
    const isPasswordValid = await bcrypt.compare(passw, userf.passw);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    return res.status(200).json({ message: 'Login exitoso',rol: userf.role, username: userf.user, token: generadorToken()});
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Error logging in' });
  }
});

// Obtener todos los usuarios para Dashboards
app.get('/api/users', async (req, res) => {
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

//Funcion para buscar un usuario
app.get('/api/searchuser/:user', async (req, res) => {
  try {
    const userSeek  = req.params.user;
    //Verificar si se proporcionó un nombre en la consulta
    if (!userSeek) {
      return res.status(400).json({ message: 'Debe proporcionar un nombre para buscar usuarios' });
    }

      //Utilizamos una expresion regular para buscar todo lo que coincida con la busqueda proporcionada
      const buscaUsuario = new RegExp(userSeek, 'i'); // 'i' makes it case-insensitive

    //Se utiliza la expresion regular para buscar cualquier dato
    //que coincida con el nombre de usuario proporcionado
    
    //Buscar usuarios que coincidan con el nombre
    const users = await User.find({ 'user' :  { $regex: buscaUsuario } }, { _id: 0, __v: 0 });

    // Regresar mensaje si no hubo coincidencias
    if (users.length === 0) {
      console.log(users);
      return res.status(404).json({message:'No se encontraron usuarios con el nombre proporcionado'});
    }

    // Si se encontró coincidencias, devolver la lista de usuarios que coinciden con el nombre
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar usuario por nombre de usuario
app.delete('/api/deluser/:user', async (req, res) => {
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

// Funcion para insertar nuevos usuarios
app.post('/api/insertUser', async (req, res) => {
  const newData = req.body;
  const client = new MongoClient(uri);
  //primero se verifica si el cliente ya existe
  const { user } = req.body;

  // Verificar si el usuario ya existe
  const existingUser = await User.findOne({ user });
  if (existingUser) {
    return res.sendStatus(201)
  }
  
  try {
      await client.connect(); // Conexion al Cluster de Mongo DB

      const database = client.db(); // Obtener la base de datos
      const collection = database.collection('users'); // Obtener la coleccion

      // Insertar datos
      const result = await collection.insertOne(newData);
      res.send("Data inserted successfully");

  } catch (err) {
      console.error("Error:", err.message);
      res.status(500).send("Error inserting data");
  } finally {
      client.close(); // Terminar la conexion
  }
});

// Funcion para actualizar un usuario existente
app.put('/api/updateUser/:olduser', async (req, res) => {

  const oldusername = req.params.olduser;
  const newUser = req.body.user;
  const newPassw = req.body.passw; 
  const choosenRole = req.body.role;

  try {
      const filter = { user: oldusername };
      const   updateDoc = { 'user':newUser,'passw':newPassw, 'role':choosenRole };
      
      // Actualizar el documento en la coleccion
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

// Esta funcion inserta un nuevo pedido
app.post('/api/insertPedido', async (req, res) => {
  const newData = req.body;
  const client = new MongoClient(uri);
  try {
      await client.connect(); // Conexion al cluster

      const database = client.db(); // Obtener la base de datos
      const collection = database.collection('pedidos'); // Obtener la coleccion

      // Insertar pedido
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
app.get('/api/pedidos', async (req, res) => {
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
app.delete('/api/delpedido/:id_pedido', async (req, res) => {
  const id_pedido = req.params.id_pedido;
  try {
    const deletedUser = await Pedidos.findOneAndDelete({ _id: id_pedido});
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

// Actuaizar un pedido (NO TERMINADO)
app.put('/api/updatePedidoCompletado/:id_pedido', async (req, res) => {

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
});//FIN DE ACTUALIZAR PEDIDO

}

//funcion para generar un token
var generadorLetras = function() {
  return Math.random().toString(36).substr(2); // remove `0.`
};

var generadorToken = function() {
  return generadorLetras() + generadorLetras(); // Para hacerlo mas largo
};

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

