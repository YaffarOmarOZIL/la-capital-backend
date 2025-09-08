const bcrypt = require('bcryptjs');

const passwordPlana = 'admin123';
const saltRounds = 10; // Este es un buen valor estándar

const hashGenerado = bcrypt.hashSync(passwordPlana, saltRounds);

console.log('Tu nueva contraseña hasheada es:');
console.log(hashGenerado);