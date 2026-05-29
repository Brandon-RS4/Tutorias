const { listarGrupos } = require('./controllers/tutoria.controller');

const mockReq = {
  query: {}
};

const mockRes = {
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    console.log('STATUS:', this.statusCode);
    console.log('BODY:', JSON.stringify(body, null, 2));
  }
};

listarGrupos(mockReq, mockRes, console.error);
