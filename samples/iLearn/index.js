const config = require('config')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const cheerio = require('cheerio')
const AuthHandler = require('../../lib/AuthHandler')

async function main () {
  const ah = new AuthHandler({
    auth: config.get('auth'),
    request: config.get('request')
  })

  const jar = await ah.getJar()
  await ah.makeRequest({
    uri: 'https://ilearn.ucr.edu/webapps/bb-auth-provider-cas-bb_bb60/execute/casLogin?cmd=login&authProviderId=_102_1&redirectUrl=https%3A%2F%2Filearn.ucr.edu%2F'
  })
  console.log('Logged into iLearn successfully.')
  console.log('Storing jar...')
  await fs.writeFileAsync('jar.json', JSON.stringify(jar))
  // Use this for future testing, once the jar has been stored:
  // console.log('Loading jar...')
  // const jar = rp.jar()
  // const jar2 = JSON.parse(await fs.readFileAsync('jar.json'))
  // console.log(jar2)
  // jar2._jar.cookies.forEach(c => {
  //   if (c.domain.includes('ilearn.ucr.edu')) jar.setCookie(new tough.Cookie(c), 'https://ilearn.ucr.edu')
  // })
  // ah.setJar(jar)
  // console.log('parsed jar: ', jar)

  await getCourses(ah)
}

async function getCourses (ah) {
  const res = await ah.makeRequest({
    method: 'POST',
    uri: 'https://ilearn.ucr.edu/webapps/portal/execute/tabs/tabAction',
    form: {
      action: 'refreshAjaxModule',
      modId: '_4_1',
      tabId: '_1_1',
      tab_tab_group_id: '_1_1'
    }
  })
  const $ = cheerio.load(res)
  $('a').toArray()
    .filter(item => $(item).attr('href').includes('Course'))
    .forEach(item => {
      const $item = $(item)
      console.log('Parent:', !!$item.parent())
      console.log('Found course: ', $item.text(), '->', $item.attr('href'))
    })
}

main()
