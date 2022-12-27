import chalk from 'chalk';
import { NextRestFrameworkConfig } from '../types';
import http from 'http';
import isEqualWith from 'lodash.isequalwith';

export const logNextRestFrameworkError = ({ error }: { error: unknown }) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(
      chalk.red(`Next REST Framework encountered an error:
${error}`)
    );
  } else {
    console.error(
      chalk.red(
        'Next REST Framework encountered an error - suppressed in production mode.'
      )
    );
  }
};

export const logInitInfo = ({
  config
}: {
  config: NextRestFrameworkConfig;
}) => {
  const configsEqual = isEqualWith(
    global.nextRestFrameworkConfig,
    config,
    (val1, val2) => {
      if (typeof val1 === 'function' && typeof val2 === 'function') {
        return val1.toString() === val2.toString();
      }
    }
  );

  if (!global.nextRestFrameworkConfig) {
    global.nextRestFrameworkConfig = config;
    console.info(chalk.green('Next REST Framework initialized! 🚀'));
  } else if (!configsEqual) {
    console.info(
      chalk.green('Next REST Framework config changed, re-initializing!')
    );

    global.nextRestFrameworkConfig = config;
    global.reservedPathsLogged = false;
  }
};

export const logReservedPaths = ({
  config,
  headers
}: {
  config: NextRestFrameworkConfig;
  headers: http.IncomingHttpHeaders;
}) => {
  const proto = headers['x-forwarded-proto'] ?? 'http';
  const host = headers.host;
  const baseUrl = `${proto}://${host}`;

  if (config.exposeOpenApiSpec) {
    console.info(
      chalk.yellowBright(`Swagger UI: ${baseUrl}${config.swaggerUiPath}
OpenAPI JSON: ${baseUrl}${config.openApiJsonPath}
OpenAPI YAML: ${baseUrl}${config.openApiYamlPath}`)
    );
  } else {
    console.info(
      chalk.yellowBright(
        `OpenAPI spec is not exposed. To expose it, set ${chalk.bold(
          'exposeOpenApiSpec'
        )} to ${chalk.bold('true')} in the Next REST Framework config.`
      )
    );
  }

  global.reservedPathsLogged = true;
};

export const warnAboutReservedPath = ({
  path,
  name,
  configName
}: {
  path?: string;
  name: string;
  configName: 'openApiJsonPath' | 'openApiYamlPath' | 'swaggerUiPath';
}) => {
  console.warn(
    chalk.yellowBright(
      `Warning: ${chalk.bold(
        path
      )} is reserved for ${name}. Update ${chalk.bold(
        configName
      )} in your Next REST Framework config to use this path for other purposes.`
    )
  );

  switch (configName) {
    case 'openApiJsonPath': {
      global.reservedOpenApiJsonPathWarningLogged = true;
      break;
    }
    case 'openApiYamlPath': {
      global.reservedOpenApiYamlPathWarningLogged = true;
      break;
    }
    case 'swaggerUiPath': {
      global.reservedSwaggerUiPathWarningLogged = true;
      break;
    }
  }
};

export const handleReservedPathWarnings = ({
  url,
  config: { openApiJsonPath, openApiYamlPath, swaggerUiPath }
}: {
  url?: string;
  config: NextRestFrameworkConfig;
}) => {
  if (url === openApiJsonPath && !global.reservedOpenApiJsonPathWarningLogged) {
    warnAboutReservedPath({
      path: openApiJsonPath,
      name: 'OpenAPI JSON spec',
      configName: 'openApiJsonPath'
    });
  }

  if (url === openApiYamlPath && !global.reservedOpenApiYamlPathWarningLogged) {
    warnAboutReservedPath({
      path: openApiYamlPath,
      name: 'OpenAPI YAML spec',
      configName: 'openApiYamlPath'
    });
  }

  if (url === swaggerUiPath && !global.reservedSwaggerUiPathWarningLogged) {
    warnAboutReservedPath({
      path: swaggerUiPath,
      name: 'Swagger UI',
      configName: 'swaggerUiPath'
    });
  }
};
