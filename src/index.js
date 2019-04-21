/* eslint-disable no-console */
const http = require('http');
const logger = require('winston');
const app = require('./app');
// const getFormBody = require('body/form');
const getRawBody = require('raw-body');
// const body = require('body');

if (process.env.ENV_FLAG !== 'function_compute') {
  const port = app.get('port');
  const server = app.listen(port);
  
  process.on('unhandledRejection', (reason, p) =>
    logger.error('Unhandled Rejection at: Promise ', p, reason),
  );
  
  server.on('listening', () =>
    logger.info('Feathers application started on http://%s:%d', app.get('host'),
      port),
  );
}

module.exports.handler = (request, response, context) => {
  try {
    const FCServer = http.createServer(app);
    app.setup(FCServer);
    // 通过 app.request 和 app.response 创建 inComimgMessage 和serverResponse
    const inComimgMessage = Object.create(app.request);
    const serverResponse = Object.create(app.response);
    
    // 将 request 的部分信息赋值给 inComimgMessage
    if (!request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
    }
    inComimgMessage.headers = request.headers;
    inComimgMessage.method = request.method;
    inComimgMessage.path = request.path;
    inComimgMessage.url = request.path;
    inComimgMessage.query = request.queries;
    
    // 使用 response 的方法替换掉 serverResponse 的一些方法
    serverResponse.setHeader = (key, value) => response.setHeader(key, value);
    serverResponse.end = (data, encoding, callback) => {
      response.send(data);
    };
    
    serverResponse.send = serverResponse.end;
    
    serverResponse.status = (code) => {
      response.setStatusCode(code);
    };
    
    serverResponse.writeHead = (code, message, headers) => {
      response.setStatusCode(code);
    };
    
    serverResponse.sendStatus = (code) => {
      response.setStatusCode(code);
      response.send(code);
    };
    
    serverResponse.json = (body) => {
      response.setHeader('content-type', 'application/json');
      if (typeof body === 'string') {
        response.send(body);
      } else {
        response.send(JSON.stringify(body));
      }
    };
    
    // FCServer.on('request', (...args) => {console.log(args);});
    getRawBody(request, function (err, body) {
      if (request.method === 'POST') {
        inComimgMessage.body = JSON.parse(decodeURIComponent(body.toString()));
      }
      FCServer.emit('request', inComimgMessage, serverResponse);
    });
  } catch (e) {
    console.log(e);
    response.send(JSON.stringify({ request, response, context, e }));
  }
};

