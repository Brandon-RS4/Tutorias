const bcrypt = require('bcryptjs');

async function testHash() {
  const newHash = await bcrypt.hash('123456', 12);
  console.log(`NUEVO HASH PARA 123456: ${newHash}`);
}

testHash();
