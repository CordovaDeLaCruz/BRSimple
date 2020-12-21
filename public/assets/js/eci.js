// NECESARIO PARA IE8
(function (window) {
  var oConfig
  var $ = window.jQuery
  var CURRENT_CSRF_TOKEN = null
  if (!window.sessionStorage) {
    return window.alert('No soportado sessionStorage en este browser')
  }
  var tipoDoc = 'DNI'
  var envNode = document.getElementById('env')
  var env = envNode.value
  envNode.remove()
  // var env = 'test'
  var formError = null
  function next () {
    var grecaptcha = window.grecaptcha
    var error = (function () {
      var $displayError = $('#display_error')
      return {
        message: function (msg) {
          console.log(msg)
          $displayError.text(msg)
        }
      }
    })()
    var managerNavegacion = (function () {
      var oNavs = {
        login: $('#nav_login'),
        error: $('#nav_error')
      }
      var keys = Object.keys(oNavs)
      return {
        show: function (nav) {
          if (!oNavs[nav]) {
            return console.error('Nav ' + nav + ' no detectado')
          }
          for (var i = 0, l = keys.length; i < l; i++) {
            oNavs[keys[i]].addClass('ocultar')
          }
          oNavs[nav].removeClass('ocultar')
        },
        hide: function (nav) {
          if (!oNavs[nav]) {
            return console.error('Nav ' + nav + ' no detectado')
          }
          oNavs[nav].removeClass('ocultar')
        }
      }
    })()

    var locationValue = (new URL(window.location.href)).searchParams
    var hash = locationValue.get('hash')
    if (!hash) {
      managerNavegacion.show('error')
      error.message('Hash es requerido')
      return false
    }
    var version = locationValue.get('v') || '1'
    var $dni = $('#dni')
    var $hash = $('#hash')
    var $token = $('#token')
    var $version = $('#version')
    $hash.val(hash)
    $version.val(version)

    function setInputFilter (textbox, inputFilter) {
      ['input', 'keydown', 'keyup', 'mousedown', 'mouseup', 'select', 'contextmenu', 'drop'].forEach(function (event) {
        textbox.addEventListener(event, function () {
          if (inputFilter(this.value)) {
            this.oldValue = this.value
            this.oldSelectionStart = this.selectionStart
            this.oldSelectionEnd = this.selectionEnd
          } else if (Object.prototype.hasOwnProperty.call(this, 'oldValue')) { // this.hasOwnProperty()
            this.value = this.oldValue
            this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd)
          } else {
            this.value = ''
          }
        })
      })
    }
    setInputFilter($dni[0], function (value) {
      return /^\d*\.?\d*$/.test(value) // Allow digits and '.' only, using a RegExp
    })

    managerNavegacion.show('login')

    var $panelDisplayLogin = $('#panel_display_login')
    // var $panelDisplayError = $('#panel_display_error')

    function getCurrentReintentos () {
      var currentTotalReintentosPendientes = ls.getItem('capacniam-ripley-reintentos-eci')// devuelve string
      if (currentTotalReintentosPendientes === null) {
        currentTotalReintentosPendientes = '3'
      }
      currentTotalReintentosPendientes = +currentTotalReintentosPendientes// pasar a integer
      if (isNaN(currentTotalReintentosPendientes)) {
        throw new Error('Detectada alteracion en contenido de sessionStorage.Interrumpiendo flujo de ejecucion actual')
      }
      if (currentTotalReintentosPendientes <= 0) {
        ls.setItem('capacniam-ripley-reintentos-eci', '0')
        currentTotalReintentosPendientes = 0
      }
      return currentTotalReintentosPendientes
    }

    function getCurrentContext () {
      var asPathProtocol = window.location.href.split('//')
      var sPathNoProtocol = asPathProtocol.pop()

      // luego, aqui se supone que el primero es el dominio y luego el resto el contexto
      var asPath = sPathNoProtocol.split('/')// si contiene un / o no
      asPath.shift()// se remueve el dominio
      asPath.pop()// se remueve el contexto
      return asPath.length ? '/' + asPath.join('/') : ''
    }

    var sCurrentContext = getCurrentContext()

    var ls = window.sessionStorage
    var currentTotalReintentosPendientes
    try {
      currentTotalReintentosPendientes = getCurrentReintentos()
    } catch (x) {
      return window.alert(x.message)
    }
    if (!currentTotalReintentosPendientes) { // ya no quedan reintentos
      window.location.href = sCurrentContext + '/error1'
      console.error('redireccion error: 1')
      // $panelDisplayError.show()
      return false
    }
    $panelDisplayLogin.show()

    formError = (function () {
      var ERR_TYPE_DNI = '1'
      var $lblMsjError = $('#lbl_msj_error')
      var $displayMsgError = $('#display_msg_error')
      return {
        ERR_TYPE_DNI: ERR_TYPE_DNI,
        ocultar: function (type) {
          if (type === ERR_TYPE_DNI) {
            $lblMsjError.hide()
            document.getElementById('efectuar_login').disabled = true
          }
          return this
        },
        mostrar: function (type, msg) {
          type = type || ERR_TYPE_DNI
          if (type === ERR_TYPE_DNI) {
            $lblMsjError.show()
            $displayMsgError.text(msg)
            document.getElementById('efectuar_login').style.background = '#D9D9D9'
            document.getElementById('efectuar_login').disabled = true
            document.getElementById('dni').value = ''
          }
        }
      }
    })()
    var $form = $('#form')
    var bRunning = false
    $('#efectuar_login').on('click', function () {
      document.getElementById('efectuar_login').disabled = true
      if (bRunning) {
        return false
      }
      bRunning = true
      // validar que el contenido se encuentre, y luego validar el captcha
      try {
        currentTotalReintentosPendientes = getCurrentReintentos()
      } catch (x) {
        bRunning = false
        return window.alert(x.message)
      }
      if (!currentTotalReintentosPendientes) { // ya no quedan reintentos
        bRunning = false
        return false
      }
      var sUrl = window.location.protocol + '//' + window.location.host + sCurrentContext + '/hash'
      formError.ocultar(formError.ERR_TYPE_DNI).ocultar(formError.ERR_TYPE_RECAPTCHA)

      grecaptcha.ready(function () {
        grecaptcha.execute(oConfig.sitekey, { action: 'homepage' }).then(function (token) {
          // Para impedir que el token se use de manera casual, deberia validar primero el hash y luego el captcha
          console.log(token)
          if (!token) {
            bRunning = false
            return formError.mostrar(formError.ERR_TYPE_RECAPTCHA)
          }
          $.ajax({
            url: sUrl,
            dataType: 'json',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify({
              token: token,
              hash: hash,
              dni: $dni.val(),
              version: version
            }),
            error: function () {
              bRunning = false
              console.log('error')
            },
            success: function (d) {
              bRunning = false
              // el servicio debe permitirme determinar donde esta el origin
              if (d.errorMessage || d.error) { // || !d.data.success
                // La cantidad de errores solo debe disminuir en el caso de que el dni sea el que falla
                if (d.data.indexOf(formError.ERR_TYPE_DNI) !== -1) {
                  currentTotalReintentosPendientes--
                  ls.setItem('capacniam-ripley-reintentos-eci', currentTotalReintentosPendientes + '')
                  var sMsg = 'Recuerda que tienes ' + currentTotalReintentosPendientes + ((currentTotalReintentosPendientes === 1) ? ' intento.' : ' intentos.')
                  document.getElementById('dni').style.borderBottom = '1px solid #EE2737'
                  formError.mostrar(formError.ERR_TYPE_DNI, sMsg)
                }
                // haya o no haya error en el captcha, resetear el captcha
                // grecaptcha.reset()
                // if (d.data.indexOf(formError.ERR_TYPE_RECAPTCHA) !== -1) {
                //  formError.mostrar(formError.ERR_TYPE_RECAPTCHA)
                // }

                if (!currentTotalReintentosPendientes) {
                  $panelDisplayLogin.hide()
                  // $panelDisplayError.show()
                  window.location.href = sCurrentContext + '/error1'
                  console.error('redireccion error: 2')
                }
                return false
              }
              $token.val(CURRENT_CSRF_TOKEN)
              ls.setItem('capacniam-ripley-reintentos-eci', '3')
              $form.submit()
            }
          })
        })
      })
    })

    setInterval(function () {
      try {
        currentTotalReintentosPendientes = getCurrentReintentos()
      } catch (x) {
        return console.error(x)// window.alert(x.message)
      }
      console.log(currentTotalReintentosPendientes)
      if (!currentTotalReintentosPendientes) { // ya no quedan reintentos
        $panelDisplayLogin.hide()
        // $panelDisplayError.show()
        window.location.href = sCurrentContext + '/error1'
        console.error('redireccion error: 3')
        return false
      } else {
        $panelDisplayLogin.show()
        // console.error('redireccion error: 4')
      }
    }, 2 * 1000)

    window.addEventListener('pageshow', function (event) {
      var historyTraversal = event.persisted || (typeof window.performance !== 'undefined' && window.performance.navigation.type === 2)
      if (historyTraversal) {
        window.location.reload()
      }
    })

    if (version !== '1') {
      // se puede usar csrf
      var sUrl = window.location.protocol + '//' + window.location.host + sCurrentContext + '/csrf'
      $.ajax({
        url: sUrl,
        dataType: 'json',
        contentType: 'application/json',
        type: 'POST',
        data: JSON.stringify({
          hash: hash
          // version: version
        }),
        error: function () {
          window.alert('Error de inicializacion.Comuniquese con el adminsitrador del sitio')
        },
        success: function (d) {
          if (d.error) {
            return window.alert('Error de inicializacion.Comuniquese con el adminsitrador del sitio')
          }
          CURRENT_CSRF_TOKEN = d.data
        }
      })
    }
  }
  $(function () {
    // Descargar el archivo de configuracion apropiado para env
    $.ajax({
      url: 'config.' + env + '.json',
      type: 'get',
      dataType: 'text',
      error: function () {
        window.alert('Hubo un error asociado al entorno. Por favor contacte al administrador')
      },
      success: function (sContent) {
        try {
          oConfig = JSON.parse(sContent)
        } catch (x) {
          return window.alert('Hubo un error asociado al entorno. Por favor contacte al administrador')
        }
        /* window.onloadCallback = function () {
          var grecaptcha = window.grecaptcha
          grecaptcha.render('recaptcha', {
            sitekey: oConfig.sitekey,
            callback: function () {
              console.log('Llamando a callback')
              // debo quitar la clase
              if (!formError) return false
              formError.ocultar(formError.ERR_TYPE_RECAPTCHA)
            }
          })
        } */
        next()
        // $.getScript('https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit')
      }
    })
  })

  $('#id_DNI').on('click', function () {
    tipoDoc = 'DNI'
    var secDni = document.getElementById('id_DNI')
    var lblDni = document.getElementById('id_lbl_DNI')
    var secCe = document.getElementById('id_CE')
    var lblCe = document.getElementById('id_lbl_CE')

    lblDni.classList.remove('font_opc_2')
    lblDni.classList.add('font_opc_1')

    lblCe.classList.remove('font_opc_1')
    lblCe.classList.add('font_opc_2')

    secDni.classList.remove('brd_opc_2')
    secDni.classList.add('brd_opc_1')

    secCe.classList.remove('brd_opc_1')
    secCe.classList.add('brd_opc_2')

    $('#dni').attr('maxlength', 8)
    document.getElementById('dni').value = ''
    document.getElementById('efectuar_login').style.background = '#D9D9D9'
  })

  $('#id_CE').on('click', function () {
    tipoDoc = 'CE'
    var secDni = document.getElementById('id_DNI')
    var lblDni = document.getElementById('id_lbl_DNI')
    var secCe = document.getElementById('id_CE')
    var lblCe = document.getElementById('id_lbl_CE')

    lblDni.classList.remove('font_opc_1')
    lblDni.classList.add('font_opc_2')

    lblCe.classList.remove('font_opc_2')
    lblCe.classList.add('font_opc_1')

    secCe.classList.remove('brd_opc_2')
    secCe.classList.add('brd_opc_1')

    secDni.classList.remove('brd_opc_1')
    secDni.classList.add('brd_opc_2')

    $('#dni').attr('maxlength', 8)
    document.getElementById('dni').value = ''
    document.getElementById('efectuar_login').style.background = '#D9D9D9'
  })

  $('#dni').keyup(function (event) {
    // var code = event.key || event.which
    const charCode = (event.which) ? event.which : event.keyCode

    if ((charCode >= 48 && charCode <= 57) || (charCode >= 96 && charCode <= 105) || charCode === 8 || charCode === 13) {
      if (tipoDoc === 'DNI') {
        if (event.target.value.length === 8) {
          document.getElementById('efectuar_login').style.background = '#523178'
          document.getElementById('efectuar_login').disabled = false
        } else if (event.target.value.length < 8) {
          document.getElementById('efectuar_login').style.background = '#D9D9D9'
          document.getElementById('efectuar_login').disabled = true
        }
      } else if (tipoDoc === 'CE') {
        if (event.target.value.length === 8) {
          document.getElementById('efectuar_login').style.background = '#523178'
          document.getElementById('efectuar_login').disabled = false
        } else if (event.target.value.length < 8) {
          document.getElementById('efectuar_login').style.background = '#D9D9D9'
          document.getElementById('efectuar_login').disabled = true
        }
      }

      return true
    } else if (charCode === 229 || charCode === 46 || charCode === 110 || charCode === 190) {
      return false
    } else {
      return false
    }
  })
})(window)
