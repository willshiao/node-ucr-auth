const config = require('config')
const AuthHandler = require('../../lib/AuthHandler')

const ah = new AuthHandler({ auth: config.get('auth') })

main()

async function main () {
  const jar = await ah.getJar()
  const res = await ah.makeRequest({
    uri: 'https://ilearn.ucr.edu/webapps/bb-auth-provider-cas-bb_bb60/execute/casLogin?cmd=login&authProviderId=_102_1&redirectUrl=https%3A%2F%2Filearn.ucr.edu%2F'
  })
  console.log(res)
}
