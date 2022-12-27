import { NextRestFramework } from '../src';
import { RequestMethod } from 'node-mocks-http';
import { getDefaultConfig, getHTMLForSwaggerUI } from '../src/utils';
import { DEFAULT_ERRORS, ValidMethod, VERSION } from '../src/constants';
import { NextRestFrameworkConfig } from '../src/types';
import merge from 'lodash.merge';
import chalk from 'chalk';
import { createNextRestFrameworkMocks, resetCustomGlobals } from './utils';
import { z } from 'zod';
import * as yup from 'yup';

jest.mock('fs', () => ({
  readdirSync: () => [],
  readFileSync: () => ''
}));

beforeEach(() => {
  resetCustomGlobals();
});

it('uses the default config by default', () => {
  const { config } = NextRestFramework();
  expect(JSON.stringify(config)).toEqual(JSON.stringify(getDefaultConfig()));
});

it('sets the global config', () => {
  const customConfig: NextRestFrameworkConfig = {
    openApiSpec: {
      info: {
        title: 'Some Title',
        version: '1.2.3'
      },
      paths: {}
    },
    openApiJsonPath: '/foo/bar',
    openApiYamlPath: '/bar/baz',
    swaggerUiPath: '/baz/qux',
    exposeOpenApiSpec: false,
    errorHandler: () => {}
  };

  const { config } = NextRestFramework(customConfig);

  expect(JSON.stringify(config)).toEqual(
    JSON.stringify(merge(getDefaultConfig(), customConfig))
  );
});

it('logs init, reserved paths and config changed info', async () => {
  console.info = jest.fn();

  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET',
    path: '/api/openapi.yaml',
    headers: {
      'x-forwarded-proto': 'http',
      host: 'localhost:3000'
    }
  });

  await NextRestFramework().defineCatchAllHandler()(req, res);

  expect(console.info).toHaveBeenNthCalledWith(
    1,
    chalk.green('Next REST Framework initialized! 🚀')
  );

  expect(console.info).toHaveBeenNthCalledWith(
    2,
    chalk.yellowBright(`Swagger UI: http://localhost:3000/api
OpenAPI JSON: http://localhost:3000/api/openapi.json
OpenAPI YAML: http://localhost:3000/api/openapi.yaml`)
  );

  await NextRestFramework({
    swaggerUiPath: '/api/foo/bar',
    openApiJsonPath: '/api/bar/baz',
    openApiYamlPath: '/api/baz/qux'
  }).defineCatchAllHandler()(req, res);

  expect(console.info).toHaveBeenNthCalledWith(
    3,
    chalk.green('Next REST Framework config changed, re-initializing!')
  );

  expect(console.info).toHaveBeenNthCalledWith(
    4,
    chalk.yellowBright(`Swagger UI: http://localhost:3000/api/foo/bar
OpenAPI JSON: http://localhost:3000/api/bar/baz
OpenAPI YAML: http://localhost:3000/api/baz/qux`)
  );

  await NextRestFramework({
    exposeOpenApiSpec: false
  }).defineCatchAllHandler()(req, res);

  expect(console.info).toHaveBeenNthCalledWith(
    5,
    chalk.green('Next REST Framework config changed, re-initializing!')
  );

  expect(console.info).toHaveBeenNthCalledWith(
    6,
    chalk.yellowBright(
      `OpenAPI spec is not exposed. To expose it, set ${chalk.bold(
        'exposeOpenApiSpec'
      )} to ${chalk.bold('true')} in the Next REST Framework config.`
    )
  );
});

it('returns OpenAPI YAML spec', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET',
    path: '/api/openapi.yaml'
  });

  await NextRestFramework().defineCatchAllHandler()(req, res);

  const yaml = `openapi: 3.0.1
info:
  title: Next REST Framework
  description: This is an autogenerated OpenAPI spec by Next REST Framework.
  version: ${VERSION}
components: {}
paths: {}
`;

  expect(res._getData()).toEqual(yaml);
});

it('returns OpenAPI JSON spec', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET',
    path: '/api/openapi.json'
  });

  await NextRestFramework().defineCatchAllHandler()(req, res);

  const json = {
    openapi: '3.0.1',
    info: {
      title: 'Next REST Framework',
      description:
        'This is an autogenerated OpenAPI spec by Next REST Framework.',
      version: VERSION
    },
    components: {},
    paths: {}
  };

  expect(res._getJSONData()).toEqual(json);
});

it('returns Swagger UI', async () => {
  const headers = {
    'x-forwarded-proto': 'http',
    host: 'localhost:3000'
  };

  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET',
    path: '/api',
    headers
  });

  await NextRestFramework().defineCatchAllHandler()(req, res);
  const html = getHTMLForSwaggerUI({ headers });
  expect(res._getData()).toEqual(html);
});

it.each(Object.values(ValidMethod))(
  'works with HTTP method: %p',
  async (method) => {
    const { req, res } = createNextRestFrameworkMocks({
      method
    });

    const output = [
      {
        status: 200,
        contentType: 'application/json',
        schema: z.array(z.string())
      }
    ];

    const data = ['All good!'];

    await NextRestFramework().defineEndpoints({
      [ValidMethod.GET]: {
        output,
        handler: ({ res }) => {
          res.status(200).json(data);
        }
      },
      [ValidMethod.PUT]: {
        output,
        handler: ({ res }) => {
          res.status(200).json(data);
        }
      },
      [ValidMethod.POST]: {
        output,
        handler: ({ res }) => {
          res.status(200).json(data);
        }
      },
      [ValidMethod.DELETE]: {
        output,
        handler: ({ res }) => {
          res.status(200).json(data);
        }
      },
      [ValidMethod.OPTIONS]: {
        output,
        handler: ({ res }) => {
          res.status(200).json(data);
        }
      },
      [ValidMethod.HEAD]: {
        output,
        handler: ({ res }) => {
          res.status(200).json(data);
        }
      },
      [ValidMethod.PATCH]: {
        output,
        handler: ({ res }) => {
          res.status(200).json(data);
        }
      },
      [ValidMethod.TRACE]: {
        output,
        handler: ({ res }) => {
          res.status(200).json(data);
        }
      }
    })(req, res);

    expect(res._getJSONData()).toEqual(data);
  }
);

it('returns error for valid methods with no handlers', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'POST'
  });

  await NextRestFramework().defineEndpoints({
    [ValidMethod.GET]: {
      output: [],
      handler: () => {}
    }
  })(req, res);

  expect(res._getStatusCode()).toEqual(405);
  expect(res._getHeaders().allow).toEqual('GET');

  expect(JSON.parse(res._getData())).toEqual({
    message: DEFAULT_ERRORS.methodNotAllowed
  });
});

it('works with a valid catch-all-handler', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'POST'
  });

  await NextRestFramework().defineCatchAllHandler({
    [ValidMethod.POST]: {
      output: [],
      handler: ({ res }) => {
        res.status(200).json({ message: 'All good!' });
      }
    }
  })(req, res);

  expect(res._getStatusCode()).toEqual(200);

  expect(JSON.parse(res._getData())).toEqual({
    message: 'All good!'
  });
});

it('returns 404 for missing catch-all-handlers', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET'
  });

  await NextRestFramework().defineCatchAllHandler({
    [ValidMethod.POST]: {
      output: [],
      handler: () => {}
    }
  })(req, res);

  expect(res._getStatusCode()).toEqual(404);

  expect(JSON.parse(res._getData())).toEqual({
    message: DEFAULT_ERRORS.notFound
  });
});

it('returns error for invalid methods', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'FOO' as RequestMethod
  });

  await NextRestFramework().defineEndpoints({
    [ValidMethod.GET]: {
      output: [],
      handler: () => {}
    }
  })(req, res);

  expect(res._getStatusCode()).toEqual(405);
  expect(res._getHeaders().allow).toEqual('GET');

  expect(JSON.parse(res._getData())).toEqual({
    message: DEFAULT_ERRORS.methodNotAllowed
  });
});

it.each([
  {
    name: 'Zod',
    schema: z.object({
      foo: z.number()
    }),
    message: ['Expected number, received string']
  },
  {
    name: 'Yup',
    schema: yup.object({
      foo: yup.number()
    }),
    message: [
      'foo must be a `number` type, but the final value was: `NaN` (cast from the value `"bar"`).'
    ]
  }
])(
  'returns error for invalid request body: $name',
  async ({ schema, message }) => {
    const { req, res } = createNextRestFrameworkMocks({
      method: 'POST',
      body: {
        foo: 'bar'
      },
      headers: {
        'content-type': 'application/json'
      }
    });

    await NextRestFramework().defineEndpoints({
      [ValidMethod.POST]: {
        input: {
          contentType: 'application/json',
          schema
        },
        output: [],
        handler: () => {}
      }
    })(req, res);

    expect(res._getStatusCode()).toEqual(400);

    expect(res._getJSONData()).toEqual({
      message
    });
  }
);

it('returns error for invalid content-type', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'POST',
    body: {
      foo: 'bar'
    },
    headers: {
      'content-type': 'application/xml'
    }
  });

  await NextRestFramework().defineEndpoints({
    [ValidMethod.POST]: {
      input: {
        contentType: 'application/json',
        schema: z.string()
      },
      output: [],
      handler: () => {}
    }
  })(req, res);

  expect(res._getStatusCode()).toEqual(415);

  expect(res._getJSONData()).toEqual({
    message: DEFAULT_ERRORS.invalidMediaType
  });
});

it('works with middlewares', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET'
  });

  await NextRestFramework({
    middleware: () => ({
      foo: 'foo'
    })
  }).defineEndpoints({
    middleware: ({ params: { foo } }) => ({ bar: 'bar', foo }),
    GET: {
      output: [
        {
          status: 200,
          contentType: 'application/json',
          schema: z.object({
            foo: z.string(),
            bar: z.string(),
            baz: z.string()
          })
        }
      ],
      middleware: ({ params: { foo, bar } }) => ({ foo, bar, baz: 'baz' }),
      handler: ({ res, params: { foo, bar, baz } }) => {
        res.status(200).json({ foo, bar, baz });
      }
    }
  })(req, res);

  expect(res._getStatusCode()).toEqual(200);

  expect(res._getJSONData()).toEqual({
    foo: 'foo',
    bar: 'bar',
    baz: 'baz'
  });
});

it('returns a default error response', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET'
  });

  console.error = jest.fn();

  await NextRestFramework().defineEndpoints({
    GET: {
      output: [],
      handler: () => {
        throw Error('Something went wrong');
      }
    }
  })(req, res);

  expect(res._getJSONData()).toEqual({
    message: DEFAULT_ERRORS.unexpectedError
  });
});

it('works with global error handler', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET'
  });

  console.log = jest.fn();

  await NextRestFramework({
    errorHandler: () => {
      console.log('foo');
    }
  }).defineEndpoints({
    GET: {
      output: [],
      handler: () => {
        throw Error('Something went wrong');
      }
    }
  })(req, res);

  expect(console.log).toBeCalledWith('foo');
});

it('works with route-specific error handler', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET'
  });

  console.log = jest.fn();

  await NextRestFramework().defineEndpoints({
    errorHandler: () => {
      console.log('bar');
    },
    GET: {
      output: [],
      handler: () => {
        throw Error('Something went wrong');
      }
    }
  })(req, res);

  expect(console.log).toBeCalledWith('bar');
});

it('works with method-specific error handler', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET'
  });

  console.log = jest.fn();

  await NextRestFramework().defineEndpoints({
    GET: {
      output: [],
      handler: () => {
        throw Error('Something went wrong');
      },
      errorHandler: () => {
        console.log('baz');
      }
    }
  })(req, res);

  expect(console.log).toBeCalledWith('baz');
});

it('suppresses errors in production mode by default', async () => {
  const { req, res } = createNextRestFrameworkMocks({
    method: 'GET'
  });

  console.error = jest.fn();
  process.env = { ...process.env, NODE_ENV: 'production' };

  await NextRestFramework().defineEndpoints({
    GET: {
      output: [],
      handler: () => {
        throw Error('Something went wrong');
      }
    }
  })(req, res);

  expect(console.error).toBeCalledWith(
    chalk.red(
      'Next REST Framework encountered an error - suppressed in production mode.'
    )
  );
});
