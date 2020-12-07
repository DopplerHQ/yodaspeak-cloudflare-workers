/*--- RESOURCES ---*/
class Router {
  constructor() {
    this.routes = []
  }

  addRoute(path, method, handler) {
    this.routes.push({
      path: path,
      method: method,
      handler: handler,
    })
  }

  get(path, handler) {
    this.addRoute(path, 'GET', handler)
  }

  post(path, handler) {
    this.addRoute(path, 'POST', handler)
  }

  async route(req) {
    const route = this.routes.find(r => {
      if (req.method === r.method && new URL(req.url).pathname == r.path) {
        return r
      }
    })
    if (route) {
      return route.handler(req)
    }

    return new Response('Resource not found', {
      status: 404,
      statusText: 'not found',
      headers: {
        'content-type': 'text/plain',
      },
    })
  }
}

const JSONResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data, {}, 2), {
    status: status,
    headers: { 'content-type': 'application/json;charset=UTF-8' },
  })
}

/*--- TRANSLATE API ---*/

const fetchTranslation = async text => {
  const PREDEFINED_TRANSLATIONS = {
    'Secrets must not be stored in git repositories':
      'Stored in git repositories, secrets must not be',
    'master obi-wan has learnt the power of secrets management':
      'Learnt the power of secrets management, master obi-wan has',
  }

  if (PREDEFINED_TRANSLATIONS[text]) {
    return JSONResponse({
      text: text,
      translation: PREDEFINED_TRANSLATIONS[text],
    })
  }

  try {
    const resp = await fetch(YODA_TRANSLATE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-Funtranslations-Api-Secret': YODA_TRANSLATE_API_KEY,
      },
      body: `text=${text}`,
    })
    const data = await resp.json()
    return JSONResponse({
      text: text,
      translation: data.contents.translated,
    })
  } catch (error) {
    console.log(`[error]: translation failed: ${error}`)
    return JSONResponse(
      {
        text: text,
        error: 'Sorry, am I, as translate your message, I cannot.',
      },
      500,
    )
  }
}

/*--- ROUTING ---*/

const router = new Router()
router.get('/', req => new Response('Yoda Speak Cloudflare Worker'))
router.get('/healthz', req => new Response('healthy, this worker is'))
router.post('/translate', async req => {
  const formData = await req.formData()
  const text = formData.get('text').trim()
  return fetchTranslation(text)
})

addEventListener('fetch', event => {
  return event.respondWith(main(event))
})

const main = async event => {
  return await router.route(event.request)
}
