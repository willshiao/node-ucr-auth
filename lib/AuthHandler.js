'use strict'

const cheerio = require('cheerio')
const tough = require('tough-cookie')
const rp = require('request-promise')
const debug = require('debug')('ucr:auth')

class AuthHandler {
  constructor ({ auth, request }) {
    this.auth = Object.assign({}, auth)
    this.rp = rp.defaults({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
      },
      ...request
    })
    this.storedJar = null // Cached cookie jar
  }
  /**
   * Fetches a new cookie jar for the user or returns a cached one.
   * @param  {Boolean} refresh    Whether or not to refresh the cached cookie jar.
   * @return {rp.jar}             The request-promise cookie jar.
   */
  async getJar (refresh = false) {
    if (this.auth.type === 'cookie') {
      if (!this.auth.cookies) {
        throw new RangeError('auth.cookies missing: required for cookie authentication method.')
      }
      const jar = rp.jar()
      this.auth.cookies.forEach((c) => {
        jar.setCookie(new tough.Cookie(c), this.auth.cookieDomain)
      })
      return jar
    }
    if (this.auth.type === 'credentials' && (refresh || !this.storedJar)) {
      let jar = await this.login(this.auth.credentials)
      this.storedJar = jar
      debug('Setting local jar to:', this.storedJar)
      return jar
    }
    if (!refresh) return this.storedJar

    throw new TypeError('Invalid authentication type')
  }

  setJar (jar) {
    this.storedJar = jar
  }

  /**
   * Logs in as the user and returns the cookie jar.
   * @param  {String} options.username Login username
   * @param  {String} options.password Login password
   * @param  {Object} extraSettings    Extra settings to be passed to the request module.
   * @return {rp.jar}                  Request cookie jar.
   */
  async login ({ username, password }, extraSettings = {}) {
    if (!username || !password) {
      throw new RangeError('username or password missing: required for credentials authentication method')
    }
    const jar = rp.jar()

    const loginHtml = await this.rp({
      uri: 'https://auth.ucr.edu/cas/login?service=https://portal.ucr.edu/uPortal/Login',
      jar,
      ...extraSettings
    })
    const $ = cheerio.load(loginHtml)

    const formData = {
      lt: $('input[name="lt"]').val(),
      execution: $('input[name="execution"]').val()
    }

    try {
      await this.rp({
        uri: 'https://auth.ucr.edu/cas/login?service=https://portal.ucr.edu/uPortal/Login',
        method: 'POST',
        jar,
        headers: {
          Referer: 'https://auth.ucr.edu/cas/login?service=https://portal.ucr.edu/uPortal/Login'
        },
        form: {
          ...formData,
          username,
          password,
          _eventId: 'submit',
          'submit.x': 0,
          'submit.y': 0,
          submit: 'LOGIN'
        },
        ...extraSettings
      })

      return jar
    } catch (e) {
      if (e.name === 'StatusCodeError') return jar
      return jar
    }
  }

  /**
   * Fetches cookies for the course registration system.
   * @param  {rp.jar} jar   Cookie jar containing valid cookies for login.
   * @return {rp.jar}       Cookie jar with additional cookies for the registration system
*                               Note: the original jar will be modified.
   */
  async fetchRegistrationCookies (jar) {
    await this.rp({
      uri: 'https://registrationssb.ucr.edu/StudentRegistrationSsb/',
      headers: {
        Referer: 'https://portal.ucr.edu/uPortal/f/home-student/normal/render.uP'
      },
      jar
    })
    return jar
  }

  /**
   * Use request-promise to make a request with the existing jar.
   * @param  {Object} extraOptions   Extra options to be passed to request-promise.
   * @return {Response}              The request's response.
   */
  async makeRequest (extraOptions) {
    return this.rp({
      jar: this.storedJar,
      ...extraOptions
    })
  }
}

module.exports = AuthHandler
