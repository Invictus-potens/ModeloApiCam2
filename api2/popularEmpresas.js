const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const db = new sqlite3.Database(__dirname + '/empresas.db');

function gerarCNPJ() {
  // Gera um CNPJ aleatório de 14 dígitos
  let cnpj = '';
  for (let i = 0; i < 14; i++) {
    cnpj += Math.floor(Math.random() * 10);
  }
  return cnpj;
}

function gerarCodigo() {
  return crypto.randomBytes(4).toString('hex');
}

function inserirEmpresas() {
  let inseridos = 0;
  for (let i = 0; i < 100; i++) {
    const nome = `Empresa Teste ${i + 1}`;
    const cnpj = gerarCNPJ();
    let codigo = null;
    if (i >= 50) {
      codigo = gerarCodigo();
    }
    db.run(
      'INSERT INTO empresas (nome, cnpj, codigo_seguranca) VALUES (?, ?, ?)',
      [nome, cnpj, codigo],
      function (err) {
        if (err) {
          console.error(`Erro ao inserir empresa ${nome}:`, err.message);
        } else {
          inseridos++;
          if (inseridos === 100) {
            console.log('✅ Inserção concluída!');
            db.close();
          }
        }
      }
    );
  }
}

inserirEmpresas(); 