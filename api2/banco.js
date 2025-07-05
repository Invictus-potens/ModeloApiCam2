const express = require('express');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// 📦 Conexão com o banco de dados SQLite
const db = new sqlite3.Database(__dirname + '/empresas.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao SQLite:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
  }
});

// 🏗️ Criação da tabela (se não existir)
db.run(`
  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    codigo_seguranca TEXT
  )
`);

function gerarCodigo() {
  const codigo = crypto.randomBytes(4).toString('hex');
  console.log(`🔐 Código gerado: ${codigo}`);
  return codigo;
}

// Rota para verificar CNPJ e gerenciar códigos
app.post('/verificar', (req, res) => {
  const { cnpj, codigoDigitado } = req.body;
  console.log(`📥 Requisição recebida: cnpj=${cnpj}, codigoDigitado=${codigoDigitado || 'N/A'}`);

  if (!cnpj) {
    console.warn('⚠️ CNPJ não informado');
    return res.status(400).json({ error: 'CNPJ é obrigatório.' });
  }

  db.get('SELECT * FROM empresas WHERE cnpj = ?', [cnpj], (err, empresa) => {
    if (err) {
      console.error('💥 Erro na consulta:', err.message);
      return res.status(500).json({ error: 'Erro no banco de dados.' });
    }

    if (!empresa) {
      console.warn(`❌ CNPJ não encontrado: ${cnpj}`);
      return res.status(404).json({ 
        error: 'CNPJ não encontrado no banco de dados.',
        mensagem: 'Este CNPJ não está cadastrado no sistema.'
      });
    }

    console.log(`🏢 Empresa encontrada: ${empresa.nome} | CNPJ: ${empresa.cnpj}`);

    // Caso 1: CNPJ existe mas não tem código - gerar novo código
    if (!empresa.codigo_seguranca) {
      const novoCodigo = gerarCodigo();
      db.run('UPDATE empresas SET codigo_seguranca = ? WHERE cnpj = ?', [novoCodigo, cnpj], function (err2) {
        if (err2) {
          console.error('💥 Erro ao atualizar código:', err2.message);
          return res.status(500).json({ error: 'Erro ao salvar o código.' });
        }

        console.log(`✅ Código atribuído à empresa ${empresa.nome} (CNPJ: ${cnpj})`);
        return res.json({
          mensagem: 'Código gerado e atribuído com sucesso.',
          codigo: novoCodigo,
          empresa: empresa.nome,
          status: 'codigo_gerado'
        });
      });
    } 
    // Caso 2: CNPJ existe e já tem código
    else {
      console.log(`🔐 Empresa já possui código: ${empresa.codigo_seguranca}`);

      // Se não foi informado código para validação
      if (!codigoDigitado) {
        console.log('📋 Solicitando código de validação');
        return res.json({ 
          mensagem: 'Código já atribuído. Informe o código para validação.',
          empresa: empresa.nome,
          status: 'aguardando_codigo'
        });
      }

      // Se foi informado código, validar
      if (codigoDigitado === empresa.codigo_seguranca) {
        console.log('✅ Código validado com sucesso!');
        return res.json({ 
          mensagem: 'Código válido. Acesso permitido.',
          empresa: empresa.nome,
          status: 'acesso_permitido'
        });
      } else {
        console.warn(`❌ Código incorreto. Esperado: ${empresa.codigo_seguranca}, recebido: ${codigoDigitado}`);
        return res.status(401).json({ 
          mensagem: 'Código incorreto. Acesso negado.',
          empresa: empresa.nome,
          status: 'acesso_negado'
        });
      }
    }
  });
});

// Rota adicional para listar empresas (útil para testes)
app.get('/empresas', (req, res) => {
  db.all('SELECT id, nome, cnpj, codigo_seguranca FROM empresas', (err, empresas) => {
    if (err) {
      console.error('💥 Erro ao listar empresas:', err.message);
      return res.status(500).json({ error: 'Erro ao consultar empresas.' });
    }
    res.json({ empresas });
  });
});

app.listen(3002, () => {
  console.log('🚀 Servidor rodando em http://localhost:3002');
  console.log('📋 Endpoints disponíveis:');
  console.log('   POST /verificar - Verificar CNPJ e gerenciar códigos');
  console.log('   GET  /empresas  - Listar todas as empresas');
});