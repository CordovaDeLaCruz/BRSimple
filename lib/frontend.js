let port = process.argv[2]
if (!port) {
  console.log('Port es requerido')
  process.exit(1)
}
port = +port
process.env.STAGE = 'test'
const oConfig = { port: +port }
const Hapi = require('@hapi/hapi')
const Inert = require('@hapi/inert')
const Vision = require('@hapi/vision')
const Path = require('path')
const Handlebars = require('handlebars')
const fs = require('fs')
const subdomain = 'eci'
const templateVerificaDni = Handlebars.compile(fs.readFileSync('./public/verificadni.html', 'utf8'))
const oDemoConfig = JSON.parse(fs.readFileSync('./public/config.demo.json'), 'utf8')
const init = async function () {
  const server = new Hapi.Server({
    port: oConfig.port,
    // connections: {
    routes: {
      files: {
        relativeTo: Path.resolve(Path.join('.', '/public'))// Path.join(__dirname, 'public')
      }
    }
    // }
  })

  await server.register([
    Inert,
    Vision
  ])
  console.log(Path.resolve(Path.join('.', '/public')))
  server.views({
    engines: {
      html: Handlebars
    },
    path: Path.resolve(Path.join('.', '/public')),
    layout: false // 'layout'
  })
  server.route({
    method: 'GET',
    path: `/${subdomain}/verificadni`,
    handler: function (request, reply) {
      var data = {
        env: process.env.STAGE
      }
      let sContent = templateVerificaDni(data)
      sContent = sContent.replace('##RECAPTCHA_SITEKEY##', oDemoConfig.sitekey)
      return sContent
    }
  })
  /*
  server.route({
    method: 'GET',
    path: `/${subdomain}/test`,
    handler: function (request, reply) {
      var data = {}
      reply.view(`${subdomain}/test`, data)
    }
  })
  server.route({
    method: 'GET',
    path: `/${subdomain}/test2`,
    handler: function (request, reply) {
      var data = {}
      reply.view(`${subdomain}/test2`, data)
    }
  })
*/
  server.route({
    method: 'GET',
    path: `/${subdomain}/assets/{param*}`,
    handler: {
      directory: {
        path: 'assets',
        redirectToSlash: true,
        index: true
      }
    }
  })
  server.route({
    method: 'GET',
    path: `/${subdomain}/vendor/{param*}`,
    handler: {
      directory: {
        path: 'vendor',
        redirectToSlash: true,
        index: true
      }
    }
  })
  server.route({
    method: 'GET',
    path: `/${subdomain}/config.test.json`,
    handler: function (request, reply) {
      return reply.file('config.demo.json')
    }
  })
  server.route({
    method: 'POST',
    path: `/${subdomain}/csrf`,
    handler: function (req, reply) {
      // var data = {}
      return { data: 'token_test' }
    }
  })
  const dnis = [
    { value: '11111111', data: './resources/mock-data/11111111.json', template: Handlebars.compile(fs.readFileSync('./resources/template/html/index_SEF.html', 'utf8')) },
    { value: '22222222', data: './resources/mock-data/22222222.json', template: Handlebars.compile(fs.readFileSync('./resources/template/html/index_TARJETA.html', 'utf8')) },
    { value: '33333333', data: './resources/mock-data/33333333.json', template: Handlebars.compile(fs.readFileSync('./resources/template/html/index_tc.html', 'utf8')) }
  ]
  server.route({
    method: 'POST',
    path: `/${subdomain}/eci`,
    handler: function (req, reply) {
      var data = {
        env: process.env.STAGE
      }
      var payload = req.payload
      var dni = payload.dni
      var hash = payload.hash
      console.log('dni', dni)
      console.log('hash', hash)
      // Devolver un eci
      let index = -1
      for (var i = 0, l = dnis.length; i < l; ++i) {
        if (dnis[i].value === dni) {
          index = i
          break
        }
      }
      if (index === -1) {
        return reply.view('error', data)
      }
      const oContent = JSON.parse(fs.readFileSync(dnis[index].data, 'utf8'))
      oContent.env = data.env
      const template = dnis[index].template
      return template(oContent)
    }
  })
  server.route({
    method: 'POST',
    path: `/${subdomain}/hash`,
    handler: function (req, reply) {
      // var data = {}
      var payload = req.payload
      var token = payload.token
      var dni = payload.dni
      // var hash = payload.hash
      var aoErrs = []
      let index = -1
      for (var i = 0, l = dnis.length; i < l; ++i) {
        if (dnis[i].value === dni) {
          index = i
          break
        }
      }
      if (!dni || index === -1) {
        aoErrs.push('1')
      }
      if (!token) {
        aoErrs.push('2')
      }
      return { error: aoErrs.length > 0, data: aoErrs }
    }
  })
  await server.start()
  console.log(`Server running at: ${server.info.uri}`)
}
init()
