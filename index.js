const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nombre único
    }
});

const upload = multer({ storage });

// Cargar datos desde archivos JSON (productos y carritos)
let products = [];
let carts = {};

const loadData = () => {
    if (fs.existsSync('./products.json')) {
        products = JSON.parse(fs.readFileSync('./products.json', 'utf8'));
    }
    if (fs.existsSync('./carts.json')) {
        carts = JSON.parse(fs.readFileSync('./carts.json', 'utf8'));
    }
};

const saveData = () => {
    fs.writeFileSync('./products.json', JSON.stringify(products, null, 2));
    fs.writeFileSync('./carts.json', JSON.stringify(carts, null, 2));
};

// Inicializar datos al iniciar el servidor
loadData();

// Endpoint para obtener productos
app.get('/productos', (req, res) => {
    res.json(products);
});

// Endpoint para agregar productos con imagen
app.post('/productos', upload.single('imagen'), (req, res) => {
    const { categoria, descripcion, disponible, nombre, precio, stock } = req.body;
    const imagenURL = `http://localhost:3000/uploads/${req.file.filename}`;

    const newProduct = {
        id: (products.length + 1).toString(),
        categoria,
        descripcion,
        disponible: disponible === 'true',
        imagenURL,
        nombre,
        precio: parseFloat(precio),
        stock: parseInt(stock, 10)
    };

    products.push(newProduct);
    saveData(); // Guardar productos actualizados
    res.json(newProduct);
});

// Obtener carrito de un usuario
app.get('/carrito/:userId', (req, res) => {
    const userId = req.params.userId;
    res.json(carts[userId] || []);
});

// Agregar producto al carrito
app.post('/carrito/:userId', (req, res) => {
    const userId = req.params.userId;
    const { id, nombre, precio, cantidad } = req.body;

    if (!carts[userId]) carts[userId] = [];
    const existingItem = carts[userId].find(item => item.id === id);

    if (existingItem) {
        existingItem.cantidad += cantidad;
    } else {
        carts[userId].push({ id, nombre, precio, cantidad });
    }

    saveData(); // Guardar carritos actualizados
    res.json(carts[userId]);
});

// Vaciar carrito
app.delete('/carrito/:userId', (req, res) => {
    const userId = req.params.userId;
    carts[userId] = [];
    saveData(); // Guardar carritos actualizados
    res.json(carts[userId]);
});

// Reducir stock tras compra
app.post('/pago/:userId', (req, res) => {
    const userId = req.params.userId;
    const carrito = carts[userId] || [];

    carrito.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
            product.stock -= item.cantidad;
        }
    });

    carts[userId] = []; // Vaciar carrito después del pago
    saveData(); // Guardar carritos y productos actualizados
    res.json({ mensaje: "Pago realizado", productos: products });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
